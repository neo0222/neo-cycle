const AWS = require('aws-sdk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});
const sqs = new AWS.SQS({
  region: 'ap-northeast-1',
})

const envName = process.env.ENV_NAME;
const scheduleTableName = `neo-cycle-${envName}-SCHEDULE`;
const scheduleQueueUrl = process.env.SCHEDULE_QUEUE_URL;

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  try {
    // regular schedule取得
    const regularScheduleList = await retrieveRegularSchedule();
    // one-time schedule取得
    const oneTimeScheduleList = await retrieveOneTimeSchedule();
    // queue
    const promises = [];
    for (const schedule of regularScheduleList.concat(oneTimeScheduleList)) {
      promises.push(sendMessage(schedule));
    }
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
}

async function retrieveRegularSchedule() {
  const params = {
    TableName: scheduleTableName,
    IndexName: "isUsed-isRegular-index",
  };
  try {
    const result = await docClient.scan(params).promise();
    return result.Items.filter((schedule) => {
      // 曜日で絞り込み
      return schedule.dayOfWeek[moment().add('days', 1).format('d')]；
    });
  }
  catch (error) {
    throw error
  }
}

async function retrieveOneTimeSchedule() {
  const params = {
    TableName: scheduleTableName,
    IndexName: "isUsed-startDate-index",
    ExpressionAttributeNames:{'#startDate': 'startDate'},
    ExpressionAttributeValues:{':tomorrow': moment().add('days', 1).format("YYYY-MM-DD")},
    KeyConditionExpression: '#startDate = :startDate',
  };
  try {
    const result = await docClient.scan(params).promise();
    return result.Items;
  }
  catch (error) {
    throw error
  }
}

async function sendMessage(schedule) {
  const params = {
    QueueUrl: scheduleQueueUrl,
    MessageBody: `${schedule.memberId}_${schedule.createdUnixDatetime}`,
    MessageAttributes: {
      "memberId_scheduleId": {
        DataType: "String",
        StringValue: `${schedule.memberId}:${schedule.createdUnixDatetime}`,
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
        StringValue: schedule.batteryLevelLowerLimit,
      },
      "isChangeToMoreChargedBikeAllowed": {
        DataType: "Number",
        StringValue: schedule.isChangeToMoreChargedBikeAllowed ? 1 : 0,
      },
      "changeToMoreChargedBikeCondition": {
        DateType: "String",
        StringValue: schedule.changeToMoreChargedBikeCondition
      },
      "isRetryForExpiredReservationAllowed": {
        DataType: "Number",
        StringValue: schedule.isRetryForExpiredReservationAllowed ? 1 : 0,
      },
      "retryForExpiredReservationCondition": {
        DateType: "String",
        StringValue: schedule.retryForExpiredReservationCondition
      },
    },
  };
  try {
    await sqs.sendMessage(params).promise();
  }
  catch (error) {
    throw error
  }
}
