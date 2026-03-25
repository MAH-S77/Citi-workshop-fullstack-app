import axios from 'axios';

const BASE = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const individualsApi = {
  list: () => api.get('/individuals'),
  get: (id) => api.get(`/individuals/${id}`),
  create: (data) => api.post('/individuals', data),
  update: (id, data) => api.put(`/individuals/${id}`, data),
  delete: (id) => api.delete(`/individuals/${id}`),
};

export const teamsApi = {
  list: () => api.get('/teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
};

export const achievementsApi = {
  list: (params) => api.get('/achievements', { params }),
  get: (id) => api.get(`/achievements/${id}`),
  create: (data) => api.post('/achievements', data),
  update: (id, data) => api.put(`/achievements/${id}`, data),
  delete: (id) => api.delete(`/achievements/${id}`),
};

export const metadataApi = {
  list: () => api.get('/metadata'),
  get: (id) => api.get(`/metadata/${id}`),
  create: (data) => api.post('/metadata', data),
  update: (id, data) => api.put(`/metadata/${id}`, data),
  delete: (id) => api.delete(`/metadata/${id}`),
};

export default api;
