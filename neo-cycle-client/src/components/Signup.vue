<template>
  <div class="signup" style="padding-bottom: 40px">
    <h2>Sign up</h2>
    <el-form label-position='top'>
      <el-form-item
        label="user ID">
        <div class="input-form-wrapper">
          <el-input style="width: 440px; max-width: 70%" type="text" placeholder="username" v-model="signUpForm.username"/>
        </div>
      </el-form-item>
      <el-form-item label='e-mail address'>
        <div class="input-form-wrapper">
          <el-input style="width: 440px; max-width: 70%" type="text" placeholder="xxxxxxxxx@yyyy.com" v-model="signUpForm.email"/>
        </div>
      </el-form-item>
      <el-form-item label='Password'>
        <div class="input-form-wrapper">
          <el-input :show-password="true" style="width: 440px; max-width: 70%" placeholder="8文字以上、半角英数" v-model="signUpForm.password" required/>
        </div>
      </el-form-item>
    </el-form>
    <el-button @click="signup">Sign up
    </el-button>
    <p>Do you have an account?
      <router-link to="/login">Sigin in now!!</router-link></p>
    <p>Did you receive verification code?
      <router-link to="/confirm">Click here!!</router-link></p>
  </div>
</template>

<script>
import api from '../api/index'

export default {
  name: 'Signup',
  data () {
    return {
      signUpForm: {
        email: '',
        username: '',
        password: ''
      }
    }
  },
  methods: {
    async signup () {
      if (!this.validateSignUpForm()) {
        this.$message({
          message: '入力が不正です。入力をご確認の上、再度お試しください。',
          type: 'error',
          offset: 76,
          showClose: true
        });
        return
      }
      try {
        await api.createSession(this.username, this.password)
      }
      catch (error) {
        this.handleErrorResponse(this, error)
      }
      try {
        await api.signup(this.signUpForm)
        this.$router.replace('/confirm')
      }
      catch (error) {
        this.handleLoginErrorResponse(this, error)
      }
    },
    validateSignUpForm() {
      return this.signUpForm.username
        && this.signUpForm.email
        && this.signUpForm.password
    }
  }
}
</script>