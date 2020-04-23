const config = require('./' + process.env.NODE_ENV)

export default class Environment {
  static get invokeUrl() {
    return config.InvokeUrl
  }

  static get region() {
    return config.Region
  }

  static get userPoolId() {
    return config.UserPoolId
  }

  static get identityPoolId() {
    return config.IdentityPoolId
  }

  static get clientId() {
    return config.ClientId
  }
}