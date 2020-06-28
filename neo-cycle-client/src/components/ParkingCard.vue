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
          @click="cancelReservation">
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
          @click="makeReservation(cycle)">
          {{ cycle.CycleName }}
        </el-button>
        <div class="button">
          <el-button
            v-if="!isParkingFavorite"
            slot="reference"
            type="success"
            :plain="false"
            :style="{width: '258.48px'}"
            @click="registerFavoriteParking(selectedParking.parkingId, selectedParking.parkingName)">
            ADD to Favorite List
          </el-button>
          <el-button
            v-if="isParkingFavorite"
            slot="reference"
            type="info"
            :plain="true"
            :style="{width: '258.48px'}"
            @click="removeFavoriteParking(selectedParking.parkingId)">
            REMOVE from Favorite List
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>
<script>
export default {
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
    },
    isParkingFavorite() {
      return this.favoriteParkingList.some((favoriteParking) => {
        return this.selectedParking.parkingId === favoriteParking.parkingId
      })
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
    status() {
      return this.$store.getters['bicycle/status']
    },
    favoriteParkingList() {
      return this.$store.getters['bicycle/favoriteParkingList']
    },
    selectedParking() {
      return this.$store.getters['bicycle/selectedParking']
    },
  },
  methods: {
    cycleButtonType(cycleName) {
      if (this.status === 'RESERVED' && this.reservedBike.cycleName === cycleName) return 'danger'
      else return 'primary'
    },
    isCycleButtonDisabled(cycleName) {
      return this.status === 'RESERVED' && this.reservedBike.cycleName !== cycleName
    },
    async makeReservation(cycle) {
      await this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycle,
      })
    },
    async cancelReservation() {
      await this.$store.dispatch('bicycle/cancelReservation', { vue: this })
    },
    async registerFavoriteParking(parkingId, parkingName) {
      await this.$store.dispatch('bicycle/registerFavoriteParking', {
        vue: this,
        parkingId,
        parkingName,
      })
    },
    async removeFavoriteParking(parkingId) {
      await this.$store.dispatch('bicycle/removeFavoriteParking', {
        vue: this,
        parkingId,
      })
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
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
  margin-top: 20px;
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
