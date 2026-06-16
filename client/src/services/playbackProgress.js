const STORAGE_PREFIX = 'stardust_progress_';
const EXPIRE_DAYS = 30;
const MIN_SAVE_INTERVAL = 2000;
const MIN_PROGRESS_RATIO = 0.02;

function getKey(source, materialId) {
  return `${STORAGE_PREFIX}${source}_${materialId}`;
}

function isExpired(record) {
  if (!record.timestamp) return true;
  const daysSince = (Date.now() - record.timestamp) / (1000 * 60 * 60 * 24);
  return daysSince > EXPIRE_DAYS;
}

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function saveProgress(source, materialId, currentTime, duration) {
  if (!materialId || !source) return;
  if (duration > 0 && (currentTime / duration) < MIN_PROGRESS_RATIO) return;
  if (duration > 0 && (currentTime / duration) > 0.98) {
    removeProgress(source, materialId);
    return;
  }
  try {
    const key = getKey(source, materialId);
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    if (existing.timestamp && (Date.now() - existing.timestamp) < MIN_SAVE_INTERVAL) return;
    const record = { currentTime, duration, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(record));
  } catch (e) {}
}

export function getProgress(source, materialId) {
  if (!materialId || !source) return null;
  try {
    const key = getKey(source, materialId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (isExpired(record)) {
      localStorage.removeItem(key);
      return null;
    }
    return record;
  } catch (e) {
    return null;
  }
}

export function removeProgress(source, materialId) {
  if (!materialId || !source) return;
  try {
    localStorage.removeItem(getKey(source, materialId));
  } catch (e) {}
}

export function savePageState(source, pageId, state) {
  if (!pageId || !source) return;
  try {
    const key = `${STORAGE_PREFIX}page_${source}_${pageId}`;
    localStorage.setItem(key, JSON.stringify({ ...state, timestamp: Date.now() }));
  } catch (e) {}
}

export function getPageState(source, pageId) {
  if (!pageId || !source) return null;
  try {
    const key = `${STORAGE_PREFIX}page_${source}_${pageId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (isExpired(record)) {
      localStorage.removeItem(key);
      return null;
    }
    return record;
  } catch (e) {
    return null;
  }
}

export function removePageState(source, pageId) {
  if (!pageId || !source) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}page_${source}_${pageId}`);
  } catch (e) {}
}

export function getMediaProgressList(source, materialIds) {
  const result = {};
  for (const mid of materialIds) {
    const p = getProgress(source, mid);
    if (p) result[mid] = p;
  }
  return result;
}

export { formatTime };
