<template>
  <div>
    <div class="map" ref="googleMap" />
      <template v-if="!!this.google && !!this.map && isMounted">
        <child-marker 
          v-for="(parking,i) in parkingNearbyList"
          :key="i + updatedUnixDatetime"
          :parking="parking" 
          :google="google"
          :map="map"
          :isParkingFavorite="isParkingFavorite(parking.parkingId)"
          @showParkingCard="showParkingCard"
        />
      </template>
    <ParkingCard
      v-if="isParkingCardVisible"
      :selectedParking="selectedParking"
      :status="status"
      :favoriteParkingList="favoriteParkingList"/>
  </div>
</template>

<script>

const getLocationOptions = {
  enableHighAccuracy: false,
  timeout: 60000,
  maximumAge: 0
}

import GoogleMapsApiLoader from 'google-maps-api-loader';
import ChildMarker from './ChildMarker'
import ParkingCard from  './ParkingCard'

export default {
  name: 'Map',
  components: {
    ChildMarker,
    ParkingCard,
  },
  props: [
    'favoriteParkingList',
    'isMounted'
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
      },
      isParkingCardVisible: false,
      selectedParkingId: undefined,
      updatedUnixDatetime: undefined,
    }
  },
  computed: {
    coord() {
      return this.map.getCenter().lat()
    },
    selectedParking() {
      return this.parkingNearbyList.find((parking) => {
        return parking.parkingId === this.selectedParkingId
      })
    },
    status() {
      return this.$store.getters['bicycle/status']
    },
    parkingNearbyList() {
      return this.$store.getters['bicycle/parkingNearbyList']
    },
    isReservationBeenProcessing() {
      return this.$store.getters['bicycle/isReservationBeenProcessing']
    },
  },
  async created() {
    this.google = await GoogleMapsApiLoader({
      apiKey: process.env['VUE_APP_GOOGLE_API_KEY']
    });
    navigator.geolocation.getCurrentPosition(this.success, this.error, getLocationOptions)
    
  },
  methods: {
    initializeMap() {
      this.map = new this.google.maps.Map(this.$refs.googleMap, this.mapConfig);
      this.map.addListener( "dragend", this.updateCenter) ;
    },
    async updateCenter() {
      this.$store.commit('bicycle/setCurrentCoordinate', { lat: this.map.getCenter().lat(), lon: this.map.getCenter().lng() })
      await this.$store.dispatch('bicycle/retrieveNearbyParkingList', {
        vue: this,
        isReservationBeenProcessing: this.isReservationBeenProcessing,
      })
    },
    async success (position) {
      this.mapConfig.center.lat = position.coords.latitude;
      this.mapConfig.center.lng = position.coords.longitude;
      this.$store.commit('bicycle/setCurrentCoordinate', { lat: position.coords.latitude, lon: position.coords.longitude })
      await this.$store.dispatch('bicycle/retrieveNearbyParkingList', {
        vue: this,
        isReservationBeenProcessing: this.isReservationBeenProcessing,
      })
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
    showParkingCard(parking) {
      this.isParkingCardVisible = true;
      this.selectedParkingId = parking.parkingId
    },
    async registerFavoriteParking(parkingId, parkingName) {
      await this.$emit('registerFavoriteParking', parkingId, parkingName)
    },
    async removeFavoriteParking(parkingId) {
      await this.$emit('removeFavoriteParking', parkingId)
    },
    isParkingFavorite(parkingId) {
      return this.favoriteParkingList.some((parking) => {
        return parking.parkingId === parkingId
      })
    },
  },
  watch: {
    'parkingNearbyList': {
      handler: function(newVal) {
        const now = new Date()
        this.updatedUnixDatetime = now.getTime()
      },
      deep: true,
    },
    'favoriteParkingList': {
      handler: function(newVal) {
        const now = new Date()
        this.updatedUnixDatetime = now.getTime()
      },
      deep: true,
    }
  },
}
</script>

<style scoped>
.map {
  width: 95vw;
  height: 40vh;
  margin: auto;
}
</style>