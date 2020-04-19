'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')
require('dotenv').config();

module.exports = merge(prodEnv, {
  NODE_ENV: '"dev"',
  VUE_APP_GOOGLE_API_KEY: JSON.stringify(process.env.VUE_APP_GOOGLE_API_KEY)
})
