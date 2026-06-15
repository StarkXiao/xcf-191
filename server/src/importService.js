import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const unzipper = require('unzipper');
import { v4 as uuidv4 } from 'uuid';
import {
  validateBackupManifest,
  verifyFileChecksums,
  getImportDir,
  getTempDir,
  computeFileHash,
  MANIFEST_FILENAME,
  CHECKSUM_FILENAME
} from './backupService.js';
import { UPLOADS_DIR, ensureDir } from './config.js';
import { readDB, writeDB, getCollection, saveCollection } from './storage.js';

const extractZip = async (zipPath, destDir) => {
  await fs.promises.mkdir(destDir, { recursive: true });
  const directory = await unzipper.Open.file(zipPath);
  await directory.extract({ path: destDir });
  return destDir;
};

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
};

const copyImportedFiles = async (extractedDir, dryRun = false) => {
  const filesDir = path.join(extractedDir, 'files');
  if (!fs.existsSync(filesDir)) {
    return { copied: [], skipped: [] };
  }

  const copied = [];
  const skipped = [];

  const collectFiles = (dir, basePrefix = '') => {
    const result = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePrefix ? `${basePrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        result.push(...collectFiles(fullPath, relativePath));
      } else {
        result.push({ fullPath, relativePath });
      }
    }
    return result;
  };

  const allFiles = collectFiles(filesDir);

  for (const { fullPath, relativePath } of allFiles) {
    const destPath = path.join(UPLOADS_DIR, relativePath);
    if (!dryRun) {
      ensureDir(path.dirname(destPath));
    }
    if (fs.existsSync(destPath)) {
      const srcHash = await computeFileHash(fullPath);
      const destHash = await computeFileHash(destPath);
      if (srcHash === destHash) {
        skipped.push({ path: relativePath, reason: '已存在且内容相同' });
        continue;
      }
    }
    if (!dryRun) {
      fs.copyFileSync(fullPath, destPath);
    }
    copied.push({ path: relativePath });
  }

  return { copied, skipped };
};

const regenerateIds = (data) => {
  const idMap = {};
  const newId = (oldId) => {
    if (!idMap[oldId]) idMap[oldId] = uuidv4();
    return idMap[oldId];
  };

  const exhibition = data.exhibition
    ? { ...data.exhibition, id: newId(data.exhibition.id) }
    : null;
  const oldExhibitionId = data.exhibition?.id;

  const materials = (data.materials || []).map((m) => ({
    ...m,
    id: newId(m.id),
    exhibitionId: exhibition ? exhibition.id : m.exhibitionId
  }));
  const materialIdMap = {};
  (data.materials || []).forEach((m, idx) => {
    materialIdMap[m.id] = materials[idx].id;
  });

  const timelines = (data.timelines || []).map((t) => ({
    ...t,
    id: newId(t.id),
    exhibitionId: exhibition ? exhibition.id : t.exhibitionId,
    materialIds: (t.materialIds || []).map((mid) => materialIdMap[mid] || mid)
  }));

  const messages = (data.messages || []).map((m) => ({
    ...m,
    id: newId(m.id),
    exhibitionId: exhibition ? exhibition.id : m.exhibitionId
  }));

  const memoryMap = data.memoryMap
    ? { ...data.memoryMap, id: newId(data.memoryMap.id), exhibitionId: exhibition ? exhibition.id : data.memoryMap.exhibitionId }
    : null;

  const relatedMembers = (data.relatedMembers || []).map((m) => ({
    ...m,
    id: newId(m.id)
  }));
  const memberIdMap = {};
  (data.relatedMembers || []).forEach((m, idx) => {
    memberIdMap[m.id] = relatedMembers[idx].id;
  });
  relatedMembers.forEach((m, idx) => {
    if (m.relations) {
      const origRelations = data.relatedMembers[idx].relations || [];
      m.relations = origRelations.map((r) => ({
        ...r,
        memberId: memberIdMap[r.memberId] || r.memberId
      }));
    }
  });

  const relatedFamilyAlbums = (data.relatedFamilyAlbums || []).map((a) => ({
    ...a,
    id: newId(a.id),
    exhibitionIds: (a.exhibitionIds || []).map((eid) =>
      eid === oldExhibitionId ? (exhibition ? exhibition.id : eid) : eid
    ),
    memberIds: (a.memberIds || []).map((mid) => memberIdMap[mid] || mid)
  }));

  return {
    exhibition,
    materials,
    timelines,
    messages,
    memoryMap,
    relatedMembers,
    relatedFamilyAlbums
  };
};

const mergeFullData = (data, options = {}) => {
  const db = readDB();
  const { overwrite = false, idConflictStrategy = 'rename' } = options;

  const idMap = {};
  const newId = (oldId, prefix) => {
    if (!idMap[oldId]) {
      if (overwrite) {
        idMap[oldId] = oldId;
      } else if (idConflictStrategy === 'keep' && db[`${prefix}s`]?.some((x) => x.id === oldId)) {
        idMap[oldId] = oldId;
      } else {
        idMap[oldId] = uuidv4();
      }
    }
    return idMap[oldId];
  };

  const familyMembers = (data.familyMembers || []).map((m) => ({
    ...m,
    id: newId(m.id, 'familyMember')
  }));
  const memberIdMap = {};
  (data.familyMembers || []).forEach((m, idx) => {
    memberIdMap[m.id] = familyMembers[idx].id;
  });
  familyMembers.forEach((m, idx) => {
    if (m.relations) {
      const origRelations = data.familyMembers[idx].relations || [];
      m.relations = origRelations.map((r) => ({
        ...r,
        memberId: memberIdMap[r.memberId] || r.memberId
      }));
    }
  });

  const exhibitions = (data.exhibitions || []).map((e) => ({
    ...e,
    id: newId(e.id, 'exhibition')
  }));
  const exhibitionIdMap = {};
  (data.exhibitions || []).forEach((e, idx) => {
    exhibitionIdMap[e.id] = exhibitions[idx].id;
  });

  const materials = (data.materials || []).map((m) => ({
    ...m,
    id: newId(m.id, 'material'),
    exhibitionId: exhibitionIdMap[m.exhibitionId] || m.exhibitionId
  }));
  const materialIdMap = {};
  (data.materials || []).forEach((m, idx) => {
    materialIdMap[m.id] = materials[idx].id;
  });

  const timelines = (data.timelines || []).map((t) => ({
    ...t,
    id: newId(t.id, 'timeline'),
    exhibitionId: exhibitionIdMap[t.exhibitionId] || t.exhibitionId,
    materialIds: (t.materialIds || []).map((mid) => materialIdMap[mid] || mid)
  }));

  const messages = (data.messages || []).map((m) => ({
    ...m,
    id: newId(m.id, 'message'),
    exhibitionId: exhibitionIdMap[m.exhibitionId] || m.exhibitionId
  }));

  const memoryMaps = (data.memoryMaps || []).map((mm) => ({
    ...mm,
    id: newId(mm.id, 'memoryMap'),
    exhibitionId: exhibitionIdMap[mm.exhibitionId] || mm.exhibitionId
  }));

  const familyAlbums = (data.familyAlbums || []).map((a) => ({
    ...a,
    id: newId(a.id, 'familyAlbum'),
    exhibitionIds: (a.exhibitionIds || []).map((eid) => exhibitionIdMap[eid] || eid),
    memberIds: (a.memberIds || []).map((mid) => memberIdMap[mid] || mid)
  }));

  const shares = (data.shares || []).map((s) => ({
    ...s,
    id: newId(s.id, 'share'),
    exhibitionId: exhibitionIdMap[s.exhibitionId] || s.exhibitionId
  }));

  const shareViews = (data.shareViews || []).map((sv) => ({
    ...sv,
    id: newId(sv.id, 'shareView'),
    shareId: idMap[sv.shareId] || sv.shareId
  }));

  return {
    exhibitions,
    materials,
    timelines,
    messages,
    memoryMaps,
    familyMembers,
    familyAlbums,
    shares,
    shareViews
  };
};

export const analyzeBackup = async (zipPath) => {
  const tempDir = getTempDir('analyze-');
  try {
    await extractZip(zipPath, tempDir);

    const manifestPath = path.join(tempDir, MANIFEST_FILENAME);
    const manifest = readJsonFile(manifestPath);
    const validation = validateBackupManifest(manifest);

    let checksumVerification = null;
    const checksumPath = path.join(tempDir, CHECKSUM_FILENAME);
    if (fs.existsSync(checksumPath)) {
      const checksums = readJsonFile(checksumPath);
      checksumVerification = await verifyFileChecksums(tempDir, checksums);
    }

    let scope = manifest?.scope?.type || 'unknown';
    let title = '';
    let stats = {};

    if (manifest?.data) {
      const d = manifest.data;
      if (scope === 'exhibition') {
        title = d.exhibition?.title || manifest.scope.title || '';
        stats = {
          materials: (d.materials || []).length,
          timelines: (d.timelines || []).length,
          messages: (d.messages || []).length,
          relatedMembers: (d.relatedMembers || []).length,
          relatedAlbums: (d.relatedFamilyAlbums || []).length
        };
      } else if (scope === 'full') {
        title = '完整数据备份';
        stats = {
          exhibitions: (d.exhibitions || []).length,
          materials: (d.materials || []).length,
          timelines: (d.timelines || []).length,
          messages: (d.messages || []).length,
          familyMembers: (d.familyMembers || []).length,
          familyAlbums: (d.familyAlbums || []).length,
          shares: (d.shares || []).length
        };
      }
    }

    return {
      valid: validation.valid,
      validationErrors: validation.errors,
      scope,
      title,
      version: manifest?.version,
      exportedAt: manifest?.exportedAt,
      fileCount: manifest?.fileCount || 0,
      stats,
      checksumsValid: checksumVerification?.allValid ?? null,
      checksumResults: checksumVerification?.results || []
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

export const importBackup = async (zipPath, options = {}) => {
  const { overwrite = false, idConflictStrategy = 'rename', dryRun = false } = options;

  const tempDir = getTempDir('import-');
  try {
    await extractZip(zipPath, tempDir);

    const manifest = readJsonFile(path.join(tempDir, MANIFEST_FILENAME));
    const validation = validateBackupManifest(manifest);
    if (!validation.valid) {
      throw new Error(`备份校验失败: ${validation.errors.join(', ')}`);
    }

    let checksumResult = null;
    const checksumPath = path.join(tempDir, CHECKSUM_FILENAME);
    if (fs.existsSync(checksumPath)) {
      const checksums = readJsonFile(checksumPath);
      checksumResult = await verifyFileChecksums(tempDir, checksums);
      if (!checksumResult.allValid) {
        const failed = checksumResult.results.filter((r) => !r.valid);
        throw new Error(`文件校验失败: ${failed.length} 个文件不匹配`);
      }
    }

    const fileResult = await copyImportedFiles(tempDir, dryRun);

    let importSummary = { filesCopied: fileResult.copied.length, filesSkipped: fileResult.skipped.length };

    if (manifest.scope?.type === 'exhibition') {
      const regenerated = regenerateIds(manifest.data);
      if (!dryRun) {
        const db = readDB();
        if (regenerated.exhibition) db.exhibitions.push(regenerated.exhibition);
        db.materials.push(...regenerated.materials);
        db.timelines.push(...regenerated.timelines);
        db.messages.push(...regenerated.messages);
        if (regenerated.memoryMap) db.memoryMaps.push(regenerated.memoryMap);
        db.familyMembers.push(...regenerated.relatedMembers);
        db.familyAlbums.push(...regenerated.relatedFamilyAlbums);
        writeDB(db);
      }
      importSummary = {
        ...importSummary,
        scope: 'exhibition',
        exhibitionId: regenerated.exhibition?.id,
        exhibitionTitle: regenerated.exhibition?.title,
        materialsImported: regenerated.materials.length,
        timelinesImported: regenerated.timelines.length,
        messagesImported: regenerated.messages.length,
        membersImported: regenerated.relatedMembers.length,
        albumsImported: regenerated.relatedFamilyAlbums.length
      };
    } else if (manifest.scope?.type === 'full') {
      const merged = mergeFullData(manifest.data, { overwrite, idConflictStrategy });
      if (!dryRun) {
        const db = readDB();
        if (overwrite) {
          db.exhibitions = merged.exhibitions;
          db.materials = merged.materials;
          db.timelines = merged.timelines;
          db.messages = merged.messages;
          db.memoryMaps = merged.memoryMaps;
          db.familyMembers = merged.familyMembers;
          db.familyAlbums = merged.familyAlbums;
          db.shares = merged.shares;
          db.shareViews = merged.shareViews;
        } else {
          db.exhibitions.push(...merged.exhibitions);
          db.materials.push(...merged.materials);
          db.timelines.push(...merged.timelines);
          db.messages.push(...merged.messages);
          db.memoryMaps.push(...merged.memoryMaps);
          db.familyMembers.push(...merged.familyMembers);
          db.familyAlbums.push(...merged.familyAlbums);
          db.shares.push(...merged.shares);
          db.shareViews.push(...merged.shareViews);
        }
        writeDB(db);
      }
      importSummary = {
        ...importSummary,
        scope: 'full',
        exhibitionsImported: merged.exhibitions.length,
        materialsImported: merged.materials.length,
        timelinesImported: merged.timelines.length,
        messagesImported: merged.messages.length,
        membersImported: merged.familyMembers.length,
        albumsImported: merged.familyAlbums.length
      };
    }

    return {
      success: true,
      dryRun,
      checksumVerified: checksumResult?.allValid ?? true,
      ...importSummary
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

export const saveUploadedBackup = async (fileStream, originalName) => {
  const importDir = getImportDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
  const fileName = `${timestamp}-${safeName}`;
  const filePath = path.join(importDir, fileName);

  const writeStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    fileStream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  return { filePath, fileName };
};
