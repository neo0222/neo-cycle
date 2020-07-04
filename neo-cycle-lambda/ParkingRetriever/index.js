const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});

const envName = process.env.ENV_NAME;
const userTableName = `neo-cycle-${envName}-USER`;

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
  try {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        parkingList: await retrievedSavedParkingList(memberId),
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

async function retrievedSavedParkingList(memberId) {
  const params = {
    TableName: userTableName,
    Key: {
      memberId: memberId
    }
  };
  try {
    const result = await docClient.get(params).promise();
    return result.Item ? result.Item.favoriteParkingList : []; // ユーザ情報登録APIができたら空配列は返さない
  }
  catch (error) {
    throw error;
  }
}
