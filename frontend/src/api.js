import axios from 'axios';

const baseURL = process.env.REACT_APP_API_BASE_URL || '/api';

const API = axios.create({
  baseURL
});




API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
