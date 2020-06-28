

import Vue from 'vue'
import 'babel-polyfill'
import Vuex from 'vuex'
Vue.use(Vuex)
import bicycle from '@/store/modules/bicycle'
import displayController from '@/store/modules/display-controller'

const store = new Vuex.Store({
  modules: {
    bicycle,
    displayController,
  }
})

export default store