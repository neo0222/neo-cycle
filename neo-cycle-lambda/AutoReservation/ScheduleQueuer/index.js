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
const scheduleTableName = `neo-cycle-${envName}-SCHEDULE`;
const scheduleQueueUrl = process.env.SCHEDULE_QUEUE_URL;

let tomorrow;
let dayAfterTomorrow;

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  tomorrow = moment().add(1, "days");
  dayAfterTomorrow = moment().add(2, "days");

  try {
    // regular schedule取得
    const regularScheduleList = await retrieveRegularSchedule();
    // one-time schedule取得
    const oneTimeScheduleList = await retrieveOneTimeSchedule();
    console.log(`regularScheduleList.length: ${regularScheduleList.length}, oneTimeScheduleList.length: ${oneTimeScheduleList.length}`);
    // queue
    const promises = [];
    for (const schedule of regularScheduleList.concat(oneTimeScheduleList)) {
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

async function retrieveRegularSchedule() {
  const params = {
    TableName: scheduleTableName,
    IndexName: "isRegular-isUsed-index",
  };
  try {
    const result = await docClient.scan(params).promise();
    return result.Items.filter((schedule) => {
      // 曜日で絞り込み
      return schedule.dayOfWeek[tomorrow.format('d')];
    });
  }
  catch (error) {
    throw error;
  }
}

async function retrieveOneTimeSchedule() {
  const params = {
    TableName: scheduleTableName,
    IndexName: "startDate-isUsed-index",
    ExpressionAttributeNames:{'#startDate': 'startDate'},
    ExpressionAttributeValues:{':tomorrow': tomorrow.format("YYYY-MM-DD")},
    KeyConditionExpression: '#startDate = :tomorrow',
  };
  try {
    const result = await docClient.query(params).promise();
    return result.Items;
  }
  catch (error) {
    throw error;
  }
}

async function sendMessage(schedule) {
  const params = {
    QueueUrl: scheduleQueueUrl,
    MessageBody: `${schedule.memberId}:${schedule.createdUnixDatetime}`,
    MessageAttributes: {
      "memberId_scheduleId": {
        DataType: "String",
        StringValue: `${schedule.memberId}:${schedule.createdUnixDatetime}`,
      },
      "startDate": {
        DataType: "String",
        StringValue: schedule.startDate ? schedule.startDate : tomorrow.format("YYYY-MM-DD"),
      },
      "endDate": {
        DataType: "String",
        StringValue: schedule.endDate ? schedule.endDate : getEndDate(schedule.startTime, schedule.endTime),
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
        StringValue: schedule.changeToMoreChargedBikeCondition
      },
      "retryForExpiredReservationCondition": {
        DataType: "String",
        StringValue: schedule.retryForExpiredReservationCondition
      },
    },
  };
  try {
    return await sqs.sendMessage(params).promise();
  }
  catch (error) {
    throw error;
  }
}

function getEndDate(startTime, endTime) {
  if (moment(startTime, 'HH:mm:ss') < moment(endTime, 'HH:mm:ss')) {
    return tomorrow.format("YYYY-MM-DD");
  } else {
    return dayAfterTomorrow.format("YYYY-MM-DD");
  }
}