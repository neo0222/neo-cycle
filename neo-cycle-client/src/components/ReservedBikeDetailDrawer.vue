<template>
  <el-drawer
    title="Detail: Reserved Bike"
    :visible.sync="isReservedBikeDetailDrawerVisible"
    direction="ttb"
    :before-close="handleClose">
    <div style="text-align: left; margin: 3vw;">
      <span>CycleName: {{reservedBike.cycleName}}</span><br/>
      <span>Passcode: {{reservedBike.cyclePasscode}}</span><br/>
      <span>ParkingName: {{reservedBike.parkingName}}</span><br/>
      <span>reserveLimit: {{reservedBike.reserveLimit}}</span><br/>
      <span>batteryLevel: {{reservedBike.batteryLevel}}</span><br/>
    </div>
  </el-drawer>
</template>

<script>
export default {
  name: "ReservedBikeDetailDrawer",
  data() {
    return {

    };
  },
  computed: {
    isReservedBikeDetailDrawerVisible() {
      return this.$store.getters['displayController/isReservedBikeDetailDrawerVisible']
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
  },
  methods: {
    handleClose(done) {
      this.$store.commit('displayController/disableReservedBikeDetailDrawerVisible')
      done()
    },
  },
}
</script>

<style>

</style>