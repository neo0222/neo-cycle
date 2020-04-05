const axios = require('axios');

const url = 'https://bmamuk9hjf.execute-api.ap-northeast-1.amazonaws.com/prod';

export async function retrieveParkingList() {
  const res = await axios.post(url + '/parkings');
  return res.data.body
}

export async function checkStatus() {
  const res = await axios.post(url + '/status');
  return res.data.body
}

export async function makeReservation() {
  const res = await axios.post(url + '/reservation');
  return res.data.body
}

export async function cancelReservation() {
  const res = await axios.post(url + '/cancellation');
  return res.data.body
}