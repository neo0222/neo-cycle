<template>
  <div>
    <div class="map" ref="googleMap" />
      <template :v-if="!!this.google && !!this.map">
        <child-marker 
          v-for="(parking,i) in parkingNearbyList"
          :key="i"
          :parking="parking" 
          :google="google"
          :map="map"
        />
      </template>
  </div>
</template>

<script>
import GoogleMapsApiLoader from 'google-maps-api-loader';
import ChildMarker from './ChildMarker'

export default {
  name: 'Map',
  components: {
    ChildMarker,
  },
  props: [
    'parkingNearbyList',
  ],
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
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: false,
      },
      latitude: 0,
      longitude: 0,
      map: undefined,
      mapCenter: {
        lat: undefined,
        lng: undefined,
      }
    }
  },
  computed: {
    coord() {
      return this.map.getCenter().lat()
    }
  },
  async created() {
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
      this.map = new this.google.maps.Map(this.$refs.googleMap, this.mapConfig);
      this.map.addListener( "dragend", this.updateCenter) ;
    },
    updateCenter() {
      // TODO: implement me
      console.log(this.map.getCenter().lat());
      console.log(this.map.getCenter().lng());
    },
    success (position) {
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