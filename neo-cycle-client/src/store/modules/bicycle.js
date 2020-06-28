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
  async retrieveParkingList({ commit }, payload) {
    // 予約処理中は取得しない
    if (payload.isReservationBeenProcessing) {
      setTimeout(dispatch('retrieveParkingList', payload), retryIntervalMs)
      return
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
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}