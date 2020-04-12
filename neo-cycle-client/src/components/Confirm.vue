<template>
  <div class="confirm">
    <h2>User Confirmation</h2>
    <el-form>
      <div class="input-form-wrapper">
        <el-form-item>
          <el-input style="width: 440px; max-width: 70%" type="text" placeholder="user ID" v-model="username"/>
        </el-form-item>
      </div>
      <div class="input-form-wrapper">
        <el-form-item>
          <el-input style="width: 440px; max-width: 70%" type="text" placeholder="confirmation code" v-model="confirmationCode"/>
        </el-form-item>
      </div>
    </el-form>
    <el-button @click="confirm">送信</el-button>
    <p>Have you created account?
      <router-link to="/login">Log in now!!</router-link></p>
  </div>
</template>

<script>
export default {
  name: 'Confirm',
  data () {
    return {
      username: '',
      confirmationCode: ''
    }
  },
  methods: {
    async confirm () {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Please wait...'))
      try {
        await this.$cognito.confirmation(this.username, this.confirmationCode)
        this.$message({
            message: 'Confirmation was successfully completed.',
            type: 'success',
            offset: 76,
            showClose: true
          });
        loading.close()
        this.$router.replace('/login')
      }
      catch (error) {
        loading.close()
        this.handleLoginErrorResponse(this, error)
      }
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
  }
}
</script>