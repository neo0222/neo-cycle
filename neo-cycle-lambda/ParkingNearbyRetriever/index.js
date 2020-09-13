const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const axios = require("axios");
// const cheerio = require('cheerio');

const ssm = new AWS.SSM();

const getInfoNum = 300;

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
  const lat = JSON.parse(event.body).lat;
  const lon = JSON.parse(event.body).lon;
  try {
    const parkingList = await retrieveParkingList(memberId, sessionId, lat, lon);
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        parkingList
      }),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
    return response;
  }
  catch (error) {
    console.log(error)
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

async function retrieveParkingList(memberId, sessionId, lat, lon) {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': 'bike%20share/20052201 CFNetwork/1121.2.2 Darwin/19.3.0',
      'accept': '*/*'
    },
    params: {
      // ここにクエリパラメータを指定する
      lon: lon.toFixed(6),
      lat: lat.toFixed(6),
      get_start_no: 1,
      zoom_level: 14,
      get_num: 150,
    },
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/contentparklist/T01', config);
    console.log(JSON.stringify(res.data));
    
    if (res.data.result !== 200) throw "error occurred";
    return res.data.park_info.map((parking) => {
      return {
        parkingId: parking.park_id,
        parkingName: parking.park_name_jp,
        cycleList: [],
        lat: parking.lat,
        lon: parking.lon,
      }
    })
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}