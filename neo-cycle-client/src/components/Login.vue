<template>
  <div class="login">
    <h2>Log in</h2>
      <el-form>
        <el-form-item>
          <div class="input-form-wrapper">
            <el-input style="width: 440px; max-width: 70%" type="text" placeholder="user ID or e-mail address" v-model="username"/>
          </div>
        </el-form-item>
        <el-form-item>
          <div class="input-form-wrapper">
            <el-input :show-password="true" style="width: 440px; max-width: 70%" type="password" placeholder="password" v-model="password"/>
          </div>
        </el-form-item>
      </el-form>
      <el-button @click="login">Log in</el-button>
    <p>Don't you have an account?
      <router-link to="/signup">Create now</router-link>!!
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
    }
  },
  methods: {
    async login () {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Please wait...'))
      try {
        const res = await api.createSession(this.username, this.password)
        sessionStorage.setItem('sessionId', res.sessionId)
      }
      catch (error) {
        console.log(error)
        this.handleErrorResponse(error)
      }
      try {
        const session = await this.$cognito.login(this.username, this.password)
        console.log('end without error')
        console.log(session)
        if (session.status === 'PASSWORD_REQUIRED') {
          loading.close()
          this.openUpdatePasswordDialog()
          return
        }
        loading.close()
        this.$router.replace('/')
      }
      catch(error) {
        loading.close()
        this.handleLoginErrorResponse(this, error)
      }
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
        console.log('completed')
        this.closeUpdatePasswordDialog()
        loading.close()
        console.log('closed dialog')
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