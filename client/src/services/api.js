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
  list: (exhibitionId, familyAlbumId) => request.get('/timelines', { params: { exhibitionId, familyAlbumId } }).then(r => r.data),
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

export const memoryMapApi = {
  get: (exhibitionId) => request.get(`/memory-maps/${exhibitionId}`).then(r => r.data),
  update: (exhibitionId, data) => request.put(`/memory-maps/${exhibitionId}`, data).then(r => r.data),
  getMarkers: (exhibitionId, filters) => request.get(`/memory-maps/${exhibitionId}/markers`, { params: filters }).then(r => r.data),
  search: (exhibitionId, params) => request.get(`/memory-maps/${exhibitionId}/search`, { params }).then(r => r.data),
  aggregate: (exhibitionId) => request.get(`/memory-maps/${exhibitionId}/aggregate`).then(r => r.data)
};

export const familyAlbumApi = {
  list: () => request.get('/family-albums').then(r => r.data),
  get: (id) => request.get(`/family-albums/${id}`).then(r => r.data),
  create: (data) => request.post('/family-albums', data).then(r => r.data),
  update: (id, data) => request.put(`/family-albums/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/family-albums/${id}`).then(r => r.data),
  addExhibition: (id, exhibitionId) => request.post(`/family-albums/${id}/exhibitions`, { exhibitionId }).then(r => r.data),
  removeExhibition: (id, exhibitionId) => request.delete(`/family-albums/${id}/exhibitions/${exhibitionId}`).then(r => r.data),
  addMember: (id, memberId) => request.post(`/family-albums/${id}/members`, { memberId }).then(r => r.data),
  removeMember: (id, memberId) => request.delete(`/family-albums/${id}/members/${memberId}`).then(r => r.data)
};

export const familyMemberApi = {
  list: (familyAlbumId) => request.get('/family-members', { params: { familyAlbumId } }).then(r => r.data),
  get: (id) => request.get(`/family-members/${id}`).then(r => r.data),
  create: (data) => request.post('/family-members', data).then(r => r.data),
  update: (id, data) => request.put(`/family-members/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/family-members/${id}`).then(r => r.data),
  addRelation: (id, memberId, type) => request.post(`/family-members/${id}/relations`, { memberId, type }).then(r => r.data),
  removeRelation: (id, memberId) => request.delete(`/family-members/${id}/relations/${memberId}`).then(r => r.data)
};

export const backupApi = {
  listExports: () => request.get('/backup/exports').then(r => r.data),
  exportExhibition: (exhibitionId) => request.post(`/backup/export/exhibition/${exhibitionId}`).then(r => r.data),
  exportAll: () => request.post('/backup/export/all').then(r => r.data),
  downloadExport: (filename) => `${request.defaults.baseURL}/backup/exports/download/${filename}`,
  deleteExport: (filename) => request.delete(`/backup/exports/${filename}`).then(r => r.data),
  generateStatic: (exhibitionId) => request.post(`/backup/static/exhibition/${exhibitionId}`).then(r => r.data),
  analyzeBackup: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/backup/import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  executeImport: (params) => request.post('/backup/import/execute', params).then(r => r.data),
  verifyChecksums: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/backup/verify/checksums', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  }
};

export default request;
