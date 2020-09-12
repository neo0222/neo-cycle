const AWS = require('aws-sdk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});
const sqs = new AWS.SQS({
  region: 'ap-northeast-1',
});

const envName = process.env.ENV_NAME;
const dailyScheduleTableName = `neo-cycle-${envName}-DAILY_SCHEDULE`;
const dailyScheduleQueueUrl = process.env.DAILY_SCHEDULE_QUEUE_URL;

let startDatetime;
let endDatetime;

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  const nowUnixTime = moment().unix();
  // 基準日を取得（0分から10分刻み）
  startDatetime = moment.unix(Math.ceil(nowUnixTime / 600) * 600);
  endDatetime = moment.unix(startDatetime.unix() + 599);
  
  console.log(`Queue schedule from ${startDatetime.format("YYYY-MM-DD HH:mm:ss")} to ${endDatetime.format("YYYY-MM-DD HH:mm:ss")}`);
  try {
    // 対象範囲内のschedule取得
    const scheduleList = await retrieveWaitingSchedule();
    // queue
    console.log(`dailyScheduleList.length: ${scheduleList.length}`);
    const promises = [];
    for (const schedule of scheduleList) {
      promises.push(sendMessage(schedule));
    }
    console.log((await Promise.all(promises)).map((res => {
      return res.MessageId;
    })));
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function retrieveWaitingSchedule() {
  const params = {
    TableName: dailyScheduleTableName,
    IndexName: "startDate-startTime-index",
    ExpressionAttributeNames:{
      '#startDate': 'startDate',
      '#startTime': 'startTime',
    },
    ExpressionAttributeValues:{
      ':startDate': startDatetime.format("YYYY-MM-DD"),
      ':startTimeMin': startDatetime.format("HH:mm:ss"),
      ':startTimeMax': endDatetime.format("HH:mm:ss"),
    },
    KeyConditionExpression: '#startDate = :startDate AND #startTime BETWEEN :startTimeMin AND :startTimeMax',
  };
  try {
    const result = await docClient.query(params).promise();
    return result.Items.filter((dailySchedule) => {
      // 曜日で絞り込み
      return dailySchedule.status === "QUEUE_WAITING";
    });
  }
  catch (error) {
    throw error;
  }
}

async function sendMessage(schedule) {
  const params = {
    QueueUrl: dailyScheduleQueueUrl,
    DelaySeconds: calcDelaySeconds(schedule.startDate, schedule.startTime),
    MessageBody: `${schedule.memberId}:${schedule.createdUnixDatetime}`,
    MessageAttributes: {
      "memberId_scheduleId": {
        DataType: "String",
        StringValue: schedule.memberId_scheduleId,
      },
      "startDate": {
        DataType: "String",
        StringValue: schedule.startDate,
      },
      "endDate": {
        DataType: "String",
        StringValue: schedule.endDate,
      },
      "startTime": {
        DataType: "String",
        StringValue: schedule.startTime,
      },
      "endTime": {
        DataType: "String",
        StringValue: schedule.endTime,
      },
      "parkingList": {
        DataType: "String",
        StringValue: JSON.stringify(schedule.parkingList),
      },
      "batteryLevelLowerLimit": {
        DataType: "Number",
        StringValue: schedule.batteryLevelLowerLimit.toFixed(),
      },
      "changeToMoreChargedBikeCondition": {
        DataType: "String",
        StringValue: schedule.changeToMoreChargedBikeCondition,
      },
      "retryForExpiredReservationCondition": {
        DataType: "String",
        StringValue: schedule.retryForExpiredReservationCondition,
      },
      "version": {
        DataType: "Number",
        StringValue: schedule.version.toFixed(),
      },
    },
  };
  try {
    const sendMessageResult = await sqs.sendMessage(params).promise();
    await updateDailySchedule(schedule, sendMessageResult.MessageId);
    return sendMessageResult;
  }
  catch (error) {
    throw error;
  }
}

function calcDelaySeconds(startDate, startTime) {
  const startDatetime = moment(`${startDate} ${startTime}`, "YYYY-MM-DD HH:mm:ss").unix();
  return startDatetime - moment().unix();
}

async function updateDailySchedule(schedule, messageId) {
  const params = {
    TableName: dailyScheduleTableName,
    Key: {//更新したい項目をプライマリキー(及びソートキー)によって１つ指定
      memberId_scheduleId: schedule.memberId_scheduleId,
      startDate_version: schedule.startDate_version,
    },
    ExpressionAttributeNames: {
        '#messageId': 'messageId',
    },
    ExpressionAttributeValues: {
        ':messageId': messageId,
    },
    UpdateExpression: 'SET #messageId = :messageId',
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}