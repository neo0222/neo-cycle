const AWS = require('aws-sdk');
const axios = require('axios');

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
  const sessionId = JSON.parse(event.body).sessionId;
  const aplVersion = JSON.parse(event.body).aplVersion;
  try {
    await cancelReservation(memberId, sessionId, aplVersion);
    const response = {
      statusCode: 200,
      body: "",
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
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

async function cancelReservation(memberId, sessionId, aplVersion) {
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
    const res = await axios.delete(process.env['SHARE_CYCLE_API_URL'] + '/reservecycle', config);
    if (res.data.result !== 200) throw "Error occurred.";
  }
  catch (error) {
    throw error;
  }
}
