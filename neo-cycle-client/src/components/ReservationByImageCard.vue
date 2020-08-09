<template>
  <div>
    <el-card style="margin-bottom: 60px;">
      <div slot="header" class="clearfix">
        <span>{{ video }}</span>
      </div>
      <div class="text item">
        <div>
          <video v-if="true" ref="video" id="video" width="96%" autoplay></video>
          <div>
            <button color="info" id="snap" v-on:click="capture()">Snap Photo</button>
          </div>
          <canvas v-show="false" ref="canvas" id="canvas" width="500" height="500"></canvas>
          
        </div>
      </div>
    </el-card>
  </div>
</template>
<script>
export default {
  data(){
    return {
      headerMessage: 'ポート詳細',
      video: {},
      canvas: {},
      captures: [],
    }
  },
  mounted(){
    this.video = this.$refs.video
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        this.video.srcObject = stream
        this.video.play()
      })
    }
  },
  computed: {
    currentPage() {
      return this.$store.getters['displayController/currentPage']
    },
    detectedCycleName() {
      return this.$store.getters['bicycle/detectedCycleName'];
    },
  },
  methods: {
    async capture () {
      this.canvas = this.$refs.canvas
      this.canvas.getContext('2d').drawImage(this.video, 0, 0, 500, 500)
      this.captures.push(this.canvas.toDataURL('image/png'))
      console.log(this.captures[this.captures.length - 1])
      await this.$store.dispatch('bicycle/detectCycleName', {
        vue: this,
        imageBase64: this.captures[this.captures.length - 1].split("data:image/png;base64,")[1],
      })
      console.log(this.detectedCycleName);
      // TODO: handle error plz
      await this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycleName: this.detectedCycleName,
      });
      this.$store.commit('displayController/updateCurrentPage', { currentPage: "Search from Fav. List" });
    },
    cycleButtonType(cycleName) {
      if (this.status === 'RESERVED' && this.reservedBike.cycleName === cycleName) return 'danger'
      else return 'primary'
    },
    isCycleButtonDisabled(cycleName) {
      return this.status === 'RESERVED' && this.reservedBike.cycleName !== cycleName
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
