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
        cycleCount: parking.cycleList.length + '台',
        children: parking.cycleList.map((cycle) => {
          return {
            id: cycle.CycleName,
            name: cycle.CycleName,
            cycleCount: '',
            cycle: cycle,
          }
        })
      })
    }
    state.cycleListMap = {}
    payload.parkingList.forEach((parking) => {
      state.cycleListMap[parking.parkingId] = parking.cycleList
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
  recordLastCancellationAttemptedDatetime(state) {
    state.lastCancellationAttemptedDatetime = new Date()
  },
  recordCancellationAttempt(state) {
    state.isAcceptedUpdatingParkingList = false
    state.lastCancellationAttemptedDatetime = new Date()
  },
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
}


const actions = {
  async checkStatus({ commit }, payload) {
    try {
      const result = await api.checkStatus(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId')
      );
      const status = result.status
      let reservedBike
      if (status === 'RESERVED') {
        reservedBike = result.detail
      } else if (status === 'IN_USE') {
        reservedBike = result.detail
      } else {
        reservedBike =  {
          cycleName: '',
          cyclePasscode: '',
          cycleUseStartDatetime: '',
        }
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
      commit('resetTableData')
      commit('updateTableData', { parkingList: result.parkingList })
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
  async makeReservation({ commit, dispatch }, payload) {
    const loading = payload.vue.$loading(payload.vue.createFullScreenLoadingMaskOptionWithText('Processing...'))
    if (!payload.cycle) return
    try {
      commit('displayController/beginReservation', null, { root: true })
      const responseBody = await api.makeReservation(
        sessionStorage.getItem('currentUserName'),
        sessionStorage.getItem('sessionId'),
        payload.cycle
      );
      commit('updateReservedBike', { reservedBike: responseBody })
      commit('updateStatus', { status: 'RESERVED' })
      loading.close()
      commit('recordCancellationAttempt')
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
        sessionStorage.getItem('sessionId')
      );
      commit('resetReservedBike')
      commit('updateStatus', { status: 'WAITING_FOR_RESERVATION' });
      commit('releaseConstraintUpdatingParkingList')
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