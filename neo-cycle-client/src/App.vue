<template>
  <div id="app">
    <el-main>
      <router-view/>
    </el-main>
    <el-footer>
        <div class="footer-internal">
          <el-button type="text" style="font-size:30px; width: 29vw;">
            <i class="el-icon-tickets"></i>
          </el-button>
          <el-button type="text" style="font-size:30px; width: 29vw;">
            <i class="el-icon-map-location"></i>
          </el-button>
          <el-button type="text" style="font-size:30px; width: 29vw;">
            <i class="el-icon-setting"></i>
          </el-button>
        </div>
    </el-footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  methods: {
    isAuthenticated() {
     this.$cognito.isAuthenticated()
       .then(session => {
         this.isAuthenticated = true
       })
       .catch(session => {
         this.isAuthenticated = false
       })
    },
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.el-main {
  padding: 0px;
  display: flex;
  min-height: 100vh;
}

.el-footer {
  position: fixed;
  bottom: 0;
  background-color: #FFFFFF;
  padding: 0px;
}

.footer-internal {
  width: 96vw;
}

</style>
