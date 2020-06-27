<template>
  <div id="app">
    <el-main>
      <router-view/>
    </el-main>
    <el-footer v-if="isFooterVisible">
        <div class="footer-internal">
          <el-button type="text" style="font-size:30px; width: 29vw; margin: 0px;" @click="selectPage('Search from Fav. List')">
            <i class="el-icon-tickets"></i>
          </el-button>
          <el-button type="text" style="font-size:30px; width: 29vw; margin: 0px;" @click="selectPage('Search Nearby Parkings')">
            <i class="el-icon-map-location"></i>
          </el-button>
          <el-button type="text" style="font-size:30px; width: 29vw; margin: 0px;">
            <i class="el-icon-setting"></i>
          </el-button>
        </div>
    </el-footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      currentPage: 'Search from Fav. List'
    }
  },
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
    selectPage(page) {
      this.currentPage = page
    }
  },
  computed: {
    isFooterVisible() {
      return this.$route.path !== '/login'
    }
  },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 0px;
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
