const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});

const envName = process.env.ENV_NAME;
const userTableName = `neo-cycle-${envName}-USER`;

exports.handler = async (event, context) => {
  if (event.warmup) {
    console.log("This is warm up.");
  }
  return await main(event, context);
};

async function main(event, context) {
  const body = JSON.parse(event.body);
  if (event.resource === "/parkings/registration") {
    await registerFavoriteParking(body.memberId, body.parkingId, body.parkingName)
  } else if (event.resource === "/parkings/removal") {
    await removeFavoriteParking(body.memberId, body.parkingId)
  } else {
    await updateFavoriteParking(body.memberId, body.favoriteParkingList)
  }
  return {
    statusCode: 200,
    body: JSON.stringify({}),
    headers: {
        "Access-Control-Allow-Origin": '*'
    },
    isBase64Encoded: false
  };
}

async function registerFavoriteParking(memberId, parkingId, parkingName) {
  const params = {
    TableName: userTableName,
    Key:{
      memberId : memberId
    },
    ExpressionAttributeNames: {
      '#favoriteParkingList': 'favoriteParkingList'
    },
    ExpressionAttributeValues: {
      ':parking': [{
        parkingId: parkingId,
        parkingName: parkingName
      }]
    },
    UpdateExpression: 'SET #favoriteParkingList = list_append(#favoriteParkingList, :parking)'
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    throw error
  }
}

async function removeFavoriteParking(memberId, parkingId) {
  const currentFavoriteParkingList = await getFavoriteParkingList(memberId);
  const params = {
    TableName: userTableName,
    Key:{
      memberId : memberId
    },
    ExpressionAttributeNames: {
      '#favoriteParkingList': 'favoriteParkingList'
    },
    ExpressionAttributeValues: {
      ':favoriteParkingList': currentFavoriteParkingList.filter((parking) => {
        return parking.parkingId !== parkingId
      })
    },
    UpdateExpression: 'SET #favoriteParkingList = :favoriteParkingList'
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    throw error
  }
}

async function updateFavoriteParking(memberId, favoriteParkingList) {
  const params = {
    TableName: userTableName,
    Key:{
      memberId : memberId
    },
    ExpressionAttributeNames: {
      '#favoriteParkingList': 'favoriteParkingList'
    },
    ExpressionAttributeValues: {
      ':favoriteParkingList': favoriteParkingList
    },
    UpdateExpression: 'SET #favoriteParkingList = :favoriteParkingList'
  };
  try {
    await docClient.update(params).promise();
  }
  catch (error) {
    throw error
  }
}

async function getFavoriteParkingList(memberId) {
  const params = {
    TableName: userTableName,
    Key: {
      memberId: memberId
    }
  };
  const result = await docClient.get(params).promise();
  return result.Item ? result.Item.favoriteParkingList : [];
}