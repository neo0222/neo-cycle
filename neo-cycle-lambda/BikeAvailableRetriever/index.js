const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');

const sessionTableName = `neo-cycle-${process.env.ENV_NAME}-SESSION`;
const userTableName = `neo-cycle-${process.env.ENV_NAME}-USER`;
  
exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  } else {
      console.log(`[event]: ${JSON.stringify(event)}`);
  }
  return await main(event, context);
};

async function main(event, context) {
  const { memberId } = await retrieveUserInfoFromSsm();
  const sessionId = await retrieveSessionId(memberId);
  const parkingIdList = await retrieveParkingIdList(event.memberId);
  const availableBikeMap = await retrieveParkngInfoWithAvailableBike(sessionId, parkingIdList);
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      availableBikeMap,
    }),
    headers: {
        "Access-Control-Allow-Origin": '*'
    },
    isBase64Encoded: false
  };
  return response;
}

async function retrieveUserInfoFromSsm() {
  const memberId = await ssm.getParameter({
    Name: '/neo-cycle/memberId',
    WithDecryption: false,
  }).promise();
  return { memberId: memberId.Parameter.Value };
}

async function retrieveSessionId(memberId) {
  const params = {
    TableName: sessionTableName,
    Key: {
      sessionId,
    },
  };
  try {
    const result = await docClient.get(params).promise();
    return result.Item ? result.Item.sessionId;
  }
  catch (error) {
    throw error
  }
}

async function retrieveParkingIdList(memberId) {
  const params = {
    TableName: userTableName,
    Key: {
      memberId,
    },
  };
  try {
    const result = await docClient.get(params).promise();
    return result.Item ? result.Item.favoriteParkingList.map((parking) => {
      const parkingIdStr = parking.parkingId.toFixed();
      if (parkingIdStr.length !== 5) throw `unexpected data: memberId ${memberId}, parkingId: ${parkingId}`
      const parkingIdForRequest = '000' + parkingIdStr;
      return parkingIdForRequest;
    }) : []
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}


async function retrieveParkngInfoWithAvailableBike(sessionId, parkingIdList) {
  let availableBikeMap = {};
  const promises = [];
  for (const parkingId of parkingIdList) {
    promises.push(retrieveAvailableBikeByParkingId(sessionId, parkingId, availableBikeMap));
  }
  await Promise.all(promises);
  return availableBikeMap;
}

async function retrieveAvailableBikeByParkingId(sessionId, parkingId, availableBikeMap) {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': 'bike%20share/20052201 CFNetwork/1121.2.2 Darwin/19.3.0',
      'accept': '*/*'
    },
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/parkcycleinfo/' + parkingId + '/100/1', config);
    res.data.cycle_info.forEach((cycle) => {
      availableBikeMap[cycle.cyc_name] = cycle.battery_level;
    });
  }
  catch (error) {
    console.log(error)
    throw error;
  }
}