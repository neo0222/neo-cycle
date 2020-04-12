const axios = require('axios');
import env from '../environment/index'
const endpoint = `https://cognito-idp.${env.region}.amazonaws.com/`


export async function signup(userInfo) {
  const params = {
    ClientId: env.clientId,
    Username: userInfo.username,
    Password: userInfo.password,
    UserAttributes: [{
      Name: 'email',
      Value: userInfo.email
    }]
  }
  console.log(params)
  try {
    console.log('invoked')
    const res = await request('SignUp', params)
    console.log(res)
  }
  catch (error) {
    console.log(error)
  }
}

export async function confirmSignUp(username, confirmationCode) {
  const params = {
    ClientId: env.clientId,
    Username: username,
    ConfirmationCode: confirmationCode,
    ForceAliasCreation: true
  }
  console.log(params)
  try {
    console.log('invoked')
    const res = await request('ConfirmSignUp', params)
    console.log(res)
  }
  catch (error) {
    console.error(error)
    throw error
  }
}

async function request(operation, params) {
  const headers = {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': "AWSCognitoIdentityProviderService." + operation,
    'Access-Control-Allow-Origin': '*'
  };
  try {
    const res = await axios.post(endpoint, params, { headers });
    console.log(res)
    return res
  }
  catch (error) {
    console.error(error.response)
    throw {
      code: error.response.data.__type,
      name: error.response.data.__type,
      message: error.response.data.message,
    }
  }

  
};