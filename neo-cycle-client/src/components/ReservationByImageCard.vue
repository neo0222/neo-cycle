<template>
  <div>
    <el-card style="margin-bottom: 60px;">
      <div class="text item">
        <div>
          <video :v-if="isVideoVisible" ref="video" id="video" width="100%" autoplay playsinline></video>
          <canvas v-show="false" ref="canvas" id="canvas" width="500" height="500"></canvas>
        </div>
      </div>
    </el-card>
    <el-dialog
      :visible.sync="isConfirmReservationDialogVisible"
      title="Confirmation"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          Do you want to reserve bike?<br><br>
          ・CycleName: {{ detectedCycleName }}
        </span>
        <span slot="footer" class="dialog-footer">
          <el-button @click="moveFavoriteParkingListPage">Cancel</el-button>
          <el-button type="primary" @click="reserveBike">Confirm</el-button>
        </span>
    </el-dialog>
    <el-dialog
      :visible.sync="isConfirmCancelCurrentReservationAndMakeNewReservationDialogVisible"
      title="Confirmation"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          You have already reserved another bike.<br>
          Do you want to reserve new bike anyway?<br><br>
          ・current CycleName: {{ reservedBike.cycleName }}<br>
          ・new CycleName: {{ detectedCycleName }}
        </span>
        <span slot="footer" class="dialog-footer">
          <el-button @click="moveFavoriteParkingListPage">Cancel</el-button>
          <el-button type="primary" @click="cancelAndReserveBike">Confirm</el-button>
        </span>
    </el-dialog>
    <el-dialog
      :visible.sync="isSuggestCancelBikeDialogVisible"
      title="Perhaps you already reserved the same bike?"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          You tried to reserve bike you already reserved.<br>
          Please try again for another bike.<br><br>
        </span>
        <span slot="footer" class="dialog-footer">
          <el-button type="primary" @click="moveFavoriteParkingListPage">OK, got it!</el-button>
        </span>
    </el-dialog>
    <el-dialog
      :visible.sync="isSuggestReturnBikeInUseDialogVisible"
      title="Perhaps you are already using or a bike?"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          Bike you reserved is in use.<br>
          Please return it and try again.<br><br>
        </span>
        <span slot="footer" class="dialog-footer">
          <el-button type="primary" @click="moveFavoriteParkingListPage">OK, got it!</el-button>
        </span>
    </el-dialog>
    <el-dialog
      :visible.sync="isDetectionTimeoutDialogVisible"
      title="Detection Timeout"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          Bike label detection timed out.<br>
          Please try again.<br><br>
        </span>
        <span slot="footer" class="dialog-footer">
          <el-button type="primary" @click="moveFavoriteParkingListPage">OK, got it!</el-button>
        </span>
    </el-dialog>
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
      timerList: [],
      isVideoVisible: true,
      isConfirmReservationDialogVisible: false,
      isConfirmCancelCurrentReservationAndMakeNewReservationDialogVisible: false,
      isSuggestCancelBikeDialogVisible: false,
      isSuggestReturnBikeInUseDialogVisible: false,
      isDetectionTimeoutDialogVisible: false,
      isDetectionCompleted: false,
    }
  },
  async mounted(){
    setTimeout(this.openDetectionTimeoutDialog, 15000)
    this.initVideo()
    await this.capture()
  },
  computed: {
    currentPage() {
      return this.$store.getters['displayController/currentPage']
    },
    detectedCycleName() {
      return this.$store.getters['bicycle/detectedCycleName'];
    },
    status() {
      return this.$store.getters['bicycle/status']
    },
    reservedBike() {
      return this.$store.getters['bicycle/reservedBike']
    },
  },
  methods: {
    openDetectionTimeoutDialog() {
      if (this.isDetectionCompleted) return
      this.isDetectionTimeoutDialogVisible = true
      this.terminateDetection()
      this.stopStream()
      this.hideVideo()
    },
    initVideo() {
      this.video = this.$refs.video
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { exact: "environment" },
          }
        }).then(stream => {
          this.video.srcObject = stream
          video.onloadedmetadata = function(e) {
            video.play()
          }
        }).catch(error => {
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: "user",
            }
          }).then(stream => {
              this.video.srcObject = stream
              video.onloadedmetadata = function(e) {
                video.play()
              }
            })
        })
      } else {
        this.$notify({
          title: "warning",
          message: "WebCam is not supported! open this page with Safari for iOS or chrome for Android.",
          type: 'warning',
          duration: 4000,
        })
      }
    },
    async capture () {
      if (this.isDetectionTimeoutDialogVisible) {
        return
      } 
      this.canvas = this.$refs.canvas
      this.canvas.getContext('2d').drawImage(this.video, 0, 0, 500, 500)
      this.captures.push(this.canvas.toDataURL('image/png'))
      console.log(this.captures[this.captures.length - 1])
      await this.$store.dispatch('bicycle/detectCycleName', {
        vue: this,
        imageBase64: this.captures[this.captures.length - 1].split("data:image/png;base64,")[1],
      })
      if (!this.detectedCycleName) {
        this.timerList.push(setTimeout(this.capture, 300))
        return
      }
      // 予約されているdetectionを取り消し
      this.terminateDetection()
      this.stopStream()
      this.hideVideo()
      this.handleOperation()
      this.isDetectionCompleted = true
    },
    terminateDetection() {
      for (const timer of this.timerList) {
        window.clearTimeout(timer)
      }
    },
    stopStream() {
      const stream = this.video.srcObject
      stream.getTracks().forEach((track) => {
        console.log(track)
        track.stop()
      })
      this.video.srcObject = null
    },
    hideVideo() {
      this.isVideoVisible = false
    },
    handleOperation() {
      if (this.status === "WAITING_FOR_RESERVATION") {
        this.openConfirmReservationDialog()
      } else if (this.status === "RESERVED") {
        if (this.detectedCycleName === this.reservedBike.cycleName) {
          this.openSuggestCancelBikeDialog()
        } else {
          this.openConfirmCancelCurrentReservationAndMakeNewReservationDialog()
        }
      } else if (this.status === "IN_USE") {
        this.openSuggestReturnBikeInUseDialog()
      }
    },
    openConfirmReservationDialog() {
      this.isConfirmReservationDialogVisible = true
    },
    openConfirmCancelCurrentReservationAndMakeNewReservationDialog() {
      this.isConfirmCancelCurrentReservationAndMakeNewReservationDialogVisible = true
    },
    openSuggestCancelBikeDialog() {
      this.isSuggestCancelBikeDialogVisible = true
    },
    openSuggestReturnBikeInUseDialog() {
      this.isSuggestReturnBikeInUseDialogVisible = true
    },
    moveFavoriteParkingListPage() {
      this.$store.commit('displayController/updateCurrentPage', { currentPage: "Search from Fav. List" })
    },
    async reserveBike() {
      await this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycleName: this.detectedCycleName,
      });
      this.moveFavoriteParkingListPage()
    },
    async cancelAndReserveBike() {
      await this.$store.dispatch('bicycle/cancelReservation', {
        vue: this,
      });
      await this.$store.dispatch('bicycle/makeReservation', {
        vue: this,
        cycleName: this.detectedCycleName,
      });
      this.moveFavoriteParkingListPage()
    },
    createFullScreenLoadingMaskOptionWithText(text) {
      return {
        lock: true,
        text: text,
        background: 'rgba(208, 208, 208, 0.7)'
      }
    },
  },
  destroyed() {
    this.stopStream()
  },
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
