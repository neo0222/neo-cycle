<template>
  <div>
    <div class="map" ref="googleMap" />
      <template :v-if="!!this.google && !!this.map">
        <child-marker 
          v-for="(parking,i) in parkingNearbyList"
          :key="i + updatedUnixDatetime"
          :parking="parking" 
          :google="google"
          :map="map"
          @showParkingCard="showParkingCard"
        />
      </template>
    <ParkingCard
      v-if="isParkingCardVisible"
      :selectedParking="selectedParking"
      @makeReservation="makeReservation"
      @cancelReservation="cancelReservation"
      :reservedBike="reservedBike"
      :status="status"/>
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
    'parkingNearbyList',
    'reservedBike',
    'status',
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
    updateCenter() {
      navigator.geolocation.getCurrentPosition(this.successUpdate, this.error, getLocationOptions)
      this.$emit('retrieveNearbyParkingList')
    },
    success (position) {
      this.mapConfig.center.lat = position.coords.latitude;
      this.mapConfig.center.lng = position.coords.longitude;
      this.$emit('setCurrentCoordinate', position.coords.latitude, position.coords.longitude)
      this.initializeMap();
    },
    successUpdate (position) {
      this.$emit('setCurrentCoordinate', position.coords.latitude, position.coords.longitude)
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
      console.log(parking)
    },
    makeReservation(cycle) {
      this.$emit('makeReservation', cycle)
    },
    async cancelReservation(cycle) {
      await this.$emit('cancelReservation', cycle)
    },
  },
  watch: {
    'parkingNearbyList': {
      handler: function(newVal) {
        const now = new Date()
        this.updatedUnixDatetime = now.getTime()
      }
    }
  },
}
</script>

<style scoped>
.map {
  width: 96vw;
  height: 40vh;
  margin: auto;
}
</style>