const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const axios = require('axios');

const envName = process.env.ENV_NAME;

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
  const parkingIdList = JSON.parse(event.body).parkingIdList;
  
  try {
    console.log(parkingIdList);
    const parkingWithAvailableBikeList = await retrieveParkingWithAvailableBikeList(sessionId, parkingIdList, aplVersion);
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        parkingWithAvailableBikeList,
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

async function retrieveParkingWithAvailableBikeList(sessionId, parkingIdList, aplVersion) {
  const promises = [];
  const retrieveParkingWithAvailableBike = async (sessionId, parkingId, aplVersion) => {
    const innerPromises = [];
    const config = {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
        'X-BKS-SESSIONID': sessionId,
        'user-agent': 'bike%20share/20052201 CFNetwork/1121.2.2 Darwin/19.3.0',
        'accept': '*/*'
      },
    };
    // 駐輪場情報取得
    innerPromises.push((async () => {
      const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/parkinfo/' + parkingId, config);
      if (res !== 200) throw "error occurred";
      const parking = res.data.park_info;
      return {
        parkingId: parking.park_id,
        parkingName: parking.park_name_jp,
        lat: parking.lat,
        lon: parking.lon,
      };
    })());
    // 予約可能な自転車取得
    innerPromises.push((async () => {
      const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/parkcycleinfo/' + parkingId + '/100/1', config);
      return res.data.cycle_info ? res.data.cycle_info.map((cycle) => {
        return {
          cycleName: cycle.cyc_name,
          cycleType: cycle.type_name,
          batteryLevel: cycle.battery_level,
        };
      }) : [];
    })());
    try {
      const result = await Promise.all(innerPromises);
      result[0].availableBikeList = result[1];
      return result[0];
    }
    catch (error) {
      console.log(error);
      throw error;
    }
  }
  for (const parkingId of parkingIdList) {
    promises.push(retrieveParkingWithAvailableBike(sessionId, parkingId, aplVersion));
  }
  try {
    return await Promise.all(promises);
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}
