const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const axios = require('axios');

const envName = process.env.ENV_NAME;

const userTableName = `neo-cycle-${envName}-USER`;
const sessionTableName = `neo-cycle-${envName}-SESSION`;
  
exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  } else {
      console.log(`[event]: ${JSON.stringify(event)}`);
  }
  return await main(event, context);
};

async function main(event, context) {
  const memberId = JSON.parse(event.body).memberId;
  const sessionId = JSON.parse(event.body).sessionId ? JSON.parse(event.body).sessionId : await retrieveSessionId(memberId);
  const aplVersion = JSON.parse(event.body).aplVersion;
  const cursor = JSON.parse(event.body).cursor;
  const limit = JSON.parse(event.body).limit;
  
  try {
    const parkingIdList = await retrieveParkingIdList(JSON.parse(event.body).memberId, cursor, limit);
    console.log(parkingIdList);
    const availableBikeMap = await retrieveAvailableBikeList(sessionId, parkingIdList, aplVersion);
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
    console.log(`memberId: ${memberId}, response: ${JSON.stringify(response)}`);
    return response;
  }
  catch (error) {
    return {
      statusCode: 440,
      body: JSON.stringify({message: 'session expired.'}),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
  }
}

async function retrieveSessionId(memberId) {
  const params = {
    TableName: sessionTableName,
    Key: {
      memberId: memberId,
    },
  };
  const result = await docClient.get(params).promise();
  return result.Item.sessionId;
}

async function retrieveParkingIdList(memberId, cursor, limit) {
  const params = {
    TableName: userTableName,
    Key: {
      memberId,
    },
  };
  try {
    const result = await docClient.get(params).promise();
    const maybeParkingIdList = result.Item ? result.Item.favoriteParkingList.filter((parking, index, self) => {
      if (!cursor || !limit) return self;
      const firstIndex = self.findIndex((parking) => {
        return parking.parkingId === cursor;
      });
      return index >= firstIndex && index < firstIndex + limit;
    }).map((parking) => {
      if (!parking.parkingId) return; // 販売所はidがnullで登録されるので無視
      return parking.parkingId;
    }) : [];
    // nullを除外して返す
    return maybeParkingIdList.filter((parkingId) => {
      return parkingId;
    });
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function retrieveAvailableBikeList(sessionId, parkingIdList, aplVersion) {
  let availableBikeMap = {};
  const promises = [];
  for (const parkingId of parkingIdList) {
    promises.push(retrieveAvailableBikeByParkingId(sessionId, parkingId, availableBikeMap, aplVersion));
  }
  await Promise.all(promises);
  return availableBikeMap;
}

async function retrieveAvailableBikeByParkingId(sessionId, parkingId, availableBikeMap, aplVersion) {
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
    
    availableBikeMap[parkingId] = res.data.cycle_info ? res.data.cycle_info.map((cycle) => {
      return {
        cycleName: cycle.cyc_name,
        batteryLevel: cycle.battery_level,
      };
    }) : [];
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}