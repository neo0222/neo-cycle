<template>
  <div>
    <div class="map" ref="googleMap" />
  </div>
</template>

<script>
import GoogleMapsApiLoader from 'google-maps-api-loader';

let map;

export default {
  name: 'Map',
  data() {
    return {
      google: null,
      mapConfig: {
        center: {
          lat: undefined,
          lng: undefined,
        },
        zoom: 14,
        mapTypeControlOptions: {
          mapTypeIds: [
            'roadmap'
          ]
        },
        mapTypeControl: false
      },
      latitude: 0,
      longitude: 0,
      map: undefined
    }
  },
  computed: {
    coord() {
      return this.map.getCenter()
    }
  },
  async mounted() {
    const options = {
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 0
    }
    this.google = await GoogleMapsApiLoader({
      apiKey: process.env['VUE_APP_GOOGLE_API_KEY']
    });
    navigator.geolocation.getCurrentPosition(this.success, this.error, options)
    
  },
  methods: {
    initializeMap() {
      console.log(this.mapConfig)
      this.map = new this.google.maps.Map(this.$refs.googleMap, this.mapConfig);
      console.log(this.map)
      console.log(this.map.getBounds())
    },
    success (position) {
      console.log(position)
      this.mapConfig.center.lat = position.coords.latitude;
      this.mapConfig.center.lng = position.coords.longitude;
      this.initializeMap();
    },
    error (error) {
      console.log(error)
      switch (error.code) {
        case 1: //PERMISSION_DENIED
          alert('位置情報の利用が許可されていません')
          break
        case 2: //POSITION_UNAVAILABLE
          alert('現在位置が取得できませんでした')
          break
        case 3: //TIMEOUT
          alert('タイムアウトになりました')
          break
        default:
          alert('現在位置が取得できませんでした')
          break
      }
    },
  }
}
</script>

<style scoped>
.map {
  width: 96vw;
  height: 65vh;
  margin: auto;
}
</style>