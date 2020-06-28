import api from '../../api/index'
import env from '../../environment/index'

const retryLimitMs = env.retryLimitMs
const retryIntervalMs = env.retryIntervalMs

const state = {
  status: '',
  reservedBike: undefined,
  tableData: [],
  parkingNearbyList: [],
  favoriteParkingList: [],
  currentCoordinate: {
    lat: undefined,
    lon: undefined,
  },
  parkingNearbyList: [],
  isAcceptedUpdatingParkingList: true,
  lastCancellationAttemptedDatetime: undefined,
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
    return state.parkingNearbyList
  },
  isAcceptedUpdatingParkingList(state) {
    return state.isAcceptedUpdatingParkingList
  },
  lastCancellationAttemptedDatetime(state) {
    return state.lastCancellationAttemptedDatetime
  }
}

const mutations = {
  updateReservedBike(state, payload) {
    state.reservedBike = payload.reservedBike
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
  recordCancellationAttempt(state) {
    state.isAcceptedUpdatingParkingList = false
    state.lastCancellationAttemptedDatetime = new Date()
  }
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
      dispatch('retrieveParkingList', payload)
    }
    // キャンセルが一定時間内に行われた形跡があれば一旦抜ける
    const now = new Date()
    if (getters['lastCancellationAttemptedDatetime'] && now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      dispatch('retrieveParkingList', payload)
    }
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
      dispatch('retrieveNearbyParkingList', payload)
    }
    // キャンセルが一定時間内に行われた形跡があれば一旦抜ける
    const now = new Date()
    if (getters['lastCancellationAttemptedDatetime'] && now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      dispatch('retrieveNearbyParkingList', payload)
    }
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
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}