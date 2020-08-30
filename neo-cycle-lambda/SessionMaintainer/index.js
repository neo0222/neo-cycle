const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1'
});
const ssm = new AWS.SSM();
const kms = new AWS.KMS({ region: 'ap-northeast-1' });
const axios = require('axios');

const envName = process.env.ENV_NAME;
const sessionTableName = `neo-cycle-common-SESSION`;
const userTableName = `neo-cycle-${envName}-USER`;
const keyAlias = `alias/neo-cycle-${envName}-key-for-manipulating-password`;
const encryptionAlgotirhm = "RSAES_OAEP_SHA_256";

exports.handler = async (event, context) => {
  if (event.warmup) {
      console.log("This is warm up.");
  } else {
      console.log(`[event]: ${JSON.stringify(event)}`);
  }
  return await main(event, context);
};

async function main(event, context) {
  const userList = await retrieveUserListToMaintainSession();
  
  const promises = [];
  for (const user of userList) {
    promises.push((async () => {
      const decodedPassword = await decodePassword(user.encodedPasswordBufferObj);
      const sessionId = await retrieveSessionId(user.memberId, decodedPassword);
      await putSessionId(user.memberId, sessionId);
    })());
  }
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
  
  // const rawString = "example-password";
  // const encryptParams = {
  //   KeyId: "alias/neo-cycle-dev-key-for-manipulating-password",
  //   Plaintext: Buffer.from(rawString).toString(),
  //   EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
  // };
  
  
  // const encryptRes = await kms.encrypt(encryptParams).promise();
  
  // await putSessionId(memberId, sessionId, encryptRes.CiphertextBlob.toJSON());
  
  // var token;
  
  // var encryptedBuf = encryptRes.CiphertextBlob;
  // var cipherText = {
  //   CiphertextBlob: Buffer.from(encryptRes.CiphertextBlob.toJSON()),
  //   KeyId: "alias/neo-cycle-dev-key-for-manipulating-password",
  //   EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
  // };

  // const res = await kms.decrypt(cipherText).promise();
  // console.log(res.Plaintext.toString('utf-8'));
  const response = {
    statusCode: 200,
    body: {},
    headers: {
        "Access-Control-Allow-Origin": '*'
    }
  };
  return response;
}

async function retrieveUserListToMaintainSession() {
  const params = {
    TableName: userTableName,
    ProjectionExpression: 'memberId,encodedPasswordBufferObj',
  };
  const result = await docClient.scan(params).promise();
  return result.Items.filter(user => {
    return !!user.encodedPasswordBufferObj;
  });
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

async function decodePassword(encodedPasswordBufferObj) {
  var params = {
    CiphertextBlob: Buffer.from(encodedPasswordBufferObj),
    KeyId: keyAlias,
    EncryptionAlgorithm: encryptionAlgotirhm,
  };
  const res = await kms.decrypt(params).promise();
  return res.Plaintext.toString('utf-8');
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
  }
  catch (error) {
    throw error;
  }
}

