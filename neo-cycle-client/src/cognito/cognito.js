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


  signUp(userInfo) {
    console.log('invoked')
    const attributeList = []
    const dataEmail = {
      Name: 'email',
      Value: userInfo.email
    }
    attributeList.push(new CognitoUserAttribute(dataEmail))
    return new Promise((resolve, reject) => {
      this.userPool.signUp(userInfo.username, userInfo.password, attributeList, null, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }


  confirmation(username, confirmationCode) {
    const userData = {
      Username: username,
      Pool: this.userPool
    }
    const cognitoUser = new CognitoUser(userData)
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
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
          if (!session.isValid()) {
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

  login(username, password) {
    const userData = {
      Username: username,
      Pool: this.userPool,
      Storage: sessionStorage
    }
    const cognitoUser = new CognitoUser(userData)
    const authenticationData = {
      Username: username,
      Password: password
    }
    const authenticationDetails = new AuthenticationDetails(authenticationData)
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          try {
            await this.createSpecificCredentials(result, cognitoUser)
            sessionStorage.setItem('currentUserName', username)
            const groups = result.getIdToken().payload['cognito:groups']
            result.groupName = groups ? groups[0] : undefined
            sessionStorage.setItem('group', result.groupName)
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
          console.log('invoked')
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
        UserName: sessionStorage.getItem('currentUserName'),
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
    } catch (error) {
      throw error
    }
    const credenetials = Object.assign( /** target */ {}, cognitoIdentityCredentials.Credentials, /** source2 */ {
      IdToken: IdToken,
      cognitoUser
    })
    sessionStorage.setItem('credentials', JSON.stringify(credenetials))
    sessionStorage.removeItem('storeStateCredentials')
    sessionStorage.setItem('storeStateCredentials', JSON.stringify(credenetials))
  }


  logout() {
    if (this.userPool.getCurrentUser() !== null) {
      this.userPool.getCurrentUser().signOut()
    }
    sessionStorage.removeItem('authorities')
    sessionStorage.removeItem('currentUserName')
    sessionStorage.removeItem('storeStateCredentials')
    sessionStorage.removeItem('credentials')
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
          if (!session.isValid()) {
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
        UserName: sessionStorage.getItem('currentUserName'),
        Pool: this.userPool,
        Storage: sessionStorage,
      }
      let cognitoUser = new CognitoUser(userData);
      const session = await new Promise((resolve, reject) => {
        cognitoUser.getSession((err, result) => {
          if (err) reject(err);
          resolve(result)
        })
      })
      return new Promise(async (resolve, reject) => {
        if (!session.isValid()) {
          reject('session invalid')
        }
        await this.refreshCognitoTokens();
        resolve(session)
      })
    } else {
      const cognitoUser = this.userPool.getCurrentUser()
      return new Promise(async (resolve, reject) => {
        if (cognitoUser === null) {
          reject(cognitoUser)
        }
        const session = cognitoUser.getSignInUserSession()
        if (session === null || !session.isValid()) {
          reject('session invalid')
        } else {
          await this.refreshCognitoTokens()
          resolve(session)
        }
      })
    }

  }

  async refreshCognitoTokens() {
    const userData = {
      UserName: sessionStorage.getItem('currentUserName'),
      Pool: this.userPool,
      Storage: sessionStorage,
    }
    let cognitoUser = new CognitoUser(userData);
    const refreshToken = cognitoUser.getSignInUserSession().getRefreshToken()
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
}
