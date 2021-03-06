<template>
  <el-card class="box-card" :body-style="{height: '111px', margin: 'auto'}">
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
    <div >
      <el-popconfirm
        confirmButtonText='Yes'
        cancelButtonText='No, Thanks'
        icon="el-icon-question"
        iconColor="red"
        title="Are you sure to cancel reservation?"
        v-if="status === 'RESERVED'"
        @onConfirm="cancelReservation"
        @onCancel="recordLastQuitToCancellationAttempt">
        <el-button
          slot="reference"
          type="danger"
          plain>
          Cancel Reservation
        </el-button>
      </el-popconfirm>
    </div>
    <div v-if="!isParkingTableEditable" class="button">
      <el-button
        slot="reference"
        type="success"
        icon="el-icon-edit"
        :plain="false"
        :style="{width: '258.48px'}"
        v-if="status === 'WAITING_FOR_RESERVATION'"
        @click="beginEditParkingList">
        EDIT favorite parking list
      </el-button>
    </div>
    <div v-if="isParkingTableEditable" class="button">
      <el-button
        slot="reference"
        type="info"
        :plain="true"
        :style="{width: '258.48px'}"
        v-if="status === 'WAITING_FOR_RESERVATION'"
        @click="terminateEditParkingList">
        QUIT to EDIT favorite list
      </el-button>
    </div>
    <div v-if="isParkingTableEditable" class="button">
      <el-button
        slot="reference"
        type="success"
        :plain="true"
        :style="{width: '258.48px'}"
        v-if="status === 'WAITING_FOR_RESERVATION'"
        @click="updateFavoriteParking">
        CONFIRM to EDIT favorite list
      </el-button>
    </div>
    <div v-if="!isParkingTableEditable" class="button">
      <el-button
        slot="reference"
        type="info"
        icon="el-icon-setting"
        :plain="true"
        v-if="status === 'WAITING_FOR_RESERVATION'"
        :style="{width: '258.48px'}">
        user settings
      </el-button>
    </div>
  </el-card>
</template>

<script>
export default {
  props: [
    'headerMessage',
    'favoritePort',
    'atagoPort',
  ],
  computed: {
    status() {
      return this.$store.getters['bicycle/status']
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
    isParkingTableEditable() {
      return this.$store.getters['displayController/isParkingTableEditable']
    },
  },
  methods: {
    async cancelReservation() {
      await this.$store.dispatch('bicycle/cancelReservation', { vue: this })
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
    beginEditParkingList() {
      this.$store.commit('bicycle/createTableDataForSorting')
      this.$store.commit('displayController/enableParkingTableForSortingVisible')
    },
    terminateEditParkingList() {
      this.$store.commit('bicycle/resetTableDataForSorting')
      this.$store.commit('displayController/unableParkingTableForSortingVisible')
    },
    async updateFavoriteParking() {
      await this.$store.dispatch('bicycle/updateFavoriteParking', { vue: this })
    },
    openErrorDialog(title, message) {
      console.log(title, message)
    },
    recordLastQuitToCancellationAttempt() {
      this.$store.commit('bicycle/recordLastQuitToCancellationAttempt')
    },
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
</style>