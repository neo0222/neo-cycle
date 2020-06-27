<template>
  <el-table
    class="sort-table"
    :data="tableDataForSorting"
    ref="tableDataForSorting"
    :cell-style="{padding: '0', height: '40px'}"
    style="width: 100%;margin-bottom: 60px;"
    row-key="id"
    border>
    <el-table-column
      prop="parkingName"
      label="Name"
      width="250"
      header-align="left">
    </el-table-column>
    <el-table-column
      label="Operation"
      width="96"
      header-align="left"
      align="center">
      <template
        slot-scope="scope">
        <el-popconfirm
          confirmButtonText='Yes'
          cancelButtonText='No, Thanks'
          icon="el-icon-question"
          iconColor="red"
          title="Are you sure to cancel reservation?"
          @onConfirm="$emit('removeParking', scope.row.id)">
          <el-button
            slot="reference"
            type="danger"
            plain
            size="mini">
            delete
          </el-button>
        </el-popconfirm>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
import Sortable from 'sortablejs'

export default {
  props: [
    'tableData',
    'reservedBike',
    'status',
    'tableDataForSorting',
  ],
  mounted() {
    document.body.ondrop = function (event) {
      event.preventDefault();
      event.stopPropagation();
    };
    this.rowDrop()
  },
  methods: {
    isRowParking(scope) {
      return scope.row.cycleCount !== ""
    },
    isRowReservedBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name === this.reservedBike.name
    },
    isRowVacantBike(scope) {
      return scope.row.cycleCount === "" && scope.row.name !== this.reservedBike.name
    },
    getRowKey(row){
      return row.parkingId
    },
    rowDrop() {
      const tbody = document.querySelector('.el-table__body-wrapper tbody')
      const _this = this
      Sortable.create(tbody, {
        delay: 200,
        onEnd({ newIndex, oldIndex }) {
          const currRow = _this.tableDataForSorting.splice(oldIndex, 1)[0]
          _this.tableDataForSorting.splice(newIndex, 0, currRow)
        }
      })
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
