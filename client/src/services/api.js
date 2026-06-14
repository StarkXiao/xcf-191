import axios from 'axios';

const API_BASE = '/api';

const request = axios.create({
  baseURL: API_BASE,
  timeout: 60000
});

export const exhibitionApi = {
  list: () => request.get('/exhibitions').then(r => r.data),
  get: (id) => request.get(`/exhibitions/${id}`).then(r => r.data),
  create: (data) => request.post('/exhibitions', data).then(r => r.data),
  update: (id, data) => request.put(`/exhibitions/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/exhibitions/${id}`).then(r => r.data)
};

export const materialApi = {
  list: (exhibitionId) => request.get('/materials', { params: { exhibitionId } }).then(r => r.data),
  get: (id) => request.get(`/materials/${id}`).then(r => r.data),
  create: (data) => request.post('/materials', data).then(r => r.data),
  update: (id, data) => request.put(`/materials/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/materials/${id}`).then(r => r.data)
};

export const timelineApi = {
  list: (exhibitionId) => request.get('/timelines', { params: { exhibitionId } }).then(r => r.data),
  get: (id) => request.get(`/timelines/${id}`).then(r => r.data),
  create: (data) => request.post('/timelines', data).then(r => r.data),
  update: (id, data) => request.put(`/timelines/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/timelines/${id}`).then(r => r.data)
};

export const messageApi = {
  list: (exhibitionId) => request.get('/messages', { params: { exhibitionId } }).then(r => r.data),
  create: (data) => request.post('/messages', data).then(r => r.data),
  remove: (id) => request.delete(`/messages/${id}`).then(r => r.data)
};

export const fileApi = {
  upload: (files, onProgress) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return request.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    }).then(r => r.data);
  },
  remove: (type, filename) => request.delete(`/files/${type}/${filename}`).then(r => r.data)
};

export const shareApi = {
  list: (exhibitionId) => request.get('/shares', { params: { exhibitionId } }).then(r => r.data),
  get: (id) => request.get(`/shares/${id}`).then(r => r.data),
  create: (data) => request.post('/shares', data).then(r => r.data),
  update: (id, data) => request.put(`/shares/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/shares/${id}`).then(r => r.data),
  disable: (id) => request.post(`/shares/${id}/disable`).then(r => r.data),
  enable: (id) => request.post(`/shares/${id}/enable`).then(r => r.data),
  getStats: (id) => request.get(`/shares/${id}/stats`).then(r => r.data),
  getByCode: (code) => request.get(`/shares/code/${code}`).then(r => r.data),
  verifyCode: (code, password) => request.post(`/shares/code/${code}/verify`, { password }).then(r => r.data),
  getPreview: (code) => request.get(`/shares/code/${code}/preview`).then(r => r.data)
};

export default request;
