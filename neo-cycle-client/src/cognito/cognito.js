import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js'
import {
  Config,
  CognitoIdentityCredentials
} from 'aws-sdk'
import * as AWS from 'aws-sdk/global'
import env from '../environment/index'

export default class Cognito {
  configure(config) {
    if (config.userPool) {
      this.userPool = config.userPool
    } else {
      this.userPool = new CognitoUserPool({
        UserPoolId: env.userPoolId,
        ClientId: env.clientId,
        Storage: sessionStorage
      })
    }
    Config.region = env.region
    Config.credentials = new CognitoIdentityCredentials({
      IdentityPoolId: env.identityPoolId
    })
    AWS.config.region = env.region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: env.identityPoolId
    })
    this.options = config
  }

  static install = (Vue, options) => {
    Object.defineProperty(Vue.prototype, '$cognito', {
      get() {
        return this.$root._cognito
      }
    })

    Vue.mixin({
      beforeCreate() {
        if (this.$options.cognito) {
          this._cognito = this.$options.cognito
          this._cognito.configure(options)
        }
      }
    })
  }


  updateAttributes(attributeName, newAttribute) {
    const cognitoUser = this.userPool.getCurrentUser()
    return new Promise((resolve, reject) => {
      if (cognitoUser === null) {
        reject(cognitoUser)
      }
      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err)
        } else {
          if (!this.isSessionValid(session)) {
            reject(session)
          } else {
            console.log('session success')
            resolve(new Promise((resolve, reject) => {
              const dataUsername = {
                Name: attributeName,
                Value: newAttribute
              }
              const attributeList = [new CognitoUserAttribute(dataUsername)]
              cognitoUser.updateAttributes(attributeList, (err, result) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(result)
                }
              })
            }))
          }
        }
      })
    })
  }

  login(username, password, isSrp) {
    const userData = {
      Username: username,
      Pool: this.userPool,
      Storage: sessionStorage
    }
    const cognitoUser = new CognitoUser(userData)
    if (!isSrp) {
      cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH')
    }
    const authenticationData = {
      Username: username,
      Password: password,
      ClientMetadata: {
        password: password
      }
    }
    const authenticationDetails = new AuthenticationDetails(authenticationData)
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          try {
            await this.createSpecificCredentials(result, cognitoUser)
            sessionStorage.setItem('currentUserName', username)
            result.status = 'SUCCESS'
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        onFailure: (err) => {
          reject(err)
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          sessionStorage.setItem('requiredAttributes', requiredAttributes)
          const result = {
            status: 'PASSWORD_REQUIRED'
          }
          resolve(result)
        },
      })
    })
  }

  updatePassword(params) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: sessionStorage.getItem('currentUserName'),
        Pool: this.userPool,
        Storage: sessionStorage,
      }
      let cognitoUser = new CognitoUser(userData);
      cognitoUser.completeNewPasswordChallenge(params.password, sessionStorage.get('requiredAttributes'), {
        onSuccess: async (result) => {
          try {
            await this.createSpecificCredentials(result, cognitoUser)
            result.status = 'SUCCESS'
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        onFailure: (error) => {
          reject(error)
        }
      })
    })
  }

  async createSpecificCredentials(session, cognitoUser) {
    const IdToken = session.getIdToken().getJwtToken()
    let provider = {}
    provider['cognito-idp.' + env.region + '.amazonaws.com/' + env.userPoolId] = IdToken
    const params = {
      IdentityPoolId: env.identityPoolId,
      Logins: provider
    }
    const cognitoIdentity = new AWS.CognitoIdentity({
      apiVersion: '2016-04-18',
      region: env.region
    })
    let cognitoIdentityCredentials
    try {
      const cognitoIdentityId = await cognitoIdentity.getId(params).promise()
      cognitoIdentityCredentials = await cognitoIdentity.getCredentialsForIdentity({
        IdentityId: cognitoIdentityId.IdentityId,
        Logins: provider
      }).promise()
      const credenetials = Object.assign( /** target */ {}, cognitoIdentityCredentials.Credentials, /** source2 */ {
        IdToken: IdToken,
        cognitoUser
      })
      sessionStorage.removeItem('storeStateCredentials')
      sessionStorage.setItem('storeStateCredentials', JSON.stringify(credenetials))
    } catch (error) {
      console.log(error)
      throw error
    } 
  }


  logout() {
    if (this.userPool.getCurrentUser() !== null) {
      this.userPool.getCurrentUser().signOut()
    }
    sessionStorage.removeItem('authorities')
    sessionStorage.removeItem('currentUserName')
    sessionStorage.removeItem('storeStateCredentials')
    sessionStorage.removeItem('group')
  }

  getUserAttributeByAttributeName(attributeName) {
    const cognitoUser = this.userPool.getCurrentUser()
    return new Promise((resolve, reject) => {
      if (cognitoUser === null) {
        reject(cognitoUser)
      }
      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err)
        } else {
          if (!this.isSessionValid(session)) {
            reject(session)
          } else {
            console.log('session success')
            resolve(new Promise((resolve, reject) => {
              cognitoUser.getUserAttributes(function (err, result) {
                if (err) {
                  alert(err);
                  return;
                }
                const attribute = result.find(element => element.getName() === attributeName)
                if (attribute) {
                  resolve(attribute.getValue())
                } else {
                  reject(result)
                }
              })
            }))
          }
        }
      })
    })
  }

  async isAuthenticated() {
    if (this.userPool == null) {
      const data = {
        UserPoolId: env.userPoolId,
        ClientId: env.clientId,
        Storage: sessionStorage
      }
      this.userPool = new CognitoUserPool(data)

      // 認証エラーの状態でリロードした場合
      if (!this.userPool.getCurrentUser()) {
        return new Promise((resolve, reject) => {
          reject('unauthenticated')
        })
      }

      // それ以外の場合
      const userData = {
        Username: sessionStorage.getItem('currentUserName'),
        Pool: this.userPool,
        Storage: sessionStorage,
      }
      let cognitoUser = JSON.parse(sessionStorage.getItem('storeStateCredentials')).cognitoUser;
      const session = cognitoUser.signInUserSession
      return new Promise(async (resolve, reject) => {
        if (!this.isSessionValid(session)) {
          reject('session invalid')
        }
        // await this.refreshCognitoTokens();
        resolve(session)
      })
    } else {
      const cognitoUser = JSON.parse(sessionStorage.getItem('storeStateCredentials')).cognitoUser;
      return new Promise(async (resolve, reject) => {
        if (cognitoUser === null) {
          reject(cognitoUser)
        }
        const session = cognitoUser.signInUserSession
        if (session === null || !this.isSessionValid(session)) {
          reject('session invalid')
        } else {
          // await this.refreshCognitoTokens()
          resolve(session)
        }
      })
    }

  }

  async refreshCognitoTokens() {
    let cognitoUser = JSON.parse(sessionStorage.getItem('storeStateCredentials')).cognitoUser;
    const refreshToken = cognitoUser.signInUserSession.refreshToken
    const session = await new Promise((resolve, reject) => {
      cognitoUser.refreshSession(refreshToken, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    await this.createSpecificCredentials(session, cognitoUser)
  }

  isSessionValid(session) {
    var now = Math.floor(new Date() / 1000);
    var adjusted = now - session.clockDrift;
    return adjusted < session.accessToken.payload.exp && adjusted < session.idToken.payload.exp;
  }


}
