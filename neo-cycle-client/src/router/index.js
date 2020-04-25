import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import Login from '@/components/Login'
import Cognito from '@/cognito/cognito'

Vue.use(Router)
const cognito = new Cognito()

const requireAuth =  (to, from, next) => {
  cognito.isAuthenticated()
    .then((result) => {
      next()
    })
    .catch(error => {
      console.log(error)
      next({
        path: '/login',
      })
    })
}

export default new Router({
  routes: [
    {
      path: '/',
      name: 'HelloWorld',
      component: HelloWorld,
      beforeEnter: requireAuth
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    }
  ]
})
