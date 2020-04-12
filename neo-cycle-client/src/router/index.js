import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import Login from '@/components/Login'
import Signup from '@/components/Signup'
import Confirm from '@/components/Confirm'
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
    },
    {
      path: '/signup',
      name: 'Signup',
      component: Signup
    },
    {
      path: '/confirm',
      name: 'Confirm',
      component: Confirm
    },
  ]
})
