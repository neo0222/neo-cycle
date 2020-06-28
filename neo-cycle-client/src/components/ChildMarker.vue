<template></template>
<script>
const markerGrey = require('../assets/marker_grey.png')
const markerWhite = require('../assets/marker_white.png')
const markerOrange = require('../assets/marker_orange.png')
export default {
  props: {
    google: Object,
    map: Object,
    parking: Object,
    isParkingFavorite: Boolean,
  },
  data(){
    return { marker: null }
  },
  mounted(){
    const { Marker, Size, Point } = this.google.maps
    this.marker = new Marker({
      position: {
        lat: this.parking.lat,
        lng: this.parking.lon
      },
      map: this.map,
      label: {
        text: this.isParkingFavorite ? this.parking.cycleList.length.toString() : ' ',
        fontSize: '14px',
      },
      title: this.parking.parkingName,
      icon: {
        url: this.determineMarkerUrl(this.parking.cycleList.length),
        scaledSize: new Size(22, 32),
        labelOrigin: new Point(11, 12)
      },
    })
    this.marker.addListener('click', this.clickEventFunc);
  },
  methods: {
    clickEventFunc() {
      this.showParkingCard(this.parking)
    },
    determineMarkerUrl(cycleCount) {
      if (cycleCount === 0) return markerGrey
      else if (!this.isParkingFavorite) return markerWhite
      else return markerOrange
    },
    showParkingCard(parking) {
      this.$store.commit('displayController/enableParkingCardVisible')
      this.$store.commit('bicycle/selectParking', { parkingId: parking.parkingId })
    },
  },
  destroyed() {
    this.marker.setMap(null)
  }
}
</script>