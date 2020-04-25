const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');

exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  try {
    const sessionId = await retrieveSessionId(event.userName, event.request.clientMetadata.password);
    event.response = {
      "claimsOverrideDetails": {
        "claimsToAddOrOverride": {
          "sessionId": sessionId
        }
      }
    };
    console.log(`[LOGIN SUCCESS] ${event.userName}`)
    return event;
  }
  catch (error) {
    throw error
  }
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
    if (html.indexOf('IDまたはパスワードが異なります') !== -1) throw 'User does not exist.'
    if (html.indexOf('連続して誤ったパスワードを複数回入力したため') !== -1) throw 'Account is locked.'
    const sessionId = html.substr(html.indexOf('"SessionID" value="') + 19, 36+memberId.length);
    return sessionId;
  }
  catch (error) {
    throw error;
  }
}


