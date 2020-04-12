const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');
const cheerio = require('cheerio');

const sessionTableName = 'neo-cycle-SESSION';

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
  await cancelReservation(memberId, sessionId, 21609);
  await cancelReservation(memberId, sessionId, 27901);
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

async function cancelReservation(memberId, sessionId, eventId) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();
  
  const params = new URLSearchParams()
  params.append('EventNo', eventId);
  params.append('SessionID', sessionId);
  params.append('UserID', 'TYO');
  params.append('MemberID', memberId);
  
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
    }
  }
  try {
    await axios.post(url.Parameter.Value, params, config);
  }
  catch (error) {
    throw error;
  }
}
