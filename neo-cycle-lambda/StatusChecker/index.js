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
  try {
    const response = {
      statusCode: 200,
      body: JSON.stringify(await checkStatus(memberId, sessionId)),
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

async function checkStatus(memberId, sessionId) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();
  
  const params = new URLSearchParams()
  params.append('EventNo', 25704);
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
    const res = await axios.post(url.Parameter.Value, params, config);
    const html = res.data;
    if (html.indexOf('ログイン情報が削除されました') !== -1) throw 'session expired.'
    const $ = cheerio.load(html);
    if (html.indexOf('利用予約中') !== -1) {
      const children = $('[class=usr_stat]').children()
      const cycleName = children.get(0).prev.data.substr(16, children.get(0).prev.data.length-17);
      const cyclePasscode = children.get(1).children[0].data;
      return {
        status: 'RESERVED',
        detail: {
          cycleName,
          cyclePasscode
        }
      };
    } else if (html.indexOf('自転車を借りる') !== -1) {
      return {
        status: 'WAITING_FOR_RESERVATION'
      }
    } else {
      const children = $('[class=usr_stat]').children()
      const cycleName = children.get(0).prev.data.substr(12, children.get(0).prev.data.length-13);
      const cyclePasscode = children.get(2).children[0].data;
      const cycleUseStartDatetime = children.get(0).next.data.substr(22, 16);
      console.log(cycleName, cyclePasscode, cycleUseStartDatetime)
      return {
        status: 'IN_USE',
        detail: {
          cycleName,
          cyclePasscode,
          cycleUseStartDatetime
        }
      }
    }
  }
  catch (error) {
    throw error;
  }
}
