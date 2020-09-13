const AWS = require('aws-sdk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo');
const axios = require("axios");

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});
const sqs = new AWS.SQS({
  region: 'ap-northeast-1',
});

const envName = process.env.ENV_NAME;
const queueTableName = `neo-cycle-${envName}-QUEUE`;
const dailyScheduleTableName = `neo-cycle-${envName}-DAILY_SCHEDULE`;
const dailyScheduleQueueUrl = process.env.DAILY_SCHEDULE_QUEUE_URL;
const initialVisibilityTimeout = process.env.INITIAL_VISIBILITY_TIMEOUT;

let visibilityTimeout = Number(initialVisibilityTimeout);

const url = "https://aaetl7k2qb.execute-api.ap-northeast-1.amazonaws.com/dev";

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  // console.log(JSON.stringify(event));
  visibilityTimeout = Number(initialVisibilityTimeout);
  
  try {
    for (const message of event.Records) {
      // schedule取得(ConsistentRead=true)
      const dailySchedule = await getDailySchedule(message.messageAttributes);
      console.log(`target dailySchedule: ${JSON.stringify(dailySchedule)}`)
      // 時刻チェック&終了日時を超えていたらステータスをCOMPLETEDに
      await checkDatetimeRangeAndUpdateStatusIfCompleted(dailySchedule);
      // statusで場合分け
      await handleStatus(dailySchedule, message.receiptHandle);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getDailySchedule(messageAttributes) {
  const params = {
    TableName: dailyScheduleTableName,
    Key: {
      memberId_scheduleId: messageAttributes.memberId_scheduleId.stringValue,
      startDate_version: `${messageAttributes.startDate.stringValue}:${messageAttributes.version.stringValue}`,
    },
    ConsistentRead: true,
  };
  try {
    return (await docClient.get(params).promise()).Item;
    
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function checkDatetimeRangeAndUpdateStatusIfCompleted(dailySchedule) {
  const current = getCurrentMomentDatetime();
  const startDatetime = convertDatetimeToMoment(`${dailySchedule.startDate} ${dailySchedule.startTime}`);
  const endDatetime = convertDatetimeToMoment(`${dailySchedule.endDate} ${dailySchedule.endTime}`);
  if (current.isBefore(startDatetime)) {
    // スケジュール開始前にキューを受け取ってしまったのでthrowしてキューに戻す(通常起こりえない)
    console.log("received message before schedule starts.");
    throw new Error("received message before schedule starts.");
  }
  if (current.isAfter(endDatetime)) {
    // スケジュールが完了しているのでステータスを更新
    console.log("this schedule expired.");
    await updateStatus(dailySchedule, "COMPLETED");
  }
}

async function updateStatus(dailySchedule, status) {
  const params = {
    TableName: dailyScheduleTableName,
    Key: {//更新したい項目をプライマリキー(及びソートキー)によって１つ指定
      memberId_scheduleId: dailySchedule.memberId_scheduleId,
      startDate_version: dailySchedule.startDate_version,
    },
    ExpressionAttributeNames: {
        '#status': 'status',
    },
    ExpressionAttributeValues: {
        ':status': status,
    },
    UpdateExpression: 'SET #status = :status',
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function updateStatusAndLatestReservation(dailySchedule, status, latestReservation) {
  const params = {
    TableName: dailyScheduleTableName,
    Key: {//更新したい項目をプライマリキー(及びソートキー)によって１つ指定
      memberId_scheduleId: dailySchedule.memberId_scheduleId,
      startDate_version: dailySchedule.startDate_version,
    },
    ExpressionAttributeNames: {
        '#status': 'status',
        '#latestReservation': 'latestReservation',
    },
    ExpressionAttributeValues: {
        ':status': status,
        ':latestReservation': latestReservation,
    },
    UpdateExpression: 'SET #status = :status, #latestReservation = :latestReservation',
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}
async function handleStatus(dailySchedule, receiptHandle) {
  try {
    switch (dailySchedule.status) {
      case 'QUEUED':
      case 'PROCESSING':
        return await reserveBikeIfNeeded(dailySchedule, receiptHandle);
      case 'EXPIRATION_WAITING':
        return await reserveBikeIfExpired(dailySchedule, receiptHandle);
      case 'QUEUE_DELETION_NEEDED':
      case 'COMPLETED':
        // エラーをthrowせずに正常終了→自動的にMessageがDeleteされる
        return {result: {}, error: undefined};
      default:
        console.log(`invalid status`);
    }
  }
  catch (error) {
    console.log(error);
    throw error;
  }
  
}

async function isMessageDuplicated(messageId) {
  const params = {
    TableName: queueTableName,
    Item: {
      messageId: messageId,
    },
    ExpressionAttributeNames: {
      '#messageId': 'messageId'
    },
    ConditionExpression: 'attribute_not_exists(#messageId)'
  };
  try {
    await docClient.put(params).promise();
    return false;
  }
  catch (error) {
    console.log(error);
    return true;
  }
}

async function reserveBikeIfNeeded(dailySchedule, receiptHandle) {
  console.log("start reserve bike if needed");
  const memberId = dailySchedule.memberId_scheduleId.split(":")[0];
  // 予約ステータスチェック
  const statusResponse = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, checkStatus, memberId);
  console.log(`current status: ${statusResponse.status}`);
  // 未予約の場合
  if (statusResponse.status === "WAITING_FOR_RESERVATION") {
    if (!dailySchedule.latestReservation) {
      console.log(`latest reservation is not registered in database`);
      // 最終予約情報がundefinedの場合、新規予約する
      await reserveBike(receiptHandle, memberId, dailySchedule);
    } else {
      console.log("latest reservation is no longer valid now.");
      // 最終予約情報が存在する（前に借りたが20分経ってキャンセルになった）場合、再度借り直すかチェック
      if (dailySchedule.retryForExpiredReservationCondition === "NONE") {
        console.log("we were able to find more charged bike until initial reservation exipred.")
        // 借り直さない場合、ステータスをCOMPLETEDに
        // （電池残量による借り換えのみONにしていたが、借り換えられる自転車が見つかる前に初回予約がキャンセルになった場合に発生する）
        await updateStatus(dailySchedule, "COMPLETED");
      } else {
        // 借り直す場合
        console.log("start retry make reservation");
        await reserveBike(receiptHandle, memberId, dailySchedule)
      }
    }
  } else {
    // 予約中の場合
    // 最終予約情報に一致しない場合のみ記録する（他のジョブが予約した、手動で予約したなど）
    if (!dailySchedule.latestReservation || dailySchedule.latestReservation.cycleName !== statusResponse.detail.cycleName) {
      // 最終予約情報更新
      console.log("latest reservation in database must be updated.");
      await updateStatusAndLatestReservation(dailySchedule, dailySchedule.status, statusResponse.detail);
    }
    // TODO: 予約ポート候補にない自転車がレンタルされている場合は借り直さないようにしたい
    // 充電のあるものを借り直すかチェック、ONの場合は借り直す
    if (dailySchedule.changeToMoreChargedBikeCondition !== "NONE") {
      await cancelCurrentReservationAndReserveMoreChargedBike(
        receiptHandle,
        memberId,
        dailySchedule
      );
    }
    // 借り直さない場合は何もしない（キャンセル時の借り直しのみがONの場合など）
    
    // // 最終ステータスチェック
    // const eventualStatusResponse = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, checkStatus, memberId);
    // // スケジュールの最終予約情報/ステータス更新
    // await updateStatus(dailySchedule, eventualStatusResponse);
    // 残量借り換え: OFFなら、可視性タイムアウト秒数を1200秒に
    if (dailySchedule.changeToMoreChargedBikeCondition === "NONE") {
      console.log("reservation succeeded and charged bike change setting is disable, so process is made restart 1200 sec.")
      await extendVisibilityTimeout(receiptHandle, dailySchedule, 1200);
    }
  }
}

async function checkStatus(memberId) {
  return (await axios.post(url + '/status', { memberId: memberId, sessionId: null, aplVersion: "20073101" })).data;
}

async function reserveBike(receiptHandle, memberId, dailySchedule) {
  const parkingWithAvailableBikeList =
    await invokeMethodWithExtendVisibilityTimeout(
      receiptHandle, 
      getParkingAndAvailableBikeList,
      memberId,
      dailySchedule.parkingList.map((parking) => parking.parkingId)
    );
  console.log(`parking and available bike: ${JSON.stringify(parkingWithAvailableBikeList)}`);
  for (const parking of dailySchedule.parkingList) {
    const targetParking = parkingWithAvailableBikeList.filter(el => el.parkingId === parking.parkingId)[0];
    const bikeList = targetParking ? targetParking.availableBikeList : [];
    console.log(`parkingId ${parkingId}, avaliableBikeList: ${JSON.stringify(bikeList)}`);
    for (let i = 3; i >= dailySchedule.batteryLevelLowerLimit; i--) {
      const filteredBikeList = bikeList.filter((bike) => {
        return bike.batteryLevel === i;
      });
      for (const bike of filteredBikeList) {
        const res2 = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, makeReservation, memberId, bike.cycleName);
        if (res2.cycleName === bike.cycleName) {
          const resStatus = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, checkStatus, memberId);
          console.log(`reserved bike successfully: ${JSON.stringify(resStatus.detail)}`);
          // status更新
          console.log(`change to more charged bike: ${dailySchedule.changeToMoreChargedBikeCondition}, retry for expiration reservation: ${dailySchedule.retryForExpiredReservationCondition}`);
          if (dailySchedule.changeToMoreChargedBikeCondition === "NONE" && dailySchedule.retryForExpiredReservationCondition === "NONE") {
            await updateStatus(dailySchedule, "COMPLETED");
          } else if (dailySchedule.changeToMoreChargedBikeCondition === "NONE" && dailySchedule.retryForExpiredReservationCondition !== "NONE") {
            await updateStatusAndLatestReservation(dailySchedule, "EXPIRATION_WAITING", resStatus.detail);
            throw "expiration waiting";
          } else {
            await updateStatusAndLatestReservation(dailySchedule, "PROCESSING", resStatus.detail);
            throw "continue processing";
          }
          return;
        }
      }
    }
  }
}

async function cancelCurrentReservationAndReserveMoreChargedBike(receiptHandle, memberId, dailySchedule) {
  const parkingWithAvailableBikeList =
    await invokeMethodWithExtendVisibilityTimeout(
      receiptHandle, 
      getParkingAndAvailableBikeList,
      memberId,
      dailySchedule.parkingList.map((parking) => parking.parkingId)
    );
  console.log(`parking and available bike: ${JSON.stringify(parkingWithAvailableBikeList)}`);
  // 再予約条件を満たすポートのIDだけを抽出
  let targetParkingIdList;
  if (dailySchedule.changeToMoreChargedBikeCondition === "ANY") {
    targetParkingIdList = dailySchedule.parkingList.map(parking => parking.parkingId);
  } else if (dailySchedule.changeToMoreChargedBikeCondition === "SAME_ONLY") {
    targetParkingIdList = [ dailySchedule.parkingList[dailySchedule.parkingList.length - 1].parkingId ];
  } else if (dailySchedule.changeToMoreChargedBikeCondition === "HIGHER_PRIORITY_ONLY") {
    const currentParkingIdPriority = dailySchedule.parkingList.findIndex((parking) => {
      return parking.parkingId === dailySchedule.latestReservation.parkingId;
    });
    targetParkingIdList = dailySchedule.parkingList
      .map(parking => parking.parkingId)
      .filter((parkingId, index) => {
        return index <= currentParkingIdPriority;
      });
  }
  console.log(`target parking: ${JSON.stringify(targetParkingIdList)}`);
  // 予約ループ
  for (const parkingId of targetParkingIdList) {
    const targetParking = parkingWithAvailableBikeList.filter(el => el.parkingId === parkingId)[0];
    const bikeList = targetParking ? targetParking.availableBikeList : [];
    console.log(`parkingId ${parkingId}, avaliableBikeList: ${JSON.stringify(bikeList)}`);
    for (let i = 3; i > dailySchedule.latestReservation.batteryLevel; i--) {
      const filteredBikeList = bikeList.filter((bike) => {
        return bike.batteryLevel === i;
      });
      for (const bike of filteredBikeList) {
        // 現在の予約をキャンセル
        await invokeMethodWithExtendVisibilityTimeout(receiptHandle, cancelReservation, memberId);
        console.log("previous reservation is cancelled successfully.");
        const res2 = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, makeReservation, memberId, bike.cycleName);
        if (res2.cycleName === bike.cycleName) {
          const resStatus = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, checkStatus, memberId);
          console.log(`reserved new bike successfully: ${JSON.stringify(resStatus.detail)}`);
          console.log(`change to more charged bike: ${dailySchedule.changeToMoreChargedBikeCondition}, retry for expiration reservation: ${dailySchedule.retryForExpiredReservationCondition}`);
          // status更新
          if (dailySchedule.changeToMoreChargedBikeCondition === "NONE" && dailySchedule.retryForExpiredReservationCondition === "NONE") {
            await updateStatus(dailySchedule, "COMPLETED");
          } else if (dailySchedule.changeToMoreChargedBikeCondition === "NONE" && dailySchedule.retryForExpiredReservationCondition !== "NONE") {
            await updateStatusAndLatestReservation(dailySchedule, "EXPIRATION_WAITING", resStatus.detail);
            throw "expiration waiting";
          } else {
            await updateStatusAndLatestReservation(dailySchedule, "PROCESSING", resStatus.detail);
            throw "continue processing";
          }
          return;
        }
      }
    }
  }
  // 借り直しが起きなかった場合はエラーをthrow
  throw "more charged bike not found";
}

async function getParkingAndAvailableBikeList(memberId, parkingIdList) {
  return (await axios.post(url + '/parkings/id', { memberId: memberId, parkingIdList: parkingIdList, sessionId: null, aplVersion: "20073101" })).data.parkingWithAvailableBikeList;
}

async function makeReservation(memberId, cycleName) {
  return (await axios.post(url + '/reservation', { memberId: memberId, sessionId: null, cycleName: cycleName, aplVersion: "20073101" })).data;
}

async function cancelReservation(memberId) {
  await axios.post(url + '/cancellation', { memberId: memberId, sessionId: null, aplVersion: "20073101" });
}

async function reserveBikeIfExpired(dailySchedule, receiptHandle) {
  const memberId = dailySchedule.memberId_scheduleId.split(":")[0];
  // 予約ステータスチェック
  const statusResponse = await invokeMethodWithExtendVisibilityTimeout(receiptHandle, checkStatus, memberId);
  // 未予約の場合
  if (statusResponse.status === "WAITING_FOR_RESERVATION") {
    // 再度借り直す
    await reserveBike(receiptHandle, memberId, dailySchedule);
  }
}

function getCurrentMomentDatetime() {
  return moment();
}

function getCurrentUnixDatetime() {
  return moment().unix();
}

function getCurrentUnixDatetimeMilliSec() {
  return moment().valueOf();
}

function convertTimeToMoment(time) {
  return moment(time, "HH:mm:ss");
}

function convertDateToMoment(date) {
  return moment(date, "YYYY-MM-DD");
}

function convertDatetimeToMoment(datetime) {
  return moment(datetime, "YYYY-MM-DD HH:mm:ss");
}

function calcVisibilityTimeoutWithDatetime(upcomingExecutionDatetime) {
  return upcomingExecutionDatetime.unix() - getCurrentUnixDatetime();
}

async function invokeMethodWithExtendVisibilityTimeout(receiptHandle, method, ...args) {
  const before = getCurrentUnixDatetimeMilliSec();
  try {
    const result = await method(...args);
    visibilityTimeout = visibilityTimeout + calcExecutionDurationSec(before);
    const params = {
      QueueUrl: dailyScheduleQueueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: visibilityTimeout
    };
    const sqsResponse = await sqs.changeMessageVisibility(params).promise();
    console.log(`extend VisibilityTimeout: ${visibilityTimeout}`);
    return result;
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

function calcExecutionDurationSec(before) {
  return Math.ceil((getCurrentUnixDatetimeMilliSec() - before) / 1000);
}

async function putDailySchedule(messageAttributes) {
  const today = moment();
  const params = {
    TableName: dailyScheduleTableName,
    Item: {
      memberId_scheduleId: messageAttributes.memberId_scheduleId.stringValue,
      startDate_version: `${messageAttributes.startDate.stringValue}:0`,
      startDate: messageAttributes.startDate.stringValue,
      endDate: messageAttributes.endDate.stringValue,
      startTime: messageAttributes.startTime.stringValue,
      endTime: messageAttributes.endTime.stringValue,
      parkingList: JSON.parse(messageAttributes.parkingList.stringValue),
      batteryLevelLowerLimit: Number(messageAttributes.batteryLevelLowerLimit.stringValue),
      changeToMoreChargedBikeCondition: messageAttributes.changeToMoreChargedBikeCondition.stringValue,
      retryForExpiredReservationCondition: messageAttributes.retryForExpiredReservationCondition.stringValue,
      createdUnixDatetime: today.unix(),
      updatedUnixDatetime: today.unix(),
      createdHumanDatetime: today.format("YYYY-MM-DD HH:mm:ss"),
      updatedHumanDatetime: today.format("YYYY-MM-DD HH:mm:ss"),
      version: 0,
      status: "QUEUE_WAITING",
    },
  };
  try {
    await docClient.put(params).promise();
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function updateQueue(message) {
  const params = {
    TableName: queueTableName,
    Item: {
      messageId: message.messageId,
      message: message,
    },
  };
  try {
    await docClient.put(params).promise();
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function extendVisibilityTimeout(receiptHandle, dailySchedule, newTimeoutSeconds) {
  const params = {
    QueueUrl: dailyScheduleQueueUrl,
    ReceiptHandle: receiptHandle,
    VisibilityTimeout: newTimeoutSeconds,
  };
  try {
    const sqsResponse = await sqs.changeMessageVisibility(params).promise();
    console.log(sqsResponse)
    console.log(`extend VisibilityTimeout: ${visibilityTimeout}`);
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}