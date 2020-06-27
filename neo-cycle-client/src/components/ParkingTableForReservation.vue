<template>
  <el-table
    :data="tableData"
    ref="tableData"
    :cell-style="{padding: '0', height: '40px'}"
    style="width: 100%;margin-bottom: 60px;"
    row-key="id"
    @row-click="rowClicked"
    border>
    <el-table-column
      prop="name"
      label="Name"
      width="282"
      header-align="left">
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
          @onConfirm="$emit('cancelReservation')"
          @onCancel="$emit('terminateCancellation')">
          <el-button
            slot="reference"
            type="danger"
            plain
            size="mini"
            @click="$emit('beginCancellation')">
            取消
          </el-button>
        </el-popconfirm>
        <el-button
          v-if="isRowVacantBike(scope)"
          :disabled="status !== 'WAITING_FOR_RESERVATION'"
          @click="$emit('makeReservation', scope.row.cycle)"
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
  props: [
    'tableData',
    'reservedBike',
    'status',
  ],
  methods: {
    rowClicked(row) {
      this.$refs.tableData.toggleRowExpansion(row);
    },
    isRowParking(scope) {
      return scope.row.cycleCount !== ""
    },
    isRowReservedBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name === this.reservedBike.name
    },
    isRowVacantBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name !== this.reservedBike.name
    },
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
