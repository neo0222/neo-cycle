<template>
  <div class="hello">
    <status-card
      v-if="status !== '' && (currentPage === 'Search from Fav. List' || status !== 'WAITING_FOR_RESERVATION')"
      :headerMessage="headerMessage" 
      :favoritePort="favoritePort"
      :atagoPort="atagoPort"/>
    <parking-table-for-sorting
      v-if="isParkingTableEditable && currentPage === 'Search from Fav. List'"/>
    <parking-table-for-reservation
      v-show="!isParkingTableEditable && currentPage === 'Search from Fav. List'"/>
    <parking-map
      v-show="currentPage !== 'Search from Fav. List'"
      :favoriteParkingList="favoriteParkingList"
      :isMounted="isMounted"
      />
    <el-dialog
      :visible.sync="isSessionTimeOutDialogVisible"
      title="Oops! Session expired."
      @close="closeSessionTimeOutDialog"
      width="80%">
      <el-row>
        <div class="dialog-body">
          Session expired. Please Log in again.
        </div>
      </el-row>
    </el-dialog>
  </div>
</template>

<script>
import api from '../api/index'
import env from '../environment/index'

import StatusCard from './StatusCard'
import ParkingTableForReservation from './ParkingTableForReservation'
import ParkingMap from './ParkingMap'
import ParkingTableForSorting from './ParkingTableForSorting'

const getLocationOptions = {
  enableHighAccuracy: false,
  timeout: 60000,
  maximumAge: 0
}

const retryLimitMs = env.retryLimitMs
const retryIntervalMs = env.retryIntervalMs

export default {
  name: 'HelloWorld',
  components: {
    StatusCard,
    ParkingTableForReservation,
    ParkingMap,
    ParkingTableForSorting,
  },
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      isSessionTimeOutDialogVisible: false,
      radio4: 'Search Nearby Parkings',
      timer: {
        checkStatusTimerId: undefined,
        retrieveParkingListTimerId: undefined,
        retrieveNearbyParkingListTimerId: undefined,
      },
      isMounted: false,
    }
  },
  async mounted() {
    const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Laoding...'))
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, getLocationOptions)
    })
    this.success(position)
    const promises = [];
    promises.push(this.checkStatus())
    promises.push(this.retrieveParkingList())
    try {
      await Promise.all(promises)
    }
    catch (error) {
      this.handleErrorResponse(this, error)
    }
    loading.close()
    this.isMounted = true
    this.checkStatusWithRetry()
    this.retrieveParkingListWithRetry()
    this.retrieveNearbyParkingListWithRetry()
    setTimeout(this.terminateRetry, retryLimitMs)
  },
  computed: {
    headerMessage() {
      if (this.status === 'WAITING_FOR_RESERVATION') {
        return 'Please choose a bike you want to reserve.'
      } else if (this.status === 'RESERVED') {
        return 'Your reservation was successfully accepted.'
      } else {
        return 'Your bike is in use. Enjoy your cycling!'
      }
    },
    favoritePort() {
      return this.tableData.find((parking) => {return parking.id === '10124'})
    },
    atagoPort() {
      return this.tableData.find((parking) => {return parking.id === '10077'})
    },
    isGoToOfficeButtonPlain() {
      const now =  new Date()
      if (now.getHours < 12) {
        return true
      } else {
        return false
      }
    },
    isGoHomeButtonPlain() {
      return !this.isGoToOfficeButtonPlain
    },
    favoriteParkingList() {
      return this.tableData.map((parking) => {
        return {
          parkingId: parking.id,
          parkingName: parking.name
        }
      })
    },
    isSearchNearbyParkingsButtonDisabled() {
      return this.isParkingTableEditable
    },
    currentPage() {
      return this.$parent.$parent.currentPage ? this.$parent.$parent.currentPage : 'Search from Fav. List'
    },
    status() {
      return this.$store.getters['bicycle/status']
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
    tableData() {
      return this.$store.getters['bicycle/tableData']
    },
    isReservationBeenProcessing() {
      return this.$store.getters['bicycle/isReservationBeenProcessing']
    },
    isCancellationBeenProcessing() {
      return this.$store.getters['bicycle/isCancellationBeenProcessing']
    },
    lastCancellationAttemptedDatetime() {
      return this.$store.getters['bicycle/lastCancellationAttemptedDatetime']
    },
    isParkingTableEditable() {
      return this.$store.getters['displayController/isParkingTableEditable']
    },
  },
  methods: {
    success (position) {
      this.$store.commit('bicycle/setCurrentCoordinate', { lat: position.coords.latitude, lon: position.coords.longitude })
    },
    async checkStatusWithRetry() {
      await this.checkStatus()
      this.timer.checkStatusTimerId = setTimeout(this.checkStatusWithRetry, retryIntervalMs)
    },
    async checkStatus() {
      await this.$store.dispatch('bicycle/checkStatus', { vue: this })
    },
    async retrieveParkingListWithRetry() {
      await this.retrieveParkingList()
      this.timer.retrieveParkingListTimerId = setTimeout(this.retrieveParkingListWithRetry, retryIntervalMs)
    },
    async retrieveParkingList() {
      await this.$store.dispatch('bicycle/retrieveParkingList', {
        vue: this,
        isReservationBeenProcessing: this.isReservationBeenProcessing,
      })
    },
    async retrieveNearbyParkingListWithRetry() {
      await this.retrieveNearbyParkingList()
      this.timer.retrieveNearbyParkingListTimerId = setTimeout(this.retrieveNearbyParkingListWithRetry, retryIntervalMs)
    },
    async retrieveNearbyParkingList() {
      await this.$store.dispatch('bicycle/retrieveNearbyParkingList', {
        vue: this,
        isReservationBeenProcessing: this.isReservationBeenProcessing,
      })
    },
    async registerFavoriteParking(parkingId, parkingName) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      try {
        const responseBody = await api.registerFavoriteParking(
          sessionStorage.getItem('currentUserName'),
          parkingId,
          parkingName
        );
        const promises = []
        promises.push(this.retrieveParkingList());
        promises.push(this.retrieveNearbyParkingList());
        await Promise.all(promises)
        loading.close()
      }
      catch (error) {
        loading.close()
        this.handleErrorResponse(this, error)
      }
    },
    async removeFavoriteParking(parkingId) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      try {
        const responseBody = await api.removeFavoriteParking(
          sessionStorage.getItem('currentUserName'),
          parkingId
        );
        const promises = []
        promises.push(this.retrieveParkingList());
        promises.push(this.retrieveNearbyParkingList());
        await Promise.all(promises)
        loading.close()
      }
      catch (error) {
        loading.close()
        this.handleErrorResponse(this, error)
      }
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
    openSessionTimeoutDialog() {
      // TODO: implement me.
      this.isSessionTimeOutDialogVisible = true;
    },
    openErrorDialog(title, message) {

    },
    closeSessionTimeOutDialog() {
      sessionStorage.clear();
      this.$router.replace('/login');
    },
    terminateRetry() {
      for (let timerId in this.timer) {
        window.clearTimeout( this.timer[timerId] )
      }
    },
  },
  destroyed() {
    this.terminateRetry()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

.text {
  font-size: 14px;
}

.item {
  margin-bottom: 18px;
}

.button {
  margin-top: 10px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both
}

.box-card {
  width: 100%;
}

.hello {
  width: 95vw;
}
</style>
