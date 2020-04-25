const AWS = require('aws-sdk');
const parser = require('fast-xml-parser');
const axios = require("axios");
const cheerio = require('cheerio');

const ssm = new AWS.SSM();

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

async function retrieveParkingList(memberId, sessionId, lat, lon) {
  const url = await ssm.getParameter({
    Name: '/neo-cycle/php-url',
    WithDecryption: false,
  }).promise();

  const imanaraUrl = 'https://imanara.jp/platformapi';
  const params = new URLSearchParams();
  params.append('n_platform', '1')
  params.append('a_os_version', '13.3.1')
  params.append('a_career_uid', '905bec8be9d12e0b7e6791ea27b9b41d')
  params.append('a_shop_account_app_id', '37')
  params.append('a_app_version', '1.6.4')
  params.append('a_app_locale', 'ja_JP')
  params.append('a_check_code', 'e97e1ccdf8c3c1bfa7db95c2927f9ace')
  params.append('a_install_id', 'b2ebbd2ca7dbd8148f38be8d1f636466')
  params.append('a_window_id', 'CS01')
  params.append('act', 'shop_list')
  params.append('a_lat', lat)
  params.append('a_lon', lon)
  params.append('n_range', '2000')
  params.append('n_disable_coupon_sort', '1')
  params.append('n_limit', '60')
  params.append('n_offset', '0')
  
  const res = await axios.post(imanaraUrl, params);
  const rawParkingList = parser.parse(res.data).info.shop;
      
  const rawParkingList = parser.parse(res.data).info.shop ? parser.parse(res.data).info.shop : [];
  const parkingList = [];
  for (const rawParking of rawParkingList) {
    parkingList.push((async () => {
      const parkingId = rawParking.tsc_cd;
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
        parkingName: rawParking.company_name,
        cycleList: [],
        lat: rawParking.shop_gps_lat,
        lon: rawParking.shop_gps_lon,
      };
      const res = await axios.post(url.Parameter.Value, params, config);
      const html = res.data;
      if (html.indexOf('ログイン情報が削除されました') !== -1) throw 'session expired.'
      const $ = cheerio.load(html);
      // レンタル可能な自転車がない場合
      if (!$('[class=park_info_inner_left]').children().get(0)) return parking;
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
    console.log(error)
    throw error;
  }
}