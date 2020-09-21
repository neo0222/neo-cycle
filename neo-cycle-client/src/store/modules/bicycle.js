import api from '../../api/index'
import env from '../../environment/index'

const retryLimitMs = env.retryLimitMs
const retryIntervalMs = env.retryIntervalMs

const state = {
  status: '',
  reservedBike: undefined,
  tableData: [],
  parkingNearbyList: [],
  currentCoordinate: {
    lat: undefined,
    lon: undefined,
  },
  isAcceptedUpdatingParkingList: true,
  lastCancellationAttemptedDatetime: undefined,
  tableDataForSorting: [],
  selectedParking: undefined,
  cycleListMap: {},
  batteryCapacityMap: {},
  reservedBikeMessage: undefined,
  BikeInUseMessage: undefined,
  detectedCycleName: undefined,
}

const getters = {
  reservedBike(state) {
    return state.reservedBike
  },
  status(state) {
    return state.status
  },
  tableData(state) {
    return state.tableData
  },
  currentCoordinate(state) {
    return state.currentCoordinate
  },
  parkingNearbyList(state) {
    return state.parkingNearbyList.map((nearbyParking) => {
      nearbyParking.cycleList = state.cycleListMap[nearbyParking.parkingId] ? state.cycleListMap[nearbyParking.parkingId] : []
      return nearbyParking
    })
  },
  isAcceptedUpdatingParkingList(state) {
    return state.isAcceptedUpdatingParkingList
  },
  lastCancellationAttemptedDatetime(state) {
    return state.lastCancellationAttemptedDatetime
  },
  tableDataForSorting(state) {
    return state.tableDataForSorting
  },
  favoriteParkingList(state) {
    return state.tableData.map((parking) => {
      return {
        parkingId: parking.id,
        parkingName: parking.name
      }
    })
  },
  selectedParking(state) {
    state.selectedParking.cycleList = state.cycleListMap[state.selectedParking.parkingId] ? state.cycleListMap[state.selectedParking.parkingId] : []
    return state.selectedParking
  },
  batteryCapacityMap(state) {
    return state.batteryCapacityMap
  },
  reservedBikeMessage(state) {
    return state.reservedBikeMessage
  },
  BikeInUseMessage(state) {
    return state.BikeInUseMessage
  },
  detectedCycleName(state) {
    return state.detectedCycleName;
  },
}

const mutations = {
  updateReservedBike(state, payload) {
    state.reservedBike = payload.reservedBike
  },
  resetReservedBike(state) {
    state.reservedBike = {
      cycleName: '',
      cyclePasscode: '',
    }
  },
  updateStatus(state, payload) {
    state.status = payload.status
  },
  updateTableData(state, payload) {
    for (const parking of payload.parkingList) {
      state.tableData.push({
        id: parking.parkingId,
        name: parking.parkingName,
        cycleCount: payload.availableBikeMap[parking.parkingId].length + '台',
        children: payload.availableBikeMap[parking.parkingId].map((cycle) => {
          return {
            id: cycle.cycleName,
            name: cycle.cycleName,
            cycleCount: '',
            batteryLevel: cycle.batteryLevel,
          }
        })
      })
    }
  },
  updateCycleList(state, payload) {
    state.cycleListMap = {}
    payload.parkingList.forEach((parking) => {
      state.cycleListMap[parking.parkingId] = payload.availableBikeMap[parking.parkingId]
    })
  },
  resetTableData(state) {
    state.tableData.length = 0
  },
  setCurrentCoordinate(state, payload) {
    state.currentCoordinate.lat = payload.lat
    state.currentCoordinate.lon = payload.lon
  },
  updateParkingNearbyList(state, payload) {
    for (const parking of payload.parkingList) {
      state.parkingNearbyList.push(parking);
    }
  },
  resetParkingNearbyList(state) {
    state.parkingNearbyList.length = 0
  },
  /* 予約が行われた時刻を記録 */
  recordBikeReservationDatetime(state) {
    state.isAcceptedUpdatingParkingList = true
    state.lastCancellationAttemptedDatetime = new Date()
  },
  /* キャンセルしようとした場合にacceptedフラグをfalseに */
  recordCancellationAttempt(state) {
    state.isAcceptedUpdatingParkingList = false
    state.lastCancellationAttemptedDatetime = new Date()
  },
  /* 予約取消をキャンセルした時に最終試行時刻を記録 */
  recordLastQuitToCancellationAttempt(state) {
    state.isAcceptedUpdatingParkingList = true
    state.lastCancellationAttemptedDatetime = new Date()
  },
  releaseConstraintUpdatingParkingList(state) {
    state.isAcceptedUpdatingParkingList = true
    state.lastCancellationAttemptedDatetime = undefined
  },
  createTableDataForSorting(state) {
    state.tableDataForSorting = state.tableData.map((parking) => {
      return {
        id: parking.id,
        parkingName: parking.name,
      }
    })
  },
  resetTableDataForSorting(state) {
    state.tableDataForSorting = []
  },
  removeParking(state, payload) {
    state.tableDataForSorting = state.tableDataForSorting.filter((parking) => {
      return parking.id !== payload.parkingId
    })
  },
  selectParking(state, payload) {
    state.selectedParking = state.parkingNearbyList.find((parking) => {
      return parking.parkingId === payload.parkingId
    })
  },
  updateBatteryCapacityMap(state, payload) {
    state.batteryCapacityMap = payload.batteryCapacityMap
  },
  updateReservedBikeMessage(state, payload) {
    const h = payload.vue.$createElement;
    state.reservedBikeMessage = payload.vue.$message({
      message: h('div', { style: 'display: flex' }, [
        h('p', { style: 'padding-left: 4vw; padding-left: 4vw; width: 60vw;' }, [
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `CycleName: ${payload.reservedBike.cycleName}`),
          h('br'),
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `Passcode: ${payload.reservedBike.cyclePasscode}`),
          h('br'),
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `ReserveLimit: ${payload.reservedBike.reserveLimit.substring(11)}`),
          h('br'),
        ]),
        h('div', { style: 'margin: auto; width: 20vw; text-align: center;' }, [
          h('el-button', {
            props: {
              type: "danger",
              plain: true,
              size: "mini",
            },
            style: 'color: #F56C6C; width: 20vw; margin-bottom: 10px;',
            nativeOn: {
              click: payload.vue.cancelReservation
            },
          }, 'cancel'),
          h('el-button', {
            props: {
              type: "info",
              plain: true,
              size: "mini",
            },
            style: 'color: #F8CC5FF; width: 20vw; margin: 0px;',
            nativeOn: {
              click: payload.vue.showReservedBikeDetailDrawer,
            },
          }, 'detail')
        ]),
      ]),
      type: 'info',
      iconClass: 'el-icon-bicycle',
      duration: 0,
      center: true,
      offset: 2,
    })
  },
  resetReservedBikeMessage(state) {
    if (state.reservedBikeMessage) state.reservedBikeMessage.close()
    state.reservedBikeMessage = undefined
  },
  updateBikeInUseMessage(state, payload) {
    const h = payload.vue.$createElement;
    state.bikeInUseMessage = payload.vue.$message({
      message: h('div', { style: 'display: flex' }, [
        h('p', { style: 'padding-left: 4vw; padding-left: 4vw' }, [
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `CycleName: ${payload.reservedBike.cycleName}`),
          h('br'),
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `Passcode: ${payload.reservedBike.cyclePasscode}`),
          h('br'),
          h('span', { style: 'color: #606266; font-family: Avenir, Helvetica, Arial, sans-serif' }, `StartDatetime: ${payload.reservedBike.cycleUseStartDatetime.substring(11)}`),
          h('br'),
        ]),
      ]),
      type: 'info',
      iconClass: 'el-icon-bicycle',
      duration: 0,
      center: true,
      offset: 2,
    })
  },
  resetBikeInUseMessage(state) {
    if (state.bikeInUseMessage) state.bikeInUseMessage.close()
    state.bikeInUseMessage = undefined
  },
  updateDetectedCycleName(state, payload) {
    state.detectedCycleName = payload.detectedCycleName;
  },
}


const actions = {
  async checkStatus({ commit, getters }, payload) {
    try {
      const result = await api.checkStatus(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        sessionStorage.getItem('aplVersion'),
      );
      const previousReservedBike = getters['reservedBike']
      const isReservationRenewed = (reservedBike, previousReservedBike) => {
        return !previousReservedBike 
          || reservedBike.cycleName !== previousReservedBike.cycleName
          && reservedBike.cyclePasscode !== previousReservedBike.cyclePasscode
      }
      const status = result.status
      let reservedBike
      if (status === 'RESERVED') {
        reservedBike = result.detail
        if (isReservationRenewed(reservedBike, previousReservedBike)) {
          commit('resetReservedBikeMessage')
          commit('resetBikeInUseMessage')
          commit('updateReservedBikeMessage', { reservedBike, vue: payload.vue})
        }
      } else if (status === 'IN_USE') {
        reservedBike = result.detail
        if (isReservationRenewed(reservedBike, previousReservedBike)) {
          commit('resetReservedBikeMessage')
          commit('resetBikeInUseMessage')
          commit('updateBikeInUseMessage', { reservedBike, vue: payload.vue})
        }
      } else {
        reservedBike =  {
          cycleName: '',
          cyclePasscode: '',
          cycleUseStartDatetime: '',
        }
        if (getters['reservedBikeMessage']) commit('resetReservedBikeMessage')
        if (getters['bikeInUseMessage']) commit('resetBikeInUseMessage')
      }
      commit('updateReservedBike', { reservedBike })
      commit('updateStatus', { status })
    }
    catch (error) {
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async retrieveParkingList({ commit, getters, dispatch }, payload) {
    // 何らかの理由で更新が許可されていない場合は一旦抜ける
    if (!getters['isAcceptedUpdatingParkingList']) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveParkingList', payload)
    }
    // キャンセルが一定時間内に行われた形跡があれば一旦抜ける
    const now = new Date()
    if (getters['lastCancellationAttemptedDatetime'] && now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveParkingList', payload)
    }
    // もう更新してよいので制御系フラグ等をリセット
    commit('releaseConstraintUpdatingParkingList')
    try {
      const result = await api.retrieveParkingList(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId')
      );
      const result2 = await api.retrieveAvailableBikeMap(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        sessionStorage.getItem('aplVersion'),
      );
      const availableBikeMap = result2.availableBikeMap
      commit('resetTableData')
      commit('updateTableData', { parkingList: result.parkingList, availableBikeMap })
      commit('updateCycleList', { parkingList: result.parkingList, availableBikeMap })
    }
    catch (error) {
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async retrieveNearbyParkingList({ commit, getters, dispatch }, payload) {
    // 何らかの理由で更新が許可されていない場合は一旦抜ける
    if (!getters['isAcceptedUpdatingParkingList']) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveNearbyParkingList', payload)
    }
    // キャンセルが一定時間内に行われた形跡があれば一旦抜ける
    const now = new Date()
    if (getters['lastCancellationAttemptedDatetime'] && now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveNearbyParkingList', payload)
    }
    // もう更新してよいので制御系フラグ等をリセット
    commit('releaseConstraintUpdatingParkingList')
    try {
      const result = await api.retrieveNearbyParkingList(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        getters.currentCoordinate,
      );
      commit('resetParkingNearbyList')
      commit('updateParkingNearbyList', { parkingList: result.parkingList })
    }
    catch (error) {
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async retrieveAvailableBike({ commit, getters, dispatch }, payload) {
    // 何らかの理由で更新が許可されていない場合は一旦抜ける
    if (!getters['isAcceptedUpdatingParkingList']) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveAvailableBike', payload)
    }
    // キャンセルが一定時間内に行われた形跡があれば一旦抜ける
    const now = new Date()
    if (getters['lastCancellationAttemptedDatetime'] && now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return await dispatch('retrieveAvailableBike', payload)
    }
    // もう更新してよいので制御系フラグ等をリセット
    commit('releaseConstraintUpdatingParkingList')
    try {
      const result = await api.retrieveAvailableBikeMap(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        sessionStorage.getItem('aplVersion'),
      );
      const availableBikeMap = result.availableBikeMap
      commit('updateCycleList', { availableBikeMap })
    }
    catch (error) {
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async makeReservation({ commit, dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    if (!payload.cycleName) {
      loading.close()
      return
    }
    try {
      commit('displayController/beginReservation', null, { root: true })
      const responseBody = await api.makeReservation(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        payload.cycleName,
        sessionStorage.getItem('aplVersion'),
      );
      commit('updateReservedBike', { reservedBike: responseBody })
      commit('updateStatus', { status: 'RESERVED' })
      commit('updateReservedBikeMessage', { reservedBike: responseBody, vue: payload.vue })
      loading.close()
      commit('recordBikeReservationDatetime')
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async cancelReservation({ commit, dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    try {
      await api.cancelReservation(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        sessionStorage.getItem('aplVersion'),
      );
      commit('resetReservedBike')
      commit('updateStatus', { status: 'WAITING_FOR_RESERVATION' });
      commit('releaseConstraintUpdatingParkingList')
      commit('resetReservedBikeMessage')
      await dispatch('refresh', payload)
      loading.close()
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async updateFavoriteParking({ commit, getters, dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    try {
      await api.updateFavoriteParking(
        sessionStorage.getItem('currentUserName'),
        getters['tableDataForSorting'].map((parking) => {
          return {
            parkingId: parking.id,
            parkingName: parking.parkingName
          }
        })
      );
      await dispatch('refresh', payload)
      commit('resetTableDataForSorting')
      commit('displayController/unableParkingTableForSortingVisible', null, { root: true })
      loading.close()
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async registerFavoriteParking({ dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    try {
      await api.registerFavoriteParking(
        sessionStorage.getItem('currentUserName'),
        payload.parkingId,
        payload.parkingName
      );
      await dispatch('refresh', payload)
      loading.close()
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async removeFavoriteParking({ dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    try {
      await api.removeFavoriteParking(
        sessionStorage.getItem('currentUserName'),
        payload.parkingId
      );
      await dispatch('refresh', payload)
      loading.close()
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async detectCycleName({ commit, dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    try {
      const result = await api.detectBike(payload.imageBase64);
      commit('updateDetectedCycleName', { detectedCycleName: result.maybeCycleName });
      loading.close()
    }
    catch (error) {
      loading.close()
      payload.vue.handleErrorResponse(payload.vue, error)
    }
  },
  async refresh({ commit, dispatch }, payload) {
    const promises = []
    // キャンセル操作のタイミングでリロードされないのを防ぐ
    commit('releaseConstraintUpdatingParkingList')
    promises.push(dispatch('retrieveParkingList', payload));
    promises.push(dispatch('retrieveNearbyParkingList', payload));
    await Promise.all(promises)
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}