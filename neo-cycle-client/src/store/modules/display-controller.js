import env from '../../environment/index'

const retryIntervalMs = env.retryIntervalMs

const state = {
  currentPage: '',
  isMounted: false,
  isSessionTimeOutDialogVisible: false,
  isReservationBeenProcessing: false,
  isCancellationBeenProcessing: false,
  lastCancellationAttemptedDatetime: undefined,
  isParkingTableEditable: false,
  isParkingCardVisible: false,
  isReservedBikeDetailDrawerVisible: false,
  currentPage: 'Search from Fav. List',
}

const getters = {
  isReservationBeenProcessing(state) {
    return state.isReservationBeenProcessing
  },
  isCancellationBeenProcessing(state) {
    return state.isCancellationBeenProcessing
  },
  lastCancellationAttemptedDatetime(state) {
    return state.lastCancellationAttemptedDatetime
  },
  isParkingTableEditable(state) {
    return state.isParkingTableEditable
  },
  isParkingCardVisible(state) {
    return state.isParkingCardVisible
  },
  isReservedBikeDetailDrawerVisible(state) {
    return state.isReservedBikeDetailDrawerVisible
  },
  currentPage(state) {
    return state.currentPage
  },
}
const mutations = {
  beginReservation(state) {
    state.isReservationBeenProcessing = true
  },
  terminateReservation(state) {
    state.isReservationBeenProcessing = false
  },
  setLastCancellationAttemptedDatetime(state) {
    state.lastCancellationAttemptedDatetime = new Date()
  },
  beginCancellation(state) {
    state.isCancellationBeenProcessing = true
  },
  terminateCancellation(state) {
    state.isCancellationBeenProcessing = false
  },
  enableParkingTableForSortingVisible(state) {
    state.isParkingTableEditable = true
  },
  unableParkingTableForSortingVisible(state) {
    state.isParkingTableEditable = false
  },
  enableParkingCardVisible(state) {
    state.isParkingCardVisible = true
  },
  unableParkingCardVisible(state) {
    state.isParkingCardVisible = false
  },
  enableReservedBikeDetailDrawerVisible(state) {
    state.isReservedBikeDetailDrawerVisible = true
  },
  disableReservedBikeDetailDrawerVisible(state) {
    state.isReservedBikeDetailDrawerVisible = false
  },
  updateCurrentPage(state, payload) {
    state.currentPage = payload.currentPage
  },
}

const actions = {
  async terminateProcessReservationIfNoAttemptCancellation({ commit, getters, dispatch, rootGetters }) {
    if (rootGetters['bicycle/status'] !== 'RESERVED') {
      this.$store.commit('displayController/terminateReservation')
      return;
    }
    // 直近10秒以内に取消をしようとした形跡がある場合は予約処理は10秒延長
    const now = new Date()
    if (!getters['lastCancellationAttemptedDatetime'] || now.getTime() - getters['lastCancellationAttemptedDatetime'].getTime() < 10000) {
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return dispatch('terminateProcessReservationIfNoAttemptCancellation')
      
    }
    commit('terminateReservation')
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}