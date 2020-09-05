const AWS = require('aws-sdk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});

const envName = process.env.ENV_NAME;
const queueTableName = `neo-cycle-${envName}-QUEUE`;
const dailyScheduleTableName = `neo-cycle-${envName}-DAILY_SCHEDULE`;

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  console.log(JSON.stringify(event));

  try {
    for (const message of event.Records) {
      if (await isMessageDuplicated(message.messageId)) {
        // SQSのメッセージは重複して読み出される場合があるので冪等性を担保
        console.log(`already processed (messageId: ${message.messageId})`);
        continue;
      }
      // 重複していない場合
      await putDailySchedule(message.messageAttributes);
      await updateQueue(message);
    }
  } catch (error) {
    console.log(error);
    // throw error;
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

async function putDailySchedule(messageAttributes) {
  const today = moment();
  const params = {
    TableName: dailyScheduleTableName,
    Item: {
      memberId_scheduleId: messageAttributes.memberId_scheduleId.stringValue,
      startDate_version: `${messageAttributes.startDate.stringValue}_0`,
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
      status: "WAITING",
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
