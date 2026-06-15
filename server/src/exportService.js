import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import {
  collectExhibitionData,
  collectAllData,
  computeFileHash,
  getTempDir,
  getExportDir,
  EXPORT_VERSION,
  MANIFEST_FILENAME,
  CHECKSUM_FILENAME
} from './backupService.js';
import { ensureDir } from './config.js';

const buildManifest = (scope, data, files) => {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    scope,
    data,
    fileCount: files.length,
    files: files.map((f) => ({
      url: f.url,
      relativePath: f.relativePath
    }))
  };
};

const computeChecksums = async (tempDir, files) => {
  const checksums = {};
  for (const file of files) {
    const sourcePath = file.filePath;
    const destRelative = `files/${file.relativePath}`;
    const destPath = path.join(tempDir, destRelative);
    if (fs.existsSync(destPath)) {
      checksums[file.relativePath] = await computeFileHash(destPath);
    }
  }
  return checksums;
};

const copyFilesToTemp = (tempDir, files) => {
  const filesDir = path.join(tempDir, 'files');
  ensureDir(filesDir);
  for (const file of files) {
    const destPath = path.join(filesDir, file.relativePath);
    ensureDir(path.dirname(destPath));
    if (fs.existsSync(file.filePath)) {
      fs.copyFileSync(file.filePath, destPath);
    }
  }
};

const createArchive = async (sourceDir, outputPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      resolve({ path: outputPath, size: archive.pointer() });
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};

export const exportExhibition = async (exhibitionId) => {
  const collected = collectExhibitionData(exhibitionId);
  if (!collected) {
    throw new Error('展厅不存在');
  }

  const tempDir = getTempDir(`export-exhibition-${exhibitionId}-`);
  try {
    copyFilesToTemp(tempDir, collected.files);

    const data = {
      exhibition: collected.exhibition,
      materials: collected.materials,
      timelines: collected.timelines,
      messages: collected.messages,
      memoryMap: collected.memoryMap,
      relatedFamilyAlbums: collected.relatedFamilyAlbums,
      relatedMembers: collected.relatedMembers
    };

    const manifest = buildManifest(
      { type: 'exhibition', id: exhibitionId, title: collected.exhibition.title },
      data,
      collected.files
    );

    fs.writeFileSync(
      path.join(tempDir, MANIFEST_FILENAME),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    const checksums = await computeChecksums(tempDir, collected.files);
    checksums[MANIFEST_FILENAME] = await computeFileHash(
      path.join(tempDir, MANIFEST_FILENAME)
    );
    fs.writeFileSync(
      path.join(tempDir, CHECKSUM_FILENAME),
      JSON.stringify(checksums, null, 2),
      'utf-8'
    );

    const exportDir = getExportDir();
    const safeTitle = (collected.exhibition.title || 'exhibition').replace(
      /[^a-zA-Z0-9\u4e00-\u9fa5_-]/g,
      '_'
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `exhibition-${safeTitle}-${timestamp}.zip`;
    const zipPath = path.join(exportDir, zipName);

    const result = await createArchive(tempDir, zipPath);

    return {
      ...result,
      filename: zipName,
      exhibitionId,
      title: collected.exhibition.title,
      fileCount: collected.files.length
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

export const exportAll = async () => {
  const collected = collectAllData();
  const tempDir = getTempDir('export-all-');
  try {
    copyFilesToTemp(tempDir, collected.files);

    const data = {
      exhibitions: collected.exhibitions,
      materials: collected.materials,
      timelines: collected.timelines,
      messages: collected.messages,
      shares: collected.shares,
      shareViews: collected.shareViews,
      memoryMaps: collected.memoryMaps,
      familyAlbums: collected.familyAlbums,
      familyMembers: collected.familyMembers
    };

    const manifest = buildManifest(
      { type: 'full', title: '完整数据备份' },
      data,
      collected.files
    );

    fs.writeFileSync(
      path.join(tempDir, MANIFEST_FILENAME),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    const checksums = await computeChecksums(tempDir, collected.files);
    checksums[MANIFEST_FILENAME] = await computeFileHash(
      path.join(tempDir, MANIFEST_FILENAME)
    );
    fs.writeFileSync(
      path.join(tempDir, CHECKSUM_FILENAME),
      JSON.stringify(checksums, null, 2),
      'utf-8'
    );

    const exportDir = getExportDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `full-backup-${timestamp}.zip`;
    const zipPath = path.join(exportDir, zipName);

    const result = await createArchive(tempDir, zipPath);

    return {
      ...result,
      filename: zipName,
      scope: 'full',
      fileCount: collected.files.length
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

export const listExports = () => {
  const exportDir = getExportDir();
  if (!fs.existsSync(exportDir)) return [];
  const files = fs.readdirSync(exportDir).filter((f) => f.endsWith('.zip'));
  return files
    .map((f) => {
      const fullPath = path.join(exportDir, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        path: fullPath
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getExportPath = (filename) => {
  const exportDir = getExportDir();
  const safeName = path.basename(filename);
  const fullPath = path.join(exportDir, safeName);
  if (!fs.existsSync(fullPath) || !safeName.endsWith('.zip')) {
    return null;
  }
  return fullPath;
};

export const deleteExport = (filename) => {
  const fullPath = getExportPath(filename);
  if (!fullPath) return false;
  fs.unlinkSync(fullPath);
  return true;
};
