require('dotenv').config();
module.exports = {
  NODE_ENV: '"prod"',
  VUE_APP_TEST: JSON.stringify(process.env.VUE_APP_TEST)
}