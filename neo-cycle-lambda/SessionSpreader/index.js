const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});

const envName = process.env.ENV_NAME;
const sessionTableName = `neo-cycle-${envName}-SESSION`;
const userTableName = `neo-cycle-${envName}-USER`;

exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  const sessionInfoList = event.Records.map((record) => {
    return {
      memberId: record.dynamodb.NewImage.memberId.S,
      sessionId: record.dynamodb.NewImage.sessionId.S,
    };
  });
  const userInfoList = await retrieveUserListToSpreadSession();
  
  const promises = [];
  for (const sessionInfo of sessionInfoList) {
    promises.push((async () => {
      if (userInfoList.some((userInfo) => {
        return userInfo.memberId === sessionInfo.memberId;
      })) {
        await putSessionId(sessionInfo.memberId, sessionInfo.sessionId);
      }
    })());
  }
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
  
  const response = {
    statusCode: 200,
    body: {},
    headers: {
        "Access-Control-Allow-Origin": '*'
    }
  };
  return response;
}

async function retrieveUserListToSpreadSession() {
  const params = {
    TableName: userTableName,
    ProjectionExpression: 'memberId,encodedPasswordBufferObj',
  };
  const result = await docClient.scan(params).promise();
  return result.Items.filter(user => {
    return !!user.encodedPasswordBufferObj;
  });
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

