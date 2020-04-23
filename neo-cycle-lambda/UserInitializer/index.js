const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});

exports.handler = async (event) => {
  const envName = process.env.ENV_NAME;
  const userTableName = `neo-cycle-${envName}-USER`;
  console.log(JSON.stringify(event))
  const params = {
    TableName: userTableName,
    Item: {
      memberId: event.userName,
      favoriteParkingList: [],
      settingMap: {
        language: 'en',
        defaultDisplay: 'map'
      }
    }
  };
  await docClient.put(params).promise();
  return event;
};
