require('dotenv').config();

module.exports = {
  NODE_ENV: '"dev"',
  VUE_APP_GOOGLE_API_KEY: JSON.stringify(process.env.VUE_APP_GOOGLE_API_KEY)
}