// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import ElementUI from 'element-ui'
import Cognito from './cognito/cognito'
import httpManager from './utils/http_manager'
import env from './environment/index'

import '../node_modules/element-ui/lib/theme-chalk/index.css'
// ElementUIでの言語設定、datePickerとかで適用される
import locale from 'element-ui/lib/locale/lang/ja'

Vue.use(ElementUI,{locale})
Vue.use(Cognito, env)

Vue.config.productionTip = false

Vue.mixin(httpManager)

const cognito = new Cognito()

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: h => h(App),
  components: { App },
  template: '<App/>',
  cognito,
})
