import env from '../../environment/index'

const retryIntervalMs = env.retryIntervalMs

const state = {
  isParkingTableEditable: false,
  currentPage: '',
  isMounted: false,
  isSessionTimeOutDialogVisible: false,
  isReservationBeenProcessing: false,
  isCancellationBeenProcessing: false,
  lastCancellationAttemptedDatetime: undefined,
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
  status(state, getters, rootState) {
    return rootState.status
  }
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
      console.log(retryIntervalMs)
      await new Promise((resolve) => {setTimeout(resolve, retryIntervalMs)})
      return dispatch('terminateProcessReservationIfNoAttemptCancellation')
      
    }
    commit('terminateReservation')
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}