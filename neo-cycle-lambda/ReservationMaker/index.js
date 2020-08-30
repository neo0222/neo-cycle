const AWS = require('aws-sdk');
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
  const cycleName = JSON.parse(event.body).cycleName;
  try {
    const res = await makeReservation(memberId, sessionId, cycleName, aplVersion);
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
    return response;
  }
  catch (error) {
    if (error === "BikeNotFoundError") {
      return {
        statusCode: 400,
        body: JSON.stringify({message: 'bike not found.'}),
        headers: {
            "Access-Control-Allow-Origin": '*'
        },
        isBase64Encoded: false
      };
    }
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

async function makeReservation(memberId, sessionId, cycleName, aplVersion) {
  const params = {
    cyc_name: cycleName,
  };
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': `bike%20share/${aplVersion} CFNetwork/1121.2.2 Darwin/19.3.0`,
      'accept': '*/*'
    }
  };
  try {
    const res = await axios.post(process.env['SHARE_CYCLE_API_URL'] + '/reservecycle', params, config);
    console.log(res);
    if (res.data.result === 300) throw "BikeNotFoundError";
    if (res.data.result !== 200) throw "SessionExpiredError";
    return {
      cycleName: cycleName,
      cyclePasscode: res.data.passcode,
      reserveLimit: res.data.reserve_limit,
    };
  }
  catch (error) {
    throw error;
  }
}
