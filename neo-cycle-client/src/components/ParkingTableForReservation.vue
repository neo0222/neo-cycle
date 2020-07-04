<template>
  <el-table
    :data="tableData"
    ref="tableData"
    :cell-style="{padding: '0', height: '40px'}"
    style="width: 100%;margin-bottom: 60px; font-size: 13.5px;"
    row-key="id"
    @row-click="rowClicked"
    border>
    <el-table-column
      label="Name"
      header-align="left">
      <template
        slot-scope="scope">
        {{scope.row.name}}
        <img v-if="!isRowParking(scope)" class="img" :src="getBatteryImageSource(scope.row.batteryLevel)" width="20"/>
      </template>
    </el-table-column>
    <el-table-column
      label="Bikes"
      width="78"
      header-align="left"
      align="center">
      <template
        slot-scope="scope">
        <p v-if="isRowParking(scope)">
          {{scope.row.cycleCount}}
        </p>
        <el-popconfirm
          confirmButtonText='Yes'
          cancelButtonText='No, Thanks'
          icon="el-icon-question"
          iconColor="red"
          title="Are you sure to cancel reservation?"
          v-if="isRowReservedBike(scope)"
          @onConfirm="cancelReservation"
          @onCancel="recordLastQuitToCancellationAttempt">
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
          @click="makeReservation(scope.row.name)"
          type="primary"
          plain
          size="mini">
          予約
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
export default {
  methods: {
    rowClicked(row) {
      this.$refs.tableData.toggleRowExpansion(row);
    },
    isRowParking(scope) {
      return scope.row.cycleCount !== ""
    },
    isRowReservedBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name === this.reservedBike.cycleName
    },
    isRowVacantBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name !== this.reservedBike.cycleName
    },
    async makeReservation(cycleName) {
      await this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycleName,
      })
    },
    async cancelReservation() {
      await this.$store.dispatch('bicycle/cancelReservation', { vue: this })
    },
    beginCancellation() {
      this.$store.commit('bicycle/recordCancellationAttempt')
    },
    recordLastQuitToCancellationAttempt() {
      this.$store.commit('bicycle/recordLastQuitToCancellationAttempt')
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
    getBatteryImageSource(batteryLevel) {
      return require(`../assets/battery-${batteryLevel ? batteryLevel : 0}.jpg`)
    },
  },
  computed: {
    status() {
      return this.$store.getters['bicycle/status']
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
    tableData() {
      return this.$store.getters['bicycle/tableData']
    },
    batteryCapacityMap() {
      return this.$store.getters['bicycle/batteryCapacityMap']
    },
  },
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

.img {
  padding-left: 12px;
}
</style>
