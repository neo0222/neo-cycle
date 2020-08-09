<template>
  <div id="app">
    <el-main>
      <router-view/>
    </el-main>
    <el-footer v-if="isFooterVisible">
        <div class="footer-internal">
          <el-button type="text" style="font-size:30px; width: 22vw; margin: 0px;" @click="selectPage('Search from Fav. List')">
            <i class="el-icon-tickets"></i>
          </el-button>
          <el-button type="text" style="font-size:30px; width: 22vw; margin: 0px;" @click="selectPage('Search Nearby Parkings')">
            <i class="el-icon-map-location"></i>
          </el-button><el-button type="text" style="font-size:30px; width: 22vw; margin: 0px;" @click="selectPage('Reserve By Image')">
            <i class="el-icon-camera"></i>
          </el-button>
          <el-popover
            placement="top"
            width="50vw"
            trigger="click">
            <el-table :data="gridData" @row-click="handleOperation">
              <el-table-column property="operation" label="Settings"></el-table-column>
            </el-table>
            <el-button slot="reference" type="text" style="font-size:30px; width: 22vw; margin: 0px;">
              <i class="el-icon-setting"></i>
            </el-button>
          </el-popover>
        </div>
    </el-footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      gridData: [{
        operation: 'logout',
      },]
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
      this.$store.commit('displayController/updateCurrentPage', { currentPage: page })
    },
    handleOperation(row) {
      const operation = row.operation
      if (operation === 'logout') {
        this.logout()
      }
    },
    logout() {
      this.$cognito.logout()
      this.$store.commit('bicycle/resetBikeInUseMessage')
      this.$store.commit('bicycle/resetReservedBikeMessage')
      this.$router.replace('/login')
    },
  },
  computed: {
    isFooterVisible() {
      return this.$route.path !== '/login'
    },
    currentPage() {
      return this.$store.getters['displayController/currentPage']
    },
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
  scrollbar-width: none;
  touch-action: manipulation;
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
