

import 'babel-polyfill'
import Vuex from 'Vuex'
Vue.use(Vuex)
import bicycle from '@/store/modules/bicycle'

const store = new Vuex.Store({
  modules: {
    bicycle,
  }
})

export default store