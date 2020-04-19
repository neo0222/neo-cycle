<template></template>
<script>
export default {
  props: {
    google: Object,
    map: Object,
    parking: Object
  },
  data(){
    return { marker: null }
  },
  mounted(){
    const { Marker } = this.google.maps
    this.marker = new Marker({
      position: {
        lat: this.parking.lat,
        lng: this.parking.lon
      },
      map: this.map,
      label: this.parking.cycleList.length.toString(),
      title: this.parking.parkingName,
    })
    this.marker.addListener('click', this.clickEventFunc);
  },
  methods: {
    clickEventFunc() {
      console.log('clicked')
      this.$emit('showParkingCard', this.parking)
    },
  },
}
</script>