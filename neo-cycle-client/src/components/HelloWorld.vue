<template>
  <div class="hello">
    <status-card
      v-if="status !== '' && (currentPage === 'Search from Fav. List' || status !== 'WAITING_FOR_RESERVATION')"
      :headerMessage="headerMessage" 
      :favoritePort="favoritePort"
      :atagoPort="atagoPort"
      :isParkingTableEditable="isParkingTableEditable"
      @makeParkingTableEditable="makeParkingTableEditable"
      @makeParkingTableUneditable="makeParkingTableUneditable"
      @updateFavoriteParking="updateFavoriteParking"
      @cancelReservation="cancelReservation"/>
    <parking-table-for-sorting
      v-if="isParkingTableEditable && currentPage === 'Search from Fav. List'"
      :tableDataForSorting="tableDataForSorting"
      @cancelReservation="cancelReservation"
      @terminateCancellation="terminateCancellation"
      @beginCancellation="beginCancellation"
      @makeReservation="makeReservation"
      @removeParking="removeParking"/>
    <parking-table-for-reservation
      v-show="!isParkingTableEditable && currentPage === 'Search from Fav. List'"
      @cancelReservation="cancelReservation"
      @terminateCancellation="terminateCancellation"
      @beginCancellation="beginCancellation"
      @makeReservation="makeReservation"/>
    <parking-map
      v-show="currentPage !== 'Search from Fav. List'"
      @makeReservation="makeReservation"
      @cancelReservation="cancelReservation"
      @retrieveNearbyParkingList="retrieveNearbyParkingList"
      :favoriteParkingList="favoriteParkingList"
      @registerFavoriteParking="registerFavoriteParking"
      @removeFavoriteParking="removeFavoriteParking"
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
      isParkingTableEditable: false,
      tableDataForSorting: [],
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
    statusTest() {
      return this.$store.getters['display-controller/status']
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
    async makeReservation(cycle) {
      this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycle,
      })
    },
    async cancelReservation(row) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      try {
        this.$store.commit('displayController/beginReservation')
        const responseBody = await api.cancelReservation(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId')
        );
        this.reservedBike.cycleName = '';
        this.reservedBike.cyclePasscode = '';
        this.status = 'WAITING_FOR_RESERVATION';
        this.$store.commit('terminateProcessReservationIfNoAttemptCancellation')
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
    async updateFavoriteParking() {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      try {
        const responseBody = await api.updateFavoriteParking(
          sessionStorage.getItem('currentUserName'),
          this.tableDataForSorting.map((parking) => {
            return {
              parkingId: parking.id,
              parkingName: parking.parkingName
            }
          })
        );
        const promises = []
        promises.push(this.retrieveParkingList());
        promises.push(this.retrieveNearbyParkingList());
        await Promise.all(promises)
        this.isParkingTableEditable = false
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
    isRowParking(scope) {
      return scope.row.name !== ""
    },
    isRowReservedBike(scope) {
      return scope.row.name === "" && scope.row.date === this.reservedBike.cycleName
    },
    isRowVacantBike(scope) {
      return scope.row.name === "" && scope.row.date !== this.reservedBike.cycleName
    },
    beginCancellation() {
      this.$store.commit('displayController/beginCancellation')
    },
    terminateCancellation() {
      this.$store.commit('displayController/terminateCancellation')
      this.$store.commit('displayController/setLastCancellationAttemptedDatetime')
    },
    deleteCancellationHistory() {
      setTimeout(() => {
        // 取消キャンセルボタン押下10秒後に以下処理が行われる
        if (this.isCancellationBeenProcessing) {// 次の取消が動いていたら取消履歴の抹消は10秒待つ
          setTimeout(this.deleteCancellationHistory, 10000)
          return
        }
        // 取消が新たに行われた形跡がなければ消す
        this.$store.commit('terminateProcessReservationIfNoAttemptCancellation')
      }, retryIntervalMs)
    },
    rowClicked(row) {
      this.$refs.tableData.toggleRowExpansion(row);
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
    makeParkingTableEditable() {
      this.tableDataForSorting = this.tableData.map((parking) => {
        return {
          id: parking.id,
          parkingName: parking.name,
        }
      })
      this.isParkingTableEditable = true
    },
    makeParkingTableUneditable() {
      this.isParkingTableEditable = false
    },
    removeParking(parkingId) {
      this.tableDataForSorting = this.tableDataForSorting.filter((parking) => {
        return parking.id !== parkingId
      })
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
