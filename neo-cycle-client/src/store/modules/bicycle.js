import api from '../../api/index'

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
  }
}

const mutations = {
  updateReservedBike(state, payload) {
    state.reservedBike = payload.reservedBike
  },
  updateStatus(state, payload) {
    state.status = payload.status
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
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}