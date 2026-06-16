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
  remove: (id) => request.delete(`/exhibitions/${id}`).then(r => r.data),
  getVisitorGroups: (id) => request.get(`/exhibitions/${id}/visitor-groups`).then(r => r.data),
  addVisitorGroup: (id, data) => request.post(`/exhibitions/${id}/visitor-groups`, data).then(r => r.data),
  updateVisitorGroup: (id, groupId, data) => request.put(`/exhibitions/${id}/visitor-groups/${groupId}`, data).then(r => r.data),
  removeVisitorGroup: (id, groupId) => request.delete(`/exhibitions/${id}/visitor-groups/${groupId}`).then(r => r.data),
  getUpcomingAnniversaries: (days) => request.get('/exhibitions/anniversaries/upcoming', { params: { days } }).then(r => r.data),
  sendAnniversaryRemind: (id) => request.post(`/exhibitions/${id}/anniversary-remind`).then(r => r.data),
  revisit: (id) => request.post(`/exhibitions/${id}/revisit`).then(r => r.data)
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
  remove: (id) => request.delete(`/timelines/${id}`).then(r => r.data),
  batchReorder: (orders) => request.post('/timelines/batch/reorder', { orders }).then(r => r.data),
  batchMerge: (nodeIds, title, eventDate) => request.post('/timelines/batch/merge', { nodeIds, title, eventDate }).then(r => r.data),
  split: (id, splitMaterialGroups) => request.post(`/timelines/${id}/split`, { splitMaterialGroups }).then(r => r.data)
};

export const messageApi = {
  list: (exhibitionId, visitorGroupId, visitorSessionId, isAdmin) => request.get('/messages', { params: { exhibitionId, visitorGroupId, visitorSessionId, isAdmin } }).then(r => r.data),
  create: (data) => request.post('/messages', data).then(r => r.data),
  update: (id, data) => request.put(`/messages/${id}`, data).then(r => r.data),
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

export const appointmentApi = {
  list: (params) => request.get('/appointments', { params }).then(r => r.data),
  get: (id) => request.get(`/appointments/${id}`).then(r => r.data),
  create: (data) => request.post('/appointments', data).then(r => r.data),
  update: (id, data) => request.put(`/appointments/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/appointments/${id}`).then(r => r.data),
  confirm: (id) => request.post(`/appointments/${id}/confirm`).then(r => r.data),
  cancel: (id) => request.post(`/appointments/${id}/cancel`).then(r => r.data),
  complete: (id) => request.post(`/appointments/${id}/complete`).then(r => r.data),
  noShow: (id) => request.post(`/appointments/${id}/no-show`).then(r => r.data),
  getStats: (params) => request.get('/appointments/stats/summary', { params }).then(r => r.data)
};

export const timeSlotApi = {
  list: (params) => request.get('/time-slots', { params }).then(r => r.data),
  get: (id) => request.get(`/time-slots/${id}`).then(r => r.data),
  create: (data) => request.post('/time-slots', data).then(r => r.data),
  createBatch: (data) => request.post('/time-slots/batch', data).then(r => r.data),
  update: (id, data) => request.put(`/time-slots/${id}`, data).then(r => r.data),
  toggle: (id) => request.post(`/time-slots/${id}/toggle`).then(r => r.data),
  remove: (id) => request.delete(`/time-slots/${id}`).then(r => r.data),
  cleanupExpired: () => request.delete('/time-slots/cleanup/expired').then(r => r.data)
};

export const reminderTemplateApi = {
  list: (params) => request.get('/reminder-templates', { params }).then(r => r.data),
  get: (id) => request.get(`/reminder-templates/${id}`).then(r => r.data),
  create: (data) => request.post('/reminder-templates', data).then(r => r.data),
  update: (id, data) => request.put(`/reminder-templates/${id}`, data).then(r => r.data),
  toggle: (id) => request.post(`/reminder-templates/${id}/toggle`).then(r => r.data),
  remove: (id) => request.delete(`/reminder-templates/${id}`).then(r => r.data),
  preview: (content, variables) => request.post('/reminder-templates/preview', { content, variables }).then(r => r.data),
  send: (id, data) => request.post(`/reminder-templates/${id}/send`, data).then(r => r.data)
};

export const visitRecordApi = {
  list: (params) => request.get('/visit-records', { params }).then(r => r.data),
  get: (id) => request.get(`/visit-records/${id}`).then(r => r.data),
  checkIn: (data) => request.post('/visit-records/checkin', data).then(r => r.data),
  checkOut: (data) => request.post('/visit-records/checkout', data).then(r => r.data),
  verify: (data) => request.post('/visit-records/verify', data).then(r => r.data),
  quickEntry: (data) => request.post('/visit-records/quick-entry', data).then(r => r.data),
  getStats: (params) => request.get('/visit-records/stats/summary', { params }).then(r => r.data)
};

export const memorialRitualApi = {
  list: (exhibitionId) => request.get('/memorial-rituals', { params: { exhibitionId } }).then(r => r.data),
  get: (id) => request.get(`/memorial-rituals/${id}`).then(r => r.data),
  create: (data) => request.post('/memorial-rituals', data).then(r => r.data),
  update: (id, data) => request.put(`/memorial-rituals/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/memorial-rituals/${id}`).then(r => r.data),
  addStep: (id, data) => request.post(`/memorial-rituals/${id}/steps`, data).then(r => r.data),
  updateStep: (id, stepId, data) => request.put(`/memorial-rituals/${id}/steps/${stepId}`, data).then(r => r.data),
  removeStep: (id, stepId) => request.delete(`/memorial-rituals/${id}/steps/${stepId}`).then(r => r.data),
  reorderSteps: (id, stepOrders) => request.post(`/memorial-rituals/${id}/steps/reorder`, { stepOrders }).then(r => r.data),
  addMusic: (id, data) => request.post(`/memorial-rituals/${id}/music`, data).then(r => r.data),
  updateMusic: (id, musicId, data) => request.put(`/memorial-rituals/${id}/music/${musicId}`, data).then(r => r.data),
  removeMusic: (id, musicId) => request.delete(`/memorial-rituals/${id}/music/${musicId}`).then(r => r.data),
  reorderMusic: (id, musicOrders) => request.post(`/memorial-rituals/${id}/music/reorder`, { musicOrders }).then(r => r.data),
  listMessages: (id) => request.get(`/memorial-rituals/${id}/messages`).then(r => r.data),
  addMessage: (id, data) => request.post(`/memorial-rituals/${id}/messages`, data).then(r => r.data),
  removeMessage: (id, messageId) => request.delete(`/memorial-rituals/${id}/messages/${messageId}`).then(r => r.data),
  getPlayState: (id) => request.get(`/memorial-rituals/${id}/play-state`).then(r => r.data),
  updatePlayState: (id, data) => request.put(`/memorial-rituals/${id}/play-state`, data).then(r => r.data)
};

export const collectionApi = {
  list: (params) => request.get('/collections', { params }).then(r => r.data),
  get: (id) => request.get(`/collections/${id}`).then(r => r.data),
  getDetail: (id) => request.get(`/collections/${id}/detail`).then(r => r.data),
  create: (data) => request.post('/collections', data).then(r => r.data),
  update: (id, data) => request.put(`/collections/${id}`, data).then(r => r.data),
  remove: (id) => request.delete(`/collections/${id}`).then(r => r.data),
  addExhibition: (id, exhibitionId) => request.post(`/collections/${id}/exhibitions`, { exhibitionId }).then(r => r.data),
  removeExhibition: (id, exhibitionId) => request.delete(`/collections/${id}/exhibitions/${exhibitionId}`).then(r => r.data),
  searchMaterials: (params) => request.get('/collections/search/materials', { params }).then(r => r.data),
  getByPerson: () => request.get('/collections/aggregate/by-person').then(r => r.data),
  getByEvent: () => request.get('/collections/aggregate/by-event').then(r => r.data)
};

export const growthTrajectoryApi = {
  getStageRanges: () => request.get('/growth-trajectories/stage-ranges').then(r => r.data),
  getStages: (exhibitionId) => request.get(`/growth-trajectories/${exhibitionId}/stages`).then(r => r.data),
  getPlaylist: (exhibitionId) => request.get(`/growth-trajectories/${exhibitionId}/playlist`).then(r => r.data),
  setCover: (exhibitionId, stageKey, coverImage) =>
    request.post(`/growth-trajectories/${exhibitionId}/cover`, { stageKey, coverImage }).then(r => r.data),
  getCovers: (exhibitionId) => request.get(`/growth-trajectories/${exhibitionId}/covers`).then(r => r.data)
};

export const relicApi = {
  listCategories: () => request.get('/relics/categories').then(r => r.data),
  createCategory: (data) => request.post('/relics/categories', data).then(r => r.data),
  updateCategory: (id, data) => request.put(`/relics/categories/${id}`, data).then(r => r.data),
  removeCategory: (id) => request.delete(`/relics/categories/${id}`).then(r => r.data),

  listRelics: (params) => request.get('/relics/relics', { params }).then(r => r.data),
  getRelic: (id) => request.get(`/relics/relics/${id}`).then(r => r.data),
  createRelic: (data) => request.post('/relics/relics', data).then(r => r.data),
  updateRelic: (id, data) => request.put(`/relics/relics/${id}`, data).then(r => r.data),
  removeRelic: (id) => request.delete(`/relics/relics/${id}`).then(r => r.data),

  batchArchive: (ids, archived) => request.post('/relics/relics/batch/archive', { ids, archived }).then(r => r.data),
  batchMigrate: (ids, options) => request.post('/relics/relics/batch/migrate', { ids, ...options }).then(r => r.data),
  batchDelete: (ids) => request.post('/relics/relics/batch/delete', { ids }).then(r => r.data),

  importFromMaterial: (relicId, materialId, categoryId) =>
    request.post(`/relics/relics/${relicId}/import-from-material`, { materialId, categoryId }).then(r => r.data),

  listRules: () => request.get('/relics/rules').then(r => r.data),
  createRule: (data) => request.post('/relics/rules', data).then(r => r.data),
  updateRule: (id, data) => request.put(`/relics/rules/${id}`, data).then(r => r.data),
  removeRule: (id) => request.delete(`/relics/rules/${id}`).then(r => r.data),
  executeRule: (id) => request.post(`/relics/rules/${id}/execute`).then(r => r.data),
  executeAllRules: () => request.post('/relics/rules/execute-all').then(r => r.data),

  getStats: () => request.get('/relics/stats/summary').then(r => r.data)
};

export const opsApi = {
  getDashboard: () => request.get('/ops/dashboard').then(r => r.data),

  listMessages: (params) => request.get('/ops/messages', { params }).then(r => r.data),
  reviewMessage: (id, data) => request.put(`/ops/messages/${id}/review`, data).then(r => r.data),
  batchReviewMessages: (data) => request.post('/ops/messages/batch-review', data).then(r => r.data),

  inspectMaterials: () => request.get('/ops/materials/inspect').then(r => r.data),

  getAbnormalFiles: () => request.get('/ops/files/abnormal').then(r => r.data),
  repairFile: (data) => request.post('/ops/files/repair', data).then(r => r.data),
  uploadRepairFile: (materialId, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post(`/ops/files/upload-repair?materialId=${materialId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    }).then(r => r.data);
  },
  bindOrphanFile: (materialId, orphanUrl) =>
    request.post('/ops/files/bind-orphan', { materialId, orphanUrl }).then(r => r.data),
  cleanupOrphans: (urls) => request.post('/ops/files/orphan-cleanup', { urls }).then(r => r.data),
  getRepairLogs: (params) => request.get('/ops/repair-logs', { params }).then(r => r.data),

  listReviews: (params) => request.get('/ops/reviews', { params }).then(r => r.data),
  createReview: (data) => request.post('/ops/reviews', data).then(r => r.data),
  approveReview: (id, note) => request.put(`/ops/reviews/${id}/approve`, { note }).then(r => r.data),
  rejectReview: (id, note) => request.put(`/ops/reviews/${id}/reject`, { note }).then(r => r.data),
  generateReviews: () => request.post('/ops/reviews/generate').then(r => r.data)
};

export const characterProfileApi = {
  getMeta: () => request.get('/character-profiles/meta').then(r => r.data),
  getDashboard: () => request.get('/character-profiles/dashboard').then(r => r.data),
  getRelationshipMap: () => request.get('/character-profiles/relationship-map').then(r => r.data),

  listProfiles: (params) => request.get('/character-profiles/profiles', { params }).then(r => r.data),
  getProfile: (id) => request.get(`/character-profiles/profiles/${id}`).then(r => r.data),
  createProfile: (data) => request.post('/character-profiles/profiles', data).then(r => r.data),
  updateProfile: (id, data) => request.put(`/character-profiles/profiles/${id}`, data).then(r => r.data),
  removeProfile: (id) => request.delete(`/character-profiles/profiles/${id}`).then(r => r.data),

  addGrowth: (id, data) => request.post(`/character-profiles/profiles/${id}/growth`, data).then(r => r.data),
  updateGrowth: (id, growthId, data) => request.put(`/character-profiles/profiles/${id}/growth/${growthId}`, data).then(r => r.data),
  removeGrowth: (id, growthId) => request.delete(`/character-profiles/profiles/${id}/growth/${growthId}`).then(r => r.data),

  addRelationship: (id, data) => request.post(`/character-profiles/profiles/${id}/relationships`, data).then(r => r.data),
  updateRelationship: (id, relId, data) => request.put(`/character-profiles/profiles/${id}/relationships/${relId}`, data).then(r => r.data),
  removeRelationship: (id, relId) => request.delete(`/character-profiles/profiles/${id}/relationships/${relId}`).then(r => r.data),

  addDecision: (id, data) => request.post(`/character-profiles/profiles/${id}/decisions`, data).then(r => r.data),
  updateDecision: (id, decisionId, data) => request.put(`/character-profiles/profiles/${id}/decisions/${decisionId}`, data).then(r => r.data),
  removeDecision: (id, decisionId) => request.delete(`/character-profiles/profiles/${id}/decisions/${decisionId}`).then(r => r.data),

  listEndings: () => request.get('/character-profiles/endings').then(r => r.data),
  getEnding: (id) => request.get(`/character-profiles/endings/${id}`).then(r => r.data),
  createEnding: (data) => request.post('/character-profiles/endings', data).then(r => r.data),
  updateEnding: (id, data) => request.put(`/character-profiles/endings/${id}`, data).then(r => r.data),
  removeEnding: (id) => request.delete(`/character-profiles/endings/${id}`).then(r => r.data)
};

export default request;
