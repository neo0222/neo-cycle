<template>
  <div class="hello">
    <div style="margin-bottom: 12px">
      <el-radio-group v-model="radio4" size="mini" fill="#67C23A">
        <el-radio-button label="Search from Fav. List"></el-radio-button>
        <el-radio-button label="Search Nearby Parkings"></el-radio-button>
      </el-radio-group>
    </div>
    <status-card
      v-show="status !== '' && (radio4 === 'Search from Fav. List' || status !== 'WAITING_FOR_RESERVATION')"
      :headerMessage="headerMessage" 
      :status="status"
      :reservedBike="reservedBike"
      :favoritePort="favoritePort"
      :atagoPort="atagoPort"
      :isParkingTableEditable="isParkingTableEditable"
      @makeParkingTableEditable="makeParkingTableEditable"
      @makeParkingTableUneditable="makeParkingTableUneditable"
      @updateFavoriteParking="updateFavoriteParking"
      @cancelReservation="cancelReservation"/>
    <parking-table-for-sorting
      v-if="isParkingTableEditable && radio4 === 'Search from Fav. List'"
      :tableData="tableData"
      :tableDataForSorting="tableDataForSorting"
      :reservedBike="reservedBike"
      :status="status"
      @cancelReservation="cancelReservation"
      @terminateCancellation="terminateCancellation"
      @beginCancellation="beginCancellation"
      @makeReservation="makeReservation"
      @removeParking="removeParking"/>
    <parking-table-for-reservation
      v-show="!isParkingTableEditable && radio4 === 'Search from Fav. List'"
      :tableData="tableData"
      :reservedBike="reservedBike"
      :status="status"
      @cancelReservation="cancelReservation"
      @terminateCancellation="terminateCancellation"
      @beginCancellation="beginCancellation"
      @makeReservation="makeReservation"/>
    <parking-map
      v-show="radio4 !== 'Search from Fav. List'"
      :parkingNearbyList="parkingNearbyList"
      @makeReservation="makeReservation"
      @cancelReservation="cancelReservation"
      :reservedBike="reservedBike"
      :status="status"
      @setCurrentCoordinate="setCurrentCoordinate"
      @retrieveNearbyParkingList="retrieveNearbyParkingList"
      :favoriteParkingList="favoriteParkingList"
      @registerFavoriteParking="registerFavoriteParking"
      @removeFavoriteParking="removeFavoriteParking"
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

import StatusCard from './StatusCard'
import ParkingTableForReservation from './ParkingTableForReservation'
import ParkingMap from './ParkingMap'
import ParkingTableForSorting from './ParkingTableForSorting'

const getLocationOptions = {
  enableHighAccuracy: false,
  timeout: 60000,
  maximumAge: 0
}

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
      status: '',
      tableData: [],
      reservedBike: {
        cycleName: '',
        cyclePasscode: '',
        cycleUseStartDatetime: ','
      },
      isReservationBeenProcessing: false,
      isCancellationBeenProcessing: false,
      isSessionTimeOutDialogVisible: false,
      lastCancellationAttemptedDatetime: undefined,
      radio4: 'Search Nearby Parkings',
      parkingNearbyList: [],
      currentCoordinate: {
        lat: undefined,
        lon: undefined,
      },
      isParkingTableEditable: false,
      tableDataForSorting: [],
      timer: {
        checkStatusTimerId: undefined,
        retrieveParkingListTimerId: undefined,
        retrieveNearbyParkingListTimerId: undefined,
      }
    }
  },
  async mounted() {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, getLocationOptions)
    })
    this.success(position)
    console.log(this.currentCoordinate)
    const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Laoding...'))
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
    // this.checkStatusWithRetry()
    // this.retrieveParkingListWithRetry()
    // this.retrieveNearbyParkingListWithRetry()
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
    }
  },
  methods: {
    success (position) {
      this.setCurrentCoordinate(position.coords.latitude, position.coords.longitude)
    },
    async checkStatusWithRetry() {
      await this.checkStatus()
      this.timer.checkStatusTimerId = setTimeout(this.checkStatusWithRetry, 10000)
    },
    async checkStatus() {
      try {
        const result = await api.checkStatus(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId')
        );
        this.status = result.status;
        if (this.status === 'RESERVED') {
          this.reservedBike.cycleName = result.detail.cycleName
          this.reservedBike.cyclePasscode = result.detail.cyclePasscode
        } else if (this.status === 'IN_USE') {
          this.reservedBike.cycleName = result.detail.cycleName
          this.reservedBike.cyclePasscode = result.detail.cyclePasscode
          this.reservedBike.cycleUseStartDatetime = result.detail.cycleUseStartDatetime
        } else {
          this.reservedBike.cycleName = ''
          this.reservedBike.cyclePasscode = ''
          this.reservedBike.cycleUseStartDatetime = ''
        }
      }
      catch (error) {
        this.handleErrorResponse(this, error)
      }
    },
    async retrieveParkingListWithRetry() {
      await this.retrieveParkingList()
      this.timer.retrieveParkingListTimerId = setTimeout(this.retrieveParkingListWithRetry, 10000)
    },
    async retrieveParkingList() {
      // 予約処理中は取得しない
      if (this.isReservationBeenProcessing) {
        setTimeout(this.retrieveParkingList, 10000)
        return
      }
      try {
        const result = await api.retrieveParkingList(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId')
        );
        this.tableData = [];
        for (const parking of result.parkingList) {
          this.tableData.push({
            id: parking.parkingId,
            name: parking.parkingName,
            cycleCount: parking.cycleList.length + '台',
            children: parking.cycleList.map((cycle) => {
              return {
                id: cycle.CycleName,
                name: cycle.CycleName,
                cycleCount: '',
                cycle: cycle,
              }
            })
          })
        }
      }
      catch (error) {
        this.handleErrorResponse(this, error)
      }
    },
    async retrieveNearbyParkingListWithRetry() {
      await this.retrieveNearbyParkingList()
      this.timer.retrieveNearbyParkingListTimerId = setTimeout(this.retrieveNearbyParkingListWithRetry, 10000)
    },
    async retrieveNearbyParkingList() {
      // 予約処理中は取得しない
      if (this.isReservationBeenProcessing) {
        setTimeout(this.retrieveNearbyParkingList, 10000)
        return
      }
      try {
        const result = await api.retrieveNearbyParkingList(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId'),
          this.currentCoordinate
        );
        this.parkingNearbyList.length = 0;
        for (const parking of result.parkingList) {
          this.parkingNearbyList.push(parking);
        }
      }
      catch (error) {
        this.handleErrorResponse(this, error)
      }
    },
    async makeReservation(cycle) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      if (!cycle) return
      try {
        this.beginProcessReservation();
        const responseBody = await api.makeReservation(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId'),
          cycle
        );
        this.reservedBike.cycleName = responseBody.cycleName;
        this.reservedBike.cyclePasscode = responseBody.cyclePasscode;
        this.status = 'RESERVED';
        loading.close()
        this.terminateProcessReservation();
      }
      catch (error) {
        loading.close()
        this.handleErrorResponse(this, error)
      }
    },
    async cancelReservation(row) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      try {
        this.beginProcessReservation();
        const responseBody = await api.cancelReservation(
          sessionStorage.getItem('currentUserName'),
          sessionStorage.getItem('sessionId')
        );
        this.reservedBike.cycleName = '';
        this.reservedBike.cyclePasscode = '';
        this.status = 'WAITING_FOR_RESERVATION';
        this.terminateProcessReservation();
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
    beginProcessReservation() {
      this.isReservationBeenProcessing = true
    },
    terminateProcessReservation() {
      if (this.status !== 'RESERVED') {
        this.isReservationBeenProcessing = false
        return;
      }
      // 直近10秒以内に取消をしようとした形跡がある場合は予約処理は10秒延長
      const now = new Date()
      if (!this.lastCancellationAttemptedDatetime || now.getTime() - this.lastCancellationAttemptedDatetime.getTime() < 10000) {
        setTimeout(this.terminateProcessReservation, 10000)
        return
      }
      this.isReservationBeenProcessing = false
    },
    beginCancellation() {
      this.isCancellationBeenProcessing = true;
    },
    terminateCancellation() {
      this.isCancellationBeenProcessing = false;
      this.lastCancellationAttemptedDatetime = new Date();
    },
    deleteCancellationHistory() {
      setTimeout(() => {
        // 取消キャンセルボタン押下10秒後に以下処理が行われる
        if (this.isCancellationBeenProcessing) {// 次の取消が動いていたら取消履歴の抹消は10秒待つ
          setTimeout(this.deleteCancellationHistory, 10000)
          return
        }
        // 取消が新たに行われた形跡がなければ消す
        this.terminateProcessReservation()
      }, 10000)
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
    setCurrentCoordinate(lat, lon) {
      this.currentCoordinate.lat = lat
      this.currentCoordinate.lon = lon
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
    }
  },
  destroyed() {
    for (let timerId in this.timer) {
      window.clearTimeout( this.timer[timerId] )
    }
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
</style>
