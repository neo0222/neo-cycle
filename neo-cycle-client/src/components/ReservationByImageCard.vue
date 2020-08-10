<template>
  <div>
    <el-card :style="cardStyle">
      <div class="text item">
        <div>
          <video :v-if="isVideoVisible" ref="video" id="video" width="100%" autoplay playsinline></video>
          <canvas v-show="false" ref="canvas" id="canvas" width="500" height="500"></canvas>
        </div>
      </div>
      <div>
        <el-progress
          type="circle"
          :percentage="remainingTimePercentageRemainingDelay"
          :color="countDownCircleStatus"
          :format="getRemainingTrialCount">
        </el-progress>
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
      title="Detection Limit Exceeded"
      @close="moveFavoriteParkingListPage"
      width="90%"
      center>
        <span class="dialog-body">
          Bike label detection trial exceeded the limit.<br>
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
      remainingTimePercentage: 100,
      remainingTrialCount: 5,
    }
  },
  async mounted(){
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
    cardStyle() {
      if (this.status !== 'WAITING_FOR_RESERVATION') return "margin-bottom: 60px; margin-top: 104px"
      else return "margin-bottom: 60px;"
    },
    countDownCircleStatus() {
      if (this.remainingTrialCount > 3) return "#67c23a"
      else if (this.remainingTrialCount > 1) return "#e6a23c"
      else return "#f56c6c"
    },
    remainingTimePercentageRemainingDelay() {
      return 100- ( (100 - this.remainingTimePercentage) * (1 + 1.20 * 0.01 * (this.remainingTimePercentage) ) ) 
      // return 100- ( (100 - this.remainingTimePercentage) )
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
      if (this.remainingTrialCount === 0) {
        this.openDetectionTimeoutDialog()
        return
      }
      this.remainingTimePercentage = 100
      this.canvas = this.$refs.canvas
      this.canvas.getContext('2d').drawImage(this.video, 0, 0, 500, 500)
      this.captures.push(this.canvas.toDataURL('image/png'))
      await this.countDown()
      await new Promise(resolve => setTimeout(resolve, 280))
      if (this.remainingTrialCount !== 1) this.remainingTimePercentage = 100
      await this.$store.dispatch('bicycle/detectCycleName', {
        vue: this,
        imageBase64: this.captures[this.captures.length - 1].split("data:image/png;base64,")[1],
      })
      if (!this.detectedCycleName) {
        this.remainingTrialCount--
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
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
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
    async countDown() {
      while (true) {
        await this.decreaseRemainingTimePercentage()
        if (this.remainingTimePercentage === 0) {
          return
        }
      }
    },
    async decreaseRemainingTimePercentage() {
      await new Promise(resolve => setTimeout(resolve, 50))
      this.remainingTimePercentage = this.remainingTimePercentage - 1
    },
    getRemainingTrialCount() {
      return this.remainingTrialCount
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
