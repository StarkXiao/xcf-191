import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import {
  exportExhibition,
  exportAll,
  listExports,
  getExportPath,
  deleteExport
} from '../exportService.js';
import { generateStaticPage } from '../staticPageService.js';
import {
  analyzeBackup,
  importBackup,
  saveUploadedBackup
} from '../importService.js';
import { validateBackupManifest, verifyFileChecksums, getImportDir } from '../backupService.js';

export default async function exportBackupRoutes(fastify) {
  fastify.get('/exports', async () => {
    return listExports();
  });

  fastify.post('/export/exhibition/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const result = await exportExhibition(id);
      return result;
    } catch (err) {
      if (err.message === '展厅不存在') {
        reply.code(404);
        return { error: err.message };
      }
      reply.code(500);
      return { error: '导出失败', detail: err.message };
    }
  });

  fastify.post('/export/all', async (request, reply) => {
    try {
      const result = await exportAll();
      return result;
    } catch (err) {
      reply.code(500);
      return { error: '导出失败', detail: err.message };
    }
  });

  fastify.get('/exports/download/:filename', async (request, reply) => {
    const { filename } = request.params;
    const filePath = getExportPath(filename);
    if (!filePath) {
      reply.code(404);
      return { error: '导出文件不存在' };
    }
    const stat = fs.statSync(filePath);
    reply.type('application/zip');
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    reply.header('Content-Length', stat.size);
    return fs.createReadStream(filePath);
  });

  fastify.delete('/exports/:filename', async (request, reply) => {
    const { filename } = request.params;
    const deleted = deleteExport(filename);
    if (!deleted) {
      reply.code(404);
      return { error: '导出文件不存在' };
    }
    return { success: true };
  });

  fastify.post('/static/exhibition/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const result = await generateStaticPage(id);
      return result;
    } catch (err) {
      if (err.message === '展厅不存在') {
        reply.code(404);
        return { error: err.message };
      }
      reply.code(500);
      return { error: '生成静态页失败', detail: err.message };
    }
  });

  fastify.post('/import/analyze', async (request, reply) => {
    const parts = request.files();
    let saved = null;
    try {
      for await (const part of parts) {
        if (!part.file) continue;
        saved = await saveUploadedBackup(part.file, part.filename || 'backup.zip');
        break;
      }
      if (!saved) {
        reply.code(400);
        return { error: '未接收到文件' };
      }
      const analysis = await analyzeBackup(saved.filePath);
      return {
        fileName: saved.fileName,
        ...analysis
      };
    } catch (err) {
      reply.code(500);
      return { error: '分析失败', detail: err.message };
    }
  });

  fastify.post('/import/execute', async (request, reply) => {
    const { fileName, overwrite = false, dryRun = false, idConflictStrategy = 'rename' } =
      request.body || {};
    if (!fileName) {
      reply.code(400);
      return { error: '缺少文件名参数' };
    }
    const importDir = getImportDir();
    const safeName = path.basename(fileName);
    const filePath = path.join(importDir, safeName);
    if (!fs.existsSync(filePath)) {
      reply.code(404);
      return { error: '备份文件不存在' };
    }
    try {
      const result = await importBackup(filePath, { overwrite, dryRun, idConflictStrategy });
      return result;
    } catch (err) {
      reply.code(500);
      return { error: '导入失败', detail: err.message };
    }
  });

  fastify.post('/verify/checksums', async (request, reply) => {
    const parts = request.files();
    let saved = null;
    try {
      for await (const part of parts) {
        if (!part.file) continue;
        saved = await saveUploadedBackup(part.file, part.filename || 'check.zip');
        break;
      }
      if (!saved) {
        reply.code(400);
        return { error: '未接收到文件' };
      }
      const analysis = await analyzeBackup(saved.filePath);
      return {
        fileName: saved.fileName,
        manifestValid: analysis.valid,
        checksumsValid: analysis.checksumsValid,
        checksumResults: analysis.checksumResults,
        validationErrors: analysis.validationErrors
      };
    } catch (err) {
      reply.code(500);
      return { error: '校验失败', detail: err.message };
    }
  });
}
