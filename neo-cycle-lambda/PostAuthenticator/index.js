const axios = require('axios');
const sessionTableName = `neo-cycle-common-SESSION`;

exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  try {
    if (!event.request.clientMetadata) return event
    const sessionIdPromise = retrieveSessionId(event.userName, event.request.clientMetadata.password);
    const aplVersionPromise = retrieveApiVersion();
    const result = await Promise.all([sessionIdPromise, aplVersionPromise]);
    await putSessionId(event.userName, result[0]);
    event.response = {
      "claimsOverrideDetails": {
        "claimsToAddOrOverride": {
          "sessionId": result[0],
          "aplVersion": result[1],
        }
      }
    };
    console.log(`[LOGIN SUCCESS] ${event.userName}`)
    await notifyToSlack(event.userName);
    return event;
  }
  catch (error) {
    throw error
  }
}

async function retrieveSessionId(memberId, password) {
  const params = {
    userID: memberId,
    password: password,
  };
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
    }
  };
  try {
    const res = await axios.post(process.env['SHARE_CYCLE_API_URL'] + '/bikesharesignin', params, config);
    if (res.data.result !== 200) throw "User does not exist.";
    const sessionId = res.headers['x-bks-sessionid'];
    return sessionId;
  }
  catch (error) {
    throw error;
  }
}

async function retrieveApiVersion() {
  const config = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Api-Key': process.env['SHARE_CYCLE_API_KEY'],
    }
  };
  try {
    const res = await axios.get(process.env['SHARE_CYCLE_API_URL'] + '/aplversion', config);
    if (res.data.result !== 200) throw "Error occurred when retrieving aplVersion.";
    const versionInfo = res.data.version_info.ios;
    return versionInfo;
  }
  catch (error) {
    throw error;
  }
}

async function putSessionId(memberId, sessionId) {
  const params = {
    TableName: sessionTableName,
    Item: {
      memberId: memberId,
      sessionId: sessionId,
    }
  };
  try {
    await docClient.put(params).promise();
    console.log(`[SUCCESS]put sessionId (memberId: ${memberId})`);
  }
  catch (error) {
    throw error;
  }
}

async function notifyToSlack(memberId) {
  try {
    const res = await axios.post(
      process.env.SLACK_WEBHOOK_URL_FOR_LOGIN_MONITORING,
      {
        text: `[${new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000)).toLocaleString()}]` + '\n' + `${memberId}さんがログインしました`
      });
  }
  catch (error) {
    throw error;
  }
}

