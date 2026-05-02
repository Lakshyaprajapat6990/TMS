import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tms_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // When superadmin is viewing a specific user's data, inject userId param
  const viewingAs = localStorage.getItem('tms_viewing_as');
  if (viewingAs) {
    const { _id } = JSON.parse(viewingAs);
    const separator = config.url.includes('?') ? '&' : '?';
    config.url = `${config.url}${separator}userId=${_id}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tms_token');
      localStorage.removeItem('tms_user');
      localStorage.removeItem('tms_viewing_as');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
