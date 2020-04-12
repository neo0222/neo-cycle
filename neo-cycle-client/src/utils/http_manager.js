import moment, {
  version
} from 'moment'
import errorMap from '../errors'

// expected http error status
const httpErrorCodeListForAPI = [400, 401, 403, 404, 413, 415, 428, 429, 500, 504]
const httpErrorCodeListForAWSAPI = [400, 403, 404, 409, 500, 503]

// ErrorMapping Configuration
const errorMessageLang = 'ja'

export default {
  methods: {
    handleErrorResponse: function (vm, error) {
      const service = 'apiGateway'

      const errorRes = error.response ? error.response : undefined
      const errorCode = errorRes ? errorRes.status : ''

      const switchOpenDialogFunc = {
        400: function () {
          if (errorRes.data.errors) {
            const errors = errorRes.data.errors
            for (const error of errors) {
              if (error.code === '20004') {
                try {
                  const details = JSON.parse(error.details[0])
                  const wrappedError = details.error[0]
                  const code = wrappedError.code
                  const message = httpManagerPrivate.getTranslatedMessage(integratedResponseService, code, errorMessageLang)

                  const title = `Business Error: ${code}`
                  httpManagerPrivate.notifyWarning(vm, title, message)
                } catch (error) {
                  // 期待されるエラー形式と異なる場合。Lambdaが落ちてerrorsが空の場合など
                  const title = 'Business Error'
                  const message = '予期せぬエラーが発生しました。'
                  httpManagerPrivate.notifyWarning(vm, title, message)
                  console.error(error)
                }
              } else { // 通常のエラーハンドリング
                const title = `Business Error: ${error.code}`
                const message = httpManagerPrivate.getTranslatedMessage(integratedResponseService, error.code, errorMessageLang)
                httpManagerPrivate.notifyWarning(vm, title, message)
              }
            }
          } else {
            const title = errorRes.data.message
            const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
            httpManagerPrivate.notifyWarning(vm, title, message)
          }
        },
        403: function () {
          if (errorRes.data.message === 'ExpiredToken') {
            vm.openSessionTimeoutDialog()
          } else {
            const title = errorRes.data.message
            const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
            httpManagerPrivate.nofifyWarning(vm, title, message)
          }
        },
        440: function () {
          vm.openSessionTimeoutDialog()
        }
      }

      if (httpErrorCodeListForAPI.indexOf(errorCode) === -1) {
        const title = 'Unexpected Error'
        const message = '予期せぬエラーが発生しました。'
        vm.openErrorDialog(title, message)
        console.error(error)
      } else {
        const openDialog = switchOpenDialogFunc[errorCode]
        openDialog()
      }
    },
    handleAWSErrorResponse(vm, error) {
      const service = 'aws'
      let errorCode = ''
      if (error.statusCode) {
        errorCode = error.statusCode
      }

      const switchOpenDialogFunc = {
        400: function () {
          // AWS API ではHttpStatusCode400でNot Authorized Exceptionが返ってくるため、
          // まず第一にstatus400のハンドラにて認証切れを検証する。
          if (httpManagerPrivate.isTokenExpired()) {
            vm.openSessionTimeoutDialog()
          } else {
            const title = error.code
            let message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
            // InvalidParameterExceptionの場合
            if (title === 'InvalidParameterException') {
              message = message.replace('__message__', error.message)
            }
            httpManagerPrivate.notifyWarning(vm, title, message)
          }
        },
        403: function () {
          const title = error.code
          const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
          httpManagerPrivate.notifyWarning(vm, title, message)
        },
        404: function () {
          const title = error.code
          const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
          httpManagerPrivate.notifyWarning(vm, title, message)
        },
        409: function () {
          const title = error.code
          const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
          httpManagerPrivate.notifyWarning(vm, title, message)
        },
        500: function () {
          const title = error.code
          const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
          httpManagerPrivate.notifyWarning(vm, title, message)
        },
        503: function () {
          const title = error.code
          const message = httpManagerPrivate.getTranslatedMessage(service, title, errorMessageLang)
          httpManagerPrivate.notifyWarning(vm, title, message)
        },
      }
      if (httpErrorCodeListForAWSAPI.indexOf(errorCode) === -1) {
        if (httpManagerPrivate.isTokenExpired()) {
          vm.openSessionTimeOutDialog()
        } else {
          const title = 'Unexpected Error'
          const message = '予期せぬエラーが発生しました。'
          vm.openErrorDialog(title, message)
        }
      } else {
        const openDialog = switchOpenDialogFunc[errorCode]
        openDialog()
      }
    },
    // Loginに利用しているSDKから返却されるエラー形式が他と異なる、
    // かつLoginしていないのでトークン検証が不要なため別でハンドラを定義
    handleLoginErrorResponse(vm, error) {
      const errorCode = error.code

      // NotAuthorizedExceptionはメッセージによって分岐する。
      // どれにも該当しなかった場合、デフォルトの'認証に失敗しました。'が返却される。
      if (httpManagerPrivate.isIncorrectUserNameOrPassword(errorCode, error.message)) {
        // ユーザ名あるいはパスワードが間違っている場合
        const message = httpManagerPrivate.getTranslatedMessage('aws', 'IncorrectUsernameOrPassword', errorMessageLang)
        httpManagerPrivate.notifyWarning(vm, errorCode, message)
        return
      }

      if (httpManagerPrivate.isUserNotExist(errorCode, error.message)) {
        // ユーザが存在しない場合
        const message = httpManagerPrivate.getTranslatedMessage('aws', 'UserNotConfirmedException', errorMessageLang)
        httpManagerPrivate.notifyWarning(vm, errorCode, message)
        return
      }

      if (errorCode === 'InvalidParameterException') {
        // InvalidParameterExceptionの場合
        let message = httpManagerPrivate.getTranslatedMessage('aws', 'InvalidParameterException', errorMessageLang)
        message = message.replace('__message__', error.message)
        httpManagerPrivate.notifyWarning(vm, errorCode, message)
        return
      }
      // errorCodeがNotAuthorizedException以外
      const message = httpManagerPrivate.getTranslatedMessage('aws', errorCode, errorMessageLang)
      httpManagerPrivate.notifyWarning(vm, errorCode, message)
    },
    refreshToken() {
      if (!httpManagerPrivate.isTokenExpired()) {
        this.$cognito.refreshCognitoToken()
          .catch(error => {
            this.handleAWSErrorResponse(this, error)
          })
      }
    }
  }
}

const httpManagerPrivate = {
  isTokenExpired() {
    const current = moment()
    const tokenExpiredTime = moment(sessionStorage.getItem(Expiration))
    return !current.isBefore(tokenExpiredTime)
  },
  getTranslatedMessage(service, exceptionCode, lang) {
    const targetException = errorMap.errors[service][exceptionCode]
    if (targetException) {
      const translatedMessage = targetException[lang]
      if (translatedMessage) {
        return translatedMessage
      } else {
        // 取得したerrorCodeに対応したデータの中に指定された言語のメッセージが存在しなかった場合
        return 'No Message Available.'
      }
    } else {
      // 取得したErrorCodeに対応したデータが存在しなかった場合
      return 'No Message Available.'
    }
  },
  isIncorrectUserNameOrPassword(errorCode, message) {
    return errorCode === 'NotAuthorizedException' && message === 'Incorrect username or password.'
  },
  isUserNotExist(errorCode, message) {
    return errorCode === 'UserNotConfirmedException' && message === 'user does not exist.'
  },
  notifyWarning(vm, title, message) {
    vm.$notify({
      title,
      message,
      type: 'warning',
      duration: 4000,
      dangeroulyUserHtmlString: true,
      // customClass: 'httpErrorNOtification'
    })
  }
}
