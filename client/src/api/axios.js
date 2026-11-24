import axios from 'axios';
import { isUnreachable, setReachable } from './connection';
import { socketId } from './socket';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (socketId()) config.headers['X-Socket-Id'] = socketId();
  return config;
});

api.interceptors.response.use(
  (res) => {
    setReachable(true);
    return res;
  },
  (err) => {
    if (err.code !== 'ERR_CANCELED') setReachable(!isUnreachable(err));
    return Promise.reject(err);
  }
);

export default api;
