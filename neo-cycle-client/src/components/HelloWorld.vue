<template>
  <div class="hello">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>{{ headerMessage }}</span>
      </div>
      <div v-show="status !== 'WAITING_FOR_RESERVATION'" class="text item">
        Cycle Name: {{ reservedBike.cycleName }}
      </div>
      <div v-show="status !== 'WAITING_FOR_RESERVATION'" class="text item">
        Passcode: {{ reservedBike.cyclePasscode }}
      </div>
      <div v-show="status === 'IN_USE'" class="text item">
        Use Start Time: {{ reservedBike.cycleUseStartDatetime }}
      </div>
      <div class="text item">
        <el-popconfirm
          confirmButtonText='Yes'
          cancelButtonText='No, Thanks'
          icon="el-icon-question"
          iconColor="red"
          title="Are you sure to cancel reservation?"
          v-if="status === 'RESERVED'"
          @onConfirm="cancelReservation()"
          @onCancel="terminateCancellation">
          <el-button
            slot="reference"
            type="danger"
            plain>
            Cancel Reservation
          </el-button>
        </el-popconfirm>
      </div>
      <div v-if="status === 'WAITING_FOR_RESERVATION'" class="text item">
        <el-button
          slot="reference"
          type="success"
          @click="makeReservation(favoritePort.children.length ? favoritePort.children[0].cycle : undefined)">
          RESERVE ANYWAY!!!
        </el-button>
      </div>
    </el-card>
    <el-table
      :data="tableData"
      :cell-style="{padding: '0', height: '40px'}"
      style="width: 100%;margin-bottom: 20px;"
      row-key="id"
      border>
      <el-table-column
        prop="date"
        label="Name"
        width="282"
        header-align="left">
      </el-table-column>
      <el-table-column
        prop="name"
        label="Bikes"
        width="78"
        header-align="left"
        align="center">
        <template
          slot-scope="scope">
          <p v-if="isRowParking(scope)">
            {{scope.row.name}}
          </p>
          <el-popconfirm
            confirmButtonText='Yes'
            cancelButtonText='No, Thanks'
            icon="el-icon-question"
            iconColor="red"
            title="Are you sure to cancel reservation?"
            v-if="isRowReservedBike(scope)"
            @onConfirm="cancelReservation()"
            @onCancel="terminateCancellation">
            <el-button
              slot="reference"
              type="danger"
              plain
              size="mini"
              @click="beginCancellation">
              取消
            </el-button>
          </el-popconfirm>
          <el-button
            v-if="isRowVacantBike(scope)"
            :disabled="status !== 'WAITING_FOR_RESERVATION'"
            @click="makeReservation(scope.row.cycle)"
            type="primary"
            plain
            size="mini">
            予約
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import api from '../api/index'

export default {
  name: 'HelloWorld',
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
      isCancellationAttempted: false,
    }
  },
  async mounted() {
    const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Laoding...'))
    await this.checkStatus();
    await this.retrieveParkingList();
    loading.close()
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
    }
  },
  methods: {
    load(tree, treeNode, resolve) {
      setTimeout(() => {
        resolve([
          {
            id: 31,
            date: '2016-05-01',
            name: 'wangxiaohu'
          }, {
            id: 32,
            date: '2016-05-01',
            name: 'wangxiaohu'
          }
        ])
      }, 1000)
    },
    async checkStatus() {
      const result = await api.checkStatus();
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
      setTimeout(this.checkStatus, 10000)
    },
    async retrieveParkingList() {
      // 予約処理中は取得しない
      if (this.isReservationBeenProcessing) {
        setTimeout(this.retrieveParkingList, 10000)
        return
      }
      const result = await api.retrieveParkingList();
      this.tableData.length = 0;
      for (const parking of result.parkingList) {
        if (!parking.parkingName) continue
        this.tableData.push({
          id: parking.parkingId,
          date: parking.parkingName,
          name: parking.cycleList.length + '台',
          children: parking.cycleList.map((cycle) => {
            return {
              id: cycle.CycleName,
              date: cycle.CycleName,
              name: '',
              cycle: cycle,
            }
          })
        })
      }
      setTimeout(this.retrieveParkingList, 10000)
    },
    async makeReservation(cycle) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      if (!cycle) return
      this.beginProcessReservation();
      const responseBody = await api.makeReservation(cycle);
      this.reservedBike.cycleName = responseBody.cycleName;
      this.reservedBike.cyclePasscode = responseBody.cyclePasscode;
      this.status = 'RESERVED';
      loading.close()
      this.terminateProcessReservation();
    },
    async cancelReservation(row) {
      const loading = this.$loading(this.createFullScreenLoadingMaskOptionWithText('Processing...'))
      this.beginProcessReservation();
      const responseBody = await api.cancelReservation();
      this.reservedBike.cycleName = '';
      this.reservedBike.cyclePasscode = '';
      this.status = 'WAITING_FOR_RESERVATION';
      loading.close()
      this.terminateProcessReservation();
      await this.retrieveParkingList();
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
      if (this.isCancellationAttempted) {
        setTimeout(this.terminateProcessReservation, 10000)
        return
      }
      setTimeout(() => {this.isReservationBeenProcessing = false}, 10000)
    },
    beginCancellation() {
      this.isCancellationBeenProcessing = true;
      this.isCancellationAttempted = true;
    },
    terminateCancellation() {
      this.isCancellationBeenProcessing = false;
    },
    deleteCancellationHistory() {
      if (this.isCancellationBeenProcessing) {// 次の取消が動いていたら取消履歴の抹消は10秒待つ
        setTimeout(this.deleteCancellationHistory, 0)
        return
      }
      // 取消が新たに行われた形跡がなければ10秒後に消す
      setTimeout(() => {this.isCancellationAttempted = false, this.terminateProcessReservation()}, 10000)
    }
  },
  watch: {
    isCancellationBeenProcessing: function(newVal) {
      if (!newVal) {
        this.deleteCancellationHistory()
      }
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
