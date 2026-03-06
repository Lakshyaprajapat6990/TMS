import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// For development, proxy is handled by Vite
// For production, use the same-origin API
export default api;
