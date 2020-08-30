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
  try {
    const response = {
      statusCode: 200,
      body: JSON.stringify(await checkStatus(sessionId, aplVersion)),
      headers: {
          "Access-Control-Allow-Origin": '*'
      },
      isBase64Encoded: false
    };
    console.log(`memberId: ${memberId}, response: ${JSON.stringify(response)}`);
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

async function checkStatus(sessionId, aplVersion) {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': `bike%20share/${aplVersion} CFNetwork/1121.2.2 Darwin/19.3.0`,
      'accept': '*/*'
    },
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/reservecyclestatus', config);
    if (res.data.result !== 200) throw "Error occurred.";
    const userStatusNum = res.data.user_info.user_status;
    if (userStatusNum === 0) {
      return {
        status: 'WAITING_FOR_RESERVATION'
      };
    } else if (userStatusNum === 1) {
      return getReserveCycle(sessionId, aplVersion);
    } else if (userStatusNum === 2) {
      return getReserveCycleUsage(sessionId, aplVersion);
    } else {
      throw "Unexpected user status.";
    }
  }
  catch (error) {
    console.log(error);
    throw error;
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

async function getReserveCycle(sessionId, aplVersion) {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': `bike%20share/${aplVersion} CFNetwork/1121.2.2 Darwin/19.3.0`,
      'accept': '*/*'
    },
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/reservecycle', config);
    if (res.data.result !== 200) throw "Error occurred when retrieve reserve info.";
    const reserveInfo = res.data.reserve_info;
    return {
      status: 'RESERVED',
      detail: {
        cycleName: reserveInfo.cycle_info.cyc_name,
        cyclePasscode: reserveInfo.passcode,
        reserveDatetime: reserveInfo.reserve_datetime,
        reserveLimit: reserveInfo.reserve_limit,
        batteryLevel: reserveInfo.cycle_info.battery_level,
        parkingId: reserveInfo.park_info.park_id,
        parkingName: reserveInfo.park_info.start_park_jp,
      }
    };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

async function getReserveCycleUsage(sessionId, aplVersion) {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
      'X-BKS-SESSIONID': sessionId,
      'user-agent': `bike%20share/${aplVersion} CFNetwork/1121.2.2 Darwin/19.3.0`,
      'accept': '*/*'
    },
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/reservecycleusage', config);
    if (res.data.result !== 200) throw "Error occurred when retrieve bicycle usage info.";
    const reserveInfo = res.data.reserve_info;
    return {
        status: 'IN_USE',
        detail: {
          cycleName: reserveInfo.cycle_info.cyc_name,
          cyclePasscode: reserveInfo.passcode,
          cycleUseStartDatetime: reserveInfo.start_datetime,
          batteryLevel: reserveInfo.cycle_info.battery_level,
        }
      };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}