import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR, DATA_DIR, ensureDir } from './config.js';
import { readDB } from './storage.js';

export const EXPORT_VERSION = '1.0.0';
export const MANIFEST_FILENAME = 'manifest.json';
export const CHECKSUM_FILENAME = 'checksums.json';

export const computeFileHash = (filePath, algorithm = 'sha256') => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

export const computeBufferHash = (buffer, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
};

export const getUrlFilePath = (url) => {
  if (!url) return null;
  const prefix = '/uploads/';
  if (!url.startsWith(prefix)) return null;
  const relativePath = url.slice(prefix.length);
  const filePath = path.join(UPLOADS_DIR, relativePath);
  return fs.existsSync(filePath) ? filePath : null;
};

export const collectExhibitionData = (exhibitionId) => {
  const db = readDB();
  const exhibitions = db.exhibitions || [];
  const exhibition = exhibitions.find((e) => e.id === exhibitionId);
  if (!exhibition) return null;

  const materials = (db.materials || []).filter((m) => m.exhibitionId === exhibitionId);
  const timelines = (db.timelines || []).filter((t) => t.exhibitionId === exhibitionId);
  const messages = (db.messages || []).filter((m) => m.exhibitionId === exhibitionId);
  const memoryMap = (db.memoryMaps || []).find((m) => m.exhibitionId === exhibitionId) || null;

  const relatedFamilyAlbums = (db.familyAlbums || []).filter((a) =>
    a.exhibitionIds?.includes(exhibitionId)
  );
  const relatedMemberIds = new Set();
  relatedFamilyAlbums.forEach((a) => {
    (a.memberIds || []).forEach((mid) => relatedMemberIds.add(mid));
  });
  const relatedMembers = (db.familyMembers || []).filter((m) => relatedMemberIds.has(m.id));

  const fileUrls = new Set();
  if (exhibition.coverImage) fileUrls.add(exhibition.coverImage);
  materials.forEach((m) => {
    if (m.url) fileUrls.add(m.url);
  });
  relatedMembers.forEach((m) => {
    if (m.avatar) fileUrls.add(m.avatar);
  });

  const files = [];
  fileUrls.forEach((url) => {
    const filePath = getUrlFilePath(url);
    if (filePath) {
      const relativeUrl = url.replace('/uploads/', '');
      files.push({ url, filePath, relativePath: relativeUrl });
    }
  });

  return {
    exhibition,
    materials,
    timelines,
    messages,
    memoryMap,
    relatedFamilyAlbums,
    relatedMembers,
    files
  };
};

export const collectAllData = () => {
  const db = readDB();
  const fileUrls = new Set();

  (db.exhibitions || []).forEach((e) => {
    if (e.coverImage) fileUrls.add(e.coverImage);
  });
  (db.materials || []).forEach((m) => {
    if (m.url) fileUrls.add(m.url);
  });
  (db.familyMembers || []).forEach((m) => {
    if (m.avatar) fileUrls.add(m.avatar);
  });
  (db.familyAlbums || []).forEach((a) => {
    if (a.coverImage) fileUrls.add(a.coverImage);
  });

  const files = [];
  fileUrls.forEach((url) => {
    const filePath = getUrlFilePath(url);
    if (filePath) {
      const relativeUrl = url.replace('/uploads/', '');
      files.push({ url, filePath, relativePath: relativeUrl });
    }
  });

  return {
    exhibitions: db.exhibitions || [],
    materials: db.materials || [],
    timelines: db.timelines || [],
    messages: db.messages || [],
    shares: db.shares || [],
    shareViews: db.shareViews || [],
    memoryMaps: db.memoryMaps || [],
    familyAlbums: db.familyAlbums || [],
    familyMembers: db.familyMembers || [],
    files
  };
};

export const validateBackupManifest = (manifest) => {
  const errors = [];
  if (!manifest) {
    errors.push('清单文件为空');
    return { valid: false, errors };
  }
  if (!manifest.version) {
    errors.push('缺少版本号');
  }
  if (!manifest.exportedAt) {
    errors.push('缺少导出时间');
  }
  if (!manifest.data) {
    errors.push('缺少数据部分');
  }
  return { valid: errors.length === 0, errors };
};

export const verifyFileChecksums = async (extractedDir, checksums) => {
  const results = [];
  for (const [relativePath, expectedHash] of Object.entries(checksums)) {
    let filePath = path.join(extractedDir, relativePath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(extractedDir, 'files', relativePath);
    }
    if (!fs.existsSync(filePath)) {
      results.push({ file: relativePath, valid: false, error: '文件不存在' });
      continue;
    }
    try {
      const actualHash = await computeFileHash(filePath);
      results.push({
        file: relativePath,
        valid: actualHash === expectedHash,
        expected: expectedHash,
        actual: actualHash
      });
    } catch (err) {
      results.push({ file: relativePath, valid: false, error: err.message });
    }
  }
  return {
    allValid: results.every((r) => r.valid),
    results
  };
};

export const getTempDir = (prefix = 'backup-') => {
  const tempRoot = path.join(DATA_DIR, 'temp');
  ensureDir(tempRoot);
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join(tempRoot, `${prefix}${uniqueId}`);
  ensureDir(tempDir);
  return tempDir;
};

export const getExportDir = () => {
  const exportDir = path.join(DATA_DIR, 'exports');
  ensureDir(exportDir);
  return exportDir;
};

export const getImportDir = () => {
  const importDir = path.join(DATA_DIR, 'imports');
  ensureDir(importDir);
  return importDir;
};
