const state = {
  isParkingTableEditable: false,
  currentPage: '',
  isMounted: false,
  isSessionTimeOutDialogVisible: false,
  isReservationBeenProcessing: false,
}

const getters = {
  isReservationBeenProcessing(state) {
    return state.isReservationBeenProcessing
  }
}
const mutations = {
  beginReservation(state) {
    state.isReservationBeenProcessing = true
  },
  terminateReservation(state) {
    state.isReservationBeenProcessing = false
  }
}

const actions = {
  updateFavoriteParking() {
    
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}