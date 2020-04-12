const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');

const sessionTableName = 'neo-cycle-SESSION';

exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  const body = JSON.parse(event.body);
  const sessionId = await retrieveSessionId(body.memberId, body.password);
  const response = {
    statusCode: 200,
    body: JSON.stringify({ sessionId }),
    headers: {
        "Access-Control-Allow-Origin": '*'
    },
    isBase64Encoded: false
  };
  return response;
}

async function retrieveSessionId(memberId, password) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();
  const params = new URLSearchParams()
  params.append('EventNo', 21401);
  params.append('GarblePrevention', '%EF%BC%B0%EF%BC%AF%EF%BC%B3%EF%BC%B4%E3%83%87%E3%83%BC%E3%82%BF');
  params.append('MemberID', memberId);
  params.append('Password', password);
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
    }
  }
  try {
    const res = await axios.post(url.Parameter.Value, params, config);
    const html = res.data;
    const sessionId = html.substr(html.indexOf('"SessionID" value="') + 19, 36+memberId.length);
    return sessionId;
  }
  catch (error) {
    throw error;
  }
}


