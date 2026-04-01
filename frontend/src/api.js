import axios from 'axios';

const baseURL = '/api';

const API = axios.create({
  baseURL
});




API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
