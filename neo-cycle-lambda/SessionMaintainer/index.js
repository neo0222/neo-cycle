const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const axios = require('axios');

const sessionTableName = `neo-cycle-${process.env.ENV_NAME}-SESSION`;
  
exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  } else {
      console.log(`[event]: ${JSON.stringify(event)}`);
  }
  return await main(event, context);
};

async function main(event, context) {
  const { memberId, password } = await retrieveUserInfoFromSsm();
  const sessionId = await retrieveSessionId(memberId, password);
  await putSessionId(memberId, sessionId);
  const response = {
    statusCode: 200,
    body: {
    },
    headers: {
        "Access-Control-Allow-Origin": '*'
    }
  };
  return response;
}

async function retrieveUserInfoFromSsm() {
  const memberId = await ssm.getParameter({
    Name: '/neo-cycle/memberId',
    WithDecryption: false,
  }).promise();
  const password = await ssm.getParameter({
    Name: '/neo-cycle/password',
    WithDecryption: true,
  }).promise();
  return { memberId: memberId.Parameter.Value, password: password.Parameter.Value };
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
    const sessionId = res.headers['x-bks-sessionid'];
    return sessionId;
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
      sessionId: sessionId
    }
  };
  try {
    await docClient.put(params).promise();
  }
  catch (error) {
    throw error;
  }
}

