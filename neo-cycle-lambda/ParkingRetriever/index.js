const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');
const cheerio = require('cheerio');

const envName = process.env.ENV_NAME;
const userTableName = `neo-cycle-${envName}-USER`;
const getInfoNum = 300;

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
    const savedParkingList = await retrievedSavedParkingList(memberId);
    const parkingList = await retrieveParkingList(memberId, sessionId, savedParkingList);
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

async function retrieveParkingList(memberId, sessionId, savedParkingList) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();
  
  const parkingList = [];
  for (const savedParking of savedParkingList) {
    parkingList.push((async () => {
      const parkingId = savedParking.parkingId;
      const params = new URLSearchParams()
      params.append('EventNo', 25701);
      params.append('SessionID', sessionId);
      params.append('UserID', 'TYO');
      params.append('MemberID', memberId);
      params.append('GetInfoNum', getInfoNum);
      params.append('GetInfoTopNum', 1);
      params.append('ParkingEntID', 'TYO');
      params.append('ParkingID', parkingId);
      
      const config = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        }
      }
      let parking = {
        parkingId,
        parkingName: savedParking.parkingName,
        cycleList: []
      };
      const res = await axios.post(url.Parameter.Value, params, config);
      const html = res.data;
      if (html.indexOf('ログイン情報が削除されました') !== -1) throw 'session expired.'
      const $ = cheerio.load(html);
      // レンタル可能な自転車がない場合
      if (!$('[class=park_info_inner_left]').children().get(0)) return {
        parkingId,
        parkingName: savedParking.parkingName,
        cycleList: []
      };;
      // 自転車がある場合は処理を継続
      parking.parkingName = $('[class=park_info_inner_left]').children().get(0).next.data.substr(2);

      // 1つの自転車が1つのformに紐づいている
      const formElementMap = $('[class=sp_view]').children();
      formElementMap.each((index, element) => {
        let cycle = {};
        
        // input要素のvalueにパラメータが格納されている
        element.children.filter((element) => {
          return element.name === 'input'
        }).map((element => {
          // Credenetialな情報は返さない
          if (element.attribs.name === 'MemberID' || element.attribs.name === 'SessionID') return
          cycle[element.attribs.name] = element.attribs.value;
        }));

        // 自転車のラベル番号はdivにしかないので個別に詰める
        const elementWithNameDiv = element.children.filter((element) => {
          return element.name === 'div'
        })[0]
        const elementWithNameA = elementWithNameDiv.children.filter((element) => {
          return element.name === 'a'
        })[0]
        const elementWithCycleName = elementWithNameA.children[0];
        cycle['CycleName'] = elementWithCycleName.data;

        parking.cycleList.push(cycle);
      })
      return parking;
    })()); 
  }
  try {
    return await Promise.all(parkingList);
  }
  catch (error) {
    throw error;
  }
}

async function retrievedSavedParkingList(memberId) {
  const params = {
    TableName: userTableName,
    Key: memberId
  }
  try {
    const result = await docClient.get(params).promise();
    return result.Item.favoriteParkingList;
  }
  catch (error) {
    throw error
  }
}
