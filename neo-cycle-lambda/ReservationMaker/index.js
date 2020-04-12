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
  const { memberId } = await getUserInfoFromSsm();
  const sessionId = await getSessionId(memberId);
  const { cycleName, cyclePasscode } = await makeReservation(memberId, sessionId, event);
  if (event.CycleName !== cycleName) {throw new Error("unexpected error occurred.")}
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      cycleName,
      cyclePasscode
    }),
    headers: {
        "Access-Control-Allow-Origin": '*'
    },
    isBase64Encoded: false
  };
  return response;
}

async function getUserInfoFromSsm() {
  const memberId = await ssm.getParameter({
    Name: '/neo-cycle/memberId',
    WithDecryption: false,
  }).promise();
  return { memberId: memberId.Parameter.Value };
}

async function getSessionId(memberId) {
  const params = {
    TableName: sessionTableName,
    Key: {
      'memberId': memberId
    }
  };
  try {
    const response = await docClient.get(params).promise();
    return response.Item.sessionId;
  }
  catch (error) {
    throw error;
  }
}

async function makeReservation(memberId, sessionId, request) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();
  
  const params = new URLSearchParams()
  params.append('EventNo', 25901);
  params.append('SessionID', sessionId);
  params.append('UserID', 'TYO');
  params.append('MemberID', memberId);
  params.append('CenterLat', request.CenterLat);
  params.append('CenterLon', request.CenterLon);
  params.append('CycLat', request.CycLat);
  params.append('CycLon', request.CycLon);
  params.append('CycleID', request.CycleID);
  params.append('AttachID', request.AttachID);
  params.append('CycleTypeNo', request.CycleTypeNo);
  params.append('CycleEntID', request.CycleEntID);
  
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
    }
  }
  try {
    const res = await axios.post(url.Parameter.Value, params, config);
    const html = res.data;
    console.log(html)
    const $ = cheerio.load(html);
    // レンタル可能な自転車がない場合
    if (!$('[class=main_inner_wide]').children().get(0)) return;
    // 自転車がある場合は処理を継続
    const cycleNameDataSource = $('[class=main_inner_wide]').children().get(3)
    const cyclePasscodeDataSource = $('[class=main_inner_wide]').children().get(7).children[0]
    console.log(cycleNameDataSource)
    console.log(cyclePasscodeDataSource)

    const cycleName = cycleNameDataSource.next.data.substr(2);
    const cyclePasscode = cyclePasscodeDataSource.data.substr(1, 4);
    return { cycleName, cyclePasscode };
  }
  catch (error) {
    throw error;
  }
}
