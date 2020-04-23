<template>
  <div>
    <el-card>
      <div slot="header" class="clearfix">
        <span>{{ selectedParking.parkingName }}</span>
      </div>
      <div class="text item">
        <el-button
          v-if="isReservedBikeExist"
          type="danger"
          plain
          size="mini"
          style="margin: 3px"
          @click="$emit('cancelReservation')">
          {{ reservedBike.cycleName }}
        </el-button>
        <el-button
          v-for="(cycle,i) in unreservedCycleList"
          :key="i"
          :type="cycleButtonType(cycle.CycleName)"
          :disabled="isCycleButtonDisabled(cycle.CycleName)"
          plain
          size="mini"
          style="margin: 3px"
          @click="$emit('makeReservation', cycle)">
          {{ cycle.CycleName }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>
<script>
export default {
  props: [
    'selectedParking',
    'reservedBike',
    'status',
  ],
  data(){
    return {
      headerMessage: 'ポート詳細'
    }
  },
  mounted(){
    
  },
  computed: {
    unreservedCycleList() {
      return this.selectedParking.cycleList.filter((cycle) => {
        return cycle.CycleName !== this.reservedBike.cycleName
      })
    },
    isReservedBikeExist() {
      return this.selectedParking.cycleList.some((cycle) => {
        return cycle.CycleName === this.reservedBike.cycleName
      })
    }
  },
  methods: {
    cycleButtonType(cycleName) {
      if (this.status === 'RESERVED' && this.reservedBike.cycleName === cycleName) return 'danger'
      else return 'primary'
    },
    isCycleButtonDisabled(cycleName) {
      return this.status === 'RESERVED' && this.reservedBike.cycleName !== cycleName
    }
  },
  updated() {
    
  }
}
</script>

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

.el-card__body {
  padding: 0px;
}
</style>
