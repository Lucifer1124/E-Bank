import axios from 'axios';

const baseURL =
  window.location.hostname === 'localhost'
    ? '/api'
    : 'https://e-bank-backend-ch9a.onrender.com/api';

const API = axios.create({
  baseURL
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;