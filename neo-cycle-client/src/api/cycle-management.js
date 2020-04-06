const axios = require('axios');
import env from '../environment/index'
const url = 'https://bmamuk9hjf.execute-api.ap-northeast-1.amazonaws.com/prod';

export async function retrieveParkingList() {
  const res = await axios.post(url + '/parkings');
  return res.data.body
}

export async function checkStatus() {
  const res = await axios.post(url + '/status');
  return res.data.body
}

export async function makeReservation(cycle) {
  const res = await axios.post(url + '/reservation', cycle);
  return res.data.body
}

export async function cancelReservation() {
  const res = await axios.post(url + '/cancellation');
  return res.data.body
}