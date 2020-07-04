<template>
  <div class="login">
    <h2>Log in</h2>
      <el-form>
        <el-form-item>
          <div class="input-form-wrapper">
            <el-input style="width: 440px; max-width: 70%; font-size: 16px; transform: scale(0.8);" type="text" placeholder="user ID" v-model="username"/>
          </div>
        </el-form-item>
        <el-form-item>
          <div class="input-form-wrapper">
            <el-input :show-password="true" style="width: 440px; max-width: 70%; font-size: 16px; transform: scale(0.8);" type="password" placeholder="password" v-model="password"/>
          </div>
        </el-form-item>
      </el-form>
      <el-button @click="login">Log in</el-button>
      <p v-if="isProductionLinkVisible">
        <el-link
          href="https://www.neo-cycle.com"
          type="primary">
          Click here for the production version!
        </el-link>
      </p>
    <el-dialog
      :visible.sync="isUpdatePasswordDialogShown"
      title="Update your password"
      width="640px">
      <el-form>
        <el-form-item label="New Password">
          <div class="input-form-wrapper">
            <el-input
              style="width: 440px; max-width: 70%"
              type="password"
              placeholder="password"
              v-model="newPassword"
              :show-password="true"/>
          </div>
        </el-form-item>
      </el-form>
      <el-button
        @click="updatePassword"
        :disabled="isUpdatePasswordButtonDisabled">Update</el-button>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api/index'

export default {
  name: 'Login',
  data () {
    return {
      username: '',
      password: '',
      newPassword: '',
      isUpdatePasswordDialogShown: false
    }
  },
  computed: {
    isUpdatePasswordButtonDisabled() {
      return this.newPassword === ''
    },
    isProductionLinkVisible() {
      return process.env.NODE_ENV === 'dev'
    }
  },
  methods: {
    async login () {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Please wait...'))
      try {
        const session = await this.$cognito.login(this.username, this.password, true)
        if (session.status === 'PASSWORD_REQUIRED') {
          loading.close()
          this.openUpdatePasswordDialog()
          return
        }
        sessionStorage.setItem('sessionId', session.getIdToken().payload.sessionId)
        sessionStorage.setItem('aplVersion', session.getIdToken().payload.aplVersion)
        
        loading.close()
        this.$router.replace('/')
      }
      catch(error) {
        // 1回目のSRPログインで失敗
        if (error.code !== 'UserNotFoundException') {
          this.handleLoginErrorResponse(this, error)
          loading.close()
          return
        }
        // 平文パスワードログインを試す
        try {
          await this.$cognito.login(this.username, this.password, false)
          // これが成功するのは初回ログインかつ認証情報が正しかった場合のみ
          const session = await this.$cognito.login(this.username, this.password, true)
          if (session.status === 'PASSWORD_REQUIRED') {
            loading.close()
            this.openUpdatePasswordDialog()
            return
          }
          sessionStorage.setItem('sessionId', session.getIdToken().payload.sessionId)
          sessionStorage.setItem('aplVersion', session.getIdToken().payload.aplVersion)
          loading.close()
          this.$router.replace('/')
        }
        catch (error) {
          // 2回目のエラーはhandle
          this.handleLoginErrorResponse(this, error)
        }
      }
      loading.close()
    },
    async openUpdatePasswordDialog() {
      this.isUpdatePasswordDialogShown = true
      await new Promise((resolve) => setTimeout(resolve, 1))
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
    async updatePassword() {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Updating password...'))
      const params = {
        password: this.newPassword
      }
      try {
        const result = await this.$cognito.updatePassword(params)
        this.closeUpdatePasswordDialog()
        loading.close()
        this.$router.replace('/')
      }
      catch (error) {
        loading.close()
        this.handleLoginErrorResponse(this, error)
      }
    },
    closeUpdatePasswordDialog() {
      this.isUpdatePasswordDialogShown = false
      this.username = ''
      this.password = ''
      this.newPassword = ''
    },
    
  }
}
</script>

<style scoped>

.login {
  width: 95vw;
  padding-top: 60px;
}

</style>