const axios = require('axios');
import env from '../environment/index'
const url = 'https://zn2vxjwu4d.execute-api.ap-northeast-1.amazonaws.com/dev';

export async function retrieveParkingList() {
  const res = await axios.post(url + '/parkings');
  return res.data
}
export async function checkStatus() {
  const res = await axios.post(url + '/status');
  return res.data
}

export async function makeReservation(cycle) {
  const res = await axios.post(url + '/reservation', cycle);
  return res.data
}

export async function cancelReservation() {
  const res = await axios.post(url + '/cancellation');
  return res.data
}

export async function createSession(memberId, password) {
  const res = await axios.post(url + '/sessions/create', { memberId, password });
  return res.data
}