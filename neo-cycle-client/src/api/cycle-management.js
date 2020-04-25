const axios = require('axios');
import env from '../environment/index'
const url = 'https://aaetl7k2qb.execute-api.ap-northeast-1.amazonaws.com/dev';

export async function retrieveParkingList(memberId, sessionId) {
  const res = await axios.post(url + '/parkings', { memberId, sessionId });
  return res.data
}
export async function checkStatus(memberId, sessionId) {
  const res = await axios.post(url + '/status', { memberId, sessionId });
  return res.data
}

export async function makeReservation(memberId, sessionId, cycle) {
  const res = await axios.post(url + '/reservation', { memberId, sessionId, cycle });
  return res.data
}

export async function cancelReservation(memberId, sessionId) {
  const res = await axios.post(url + '/cancellation', { memberId, sessionId });
  return res.data
}

export async function createSession(memberId, password) {
  const res = await axios.post(url + '/sessions/create', { memberId, password });
  return res.data
}

export async function retrieveNearbyParkingList(memberId, sessionId, coordinate) {
  const res = await axios.post(url + '/parkings/nearby', { memberId, sessionId, lat: coordinate.lat, lon: coordinate.lon });
  return res.data
}

export async function registerFavoriteParking(memberId, parkingId, parkingName) {
  const res = await axios.post(url + '/parkings/registration', { memberId, parkingId, parkingName });
  return res.data
}

export async function removeFavoriteParking(memberId, parkingId) {
  const res = await axios.post(url + '/parkings/removal', { memberId, parkingId });
  return res.data
}