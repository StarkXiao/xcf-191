import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { getCollection, saveCollection } from '../storage.js';
import { UPLOADS_DIR, ensureDir } from '../config.js';

export default async function opsRoutes(fastify) {

  fastify.get('/dashboard', async () => {
    const exhibitions = getCollection('exhibitions');
    const materials = getCollection('materials');
    const messages = getCollection('messages');
    const shares = getCollection('shares');
    const shareViews = getCollection('shareViews');
    const appointments = getCollection('appointments');
    const visitRecords = getCollection('visitRecords');
    const reviewRecords = getCollection('reviewRecords');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const todayMessages = messages.filter(m => m.createdAt >= oneDayAgo);
    const weekMessages = messages.filter(m => m.createdAt >= sevenDaysAgo);
    const pendingReviews = reviewRecords.filter(r => r.status === 'pending');
    const approvedReviews = reviewRecords.filter(r => r.status === 'approved');
    const rejectedReviews = reviewRecords.filter(r => r.status === 'rejected');

    const materialTypeMap = {};
    materials.forEach(m => {
      const t = m.type || 'unknown';
      materialTypeMap[t] = (materialTypeMap[t] || 0) + 1;
    });

    const exhibitionStats = exhibitions.map(ex => {
      const exMaterials = materials.filter(m => m.exhibitionId === ex.id);
      const exMessages = messages.filter(m => m.exhibitionId === ex.id);
      const exReviews = reviewRecords.filter(r => r.exhibitionId === ex.id && r.status === 'pending');
      return {
        id: ex.id,
        title: ex.title,
        materialCount: exMaterials.length,
        messageCount: exMessages.length,
        pendingReviewCount: exReviews.length,
        createdAt: ex.createdAt
      };
    });

    return {
      summary: {
        exhibitionCount: exhibitions.length,
        materialCount: materials.length,
        messageCount: messages.length,
        todayMessageCount: todayMessages.length,
        weekMessageCount: weekMessages.length,
        shareCount: shares.length,
        shareViewCount: shareViews.length,
        appointmentCount: appointments.length,
        visitRecordCount: visitRecords.length,
        pendingReviewCount: pendingReviews.length,
        approvedReviewCount: approvedReviews.length,
        rejectedReviewCount: rejectedReviews.length
      },
      materialTypeDistribution: materialTypeMap,
      exhibitionStats: exhibitionStats.sort((a, b) => b.pendingReviewCount - a.pendingReviewCount)
    };
  });

  fastify.get('/messages', async (request) => {
    const { status, exhibitionId, page = '1', pageSize = '20' } = request.query;
    let messages = getCollection('messages');

    if (exhibitionId) {
      messages = messages.filter(m => m.exhibitionId === exhibitionId);
    }
    if (status && status !== 'all') {
      messages = messages.filter(m => (m.reviewStatus || 'pending') === status);
    }

    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = messages.length;
    const p = Math.max(1, parseInt(page));
    const ps = Math.max(1, parseInt(pageSize));
    const start = (p - 1) * ps;
    const items = messages.slice(start, start + ps);

    const exhibitions = getCollection('exhibitions');
    const exMap = {};
    exhibitions.forEach(e => { exMap[e.id] = e.title; });

    return {
      total,
      page: p,
      pageSize: ps,
      items: items.map(m => ({ ...m, exhibitionTitle: exMap[m.exhibitionId] || '未知展厅' }))
    };
  });

  fastify.put('/messages/:id/review', async (request, reply) => {
    const { id } = request.params;
    const { status, reason } = request.body;
    if (!['approved', 'rejected'].includes(status)) {
      reply.code(400);
      return { error: '无效审核状态，仅支持 approved 或 rejected' };
    }

    const messages = getCollection('messages');
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '留言不存在' };
    }

    messages[index] = {
      ...messages[index],
      reviewStatus: status,
      reviewReason: reason || '',
      reviewedAt: new Date().toISOString()
    };
    saveCollection('messages', messages);
    return messages[index];
  });

  fastify.post('/messages/batch-review', async (request) => {
    const { ids, status, reason } = request.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return { error: 'ids 不能为空' };
    }
    if (!['approved', 'rejected'].includes(status)) {
      return { error: '无效审核状态' };
    }

    const messages = getCollection('messages');
    const now = new Date().toISOString();
    let updated = 0;

    messages.forEach(m => {
      if (ids.includes(m.id)) {
        m.reviewStatus = status;
        m.reviewReason = reason || '';
        m.reviewedAt = now;
        updated++;
      }
    });

    saveCollection('messages', messages);
    return { success: true, updated };
  });

  fastify.get('/materials/inspect', async () => {
    const materials = getCollection('materials');
    const exhibitions = getCollection('exhibitions');
    const exMap = {};
    exhibitions.forEach(e => { exMap[e.id] = e.title; });

    const results = {
      total: materials.length,
      healthy: 0,
      warning: 0,
      error: 0,
      items: []
    };

    for (const m of materials) {
      const item = {
        id: m.id,
        title: m.title || '无标题',
        type: m.type,
        url: m.url,
        exhibitionId: m.exhibitionId,
        exhibitionTitle: exMap[m.exhibitionId] || '未知展厅',
        issues: [],
        status: 'healthy'
      };

      if (!m.url && ['image', 'audio', 'video'].includes(m.type)) {
        item.issues.push('缺少文件URL');
        item.status = 'error';
      }

      if (m.url && m.url.startsWith('/uploads/')) {
        const relativePath = m.url.replace('/uploads/', '');
        const filePath = join(UPLOADS_DIR, relativePath);
        if (!fs.existsSync(filePath)) {
          item.issues.push('文件不存在于磁盘');
          item.status = 'error';
        } else {
          try {
            const stat = fs.statSync(filePath);
            if (stat.size === 0) {
              item.issues.push('文件大小为0');
              item.status = 'error';
            }
          } catch {
            item.issues.push('无法读取文件信息');
            item.status = 'error';
          }
        }
      }

      if (!m.title) {
        item.issues.push('缺少标题');
        if (item.status === 'healthy') item.status = 'warning';
      }

      if (!m.exhibitionId) {
        item.issues.push('未关联展厅');
        if (item.status === 'healthy') item.status = 'warning';
      }

      const validTypes = ['text', 'image', 'audio', 'video'];
      if (!validTypes.includes(m.type)) {
        item.issues.push(`未知素材类型: ${m.type}`);
        if (item.status === 'healthy') item.status = 'warning';
      }

      if (m.type === 'image' && m.url) {
        const ext = extname(m.url).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
          item.issues.push(`图片格式异常: ${ext || '无扩展名'}`);
          if (item.status === 'healthy') item.status = 'warning';
        }
      }

      if (m.type === 'audio' && m.url) {
        const ext = extname(m.url).toLowerCase();
        if (!['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
          item.issues.push(`音频格式异常: ${ext || '无扩展名'}`);
          if (item.status === 'healthy') item.status = 'warning';
        }
      }

      results[item.status]++;
      results.items.push(item);
    }

    results.items.sort((a, b) => {
      const order = { error: 0, warning: 1, healthy: 2 };
      return order[a.status] - order[b.status];
    });

    return results;
  });

  fastify.get('/files/abnormal', async () => {
    const materials = getCollection('materials');
    const exhibitions = getCollection('exhibitions');
    const exMap = {};
    exhibitions.forEach(e => { exMap[e.id] = e.title; });

    const abnormalFiles = [];

    for (const m of materials) {
      if (!m.url || !m.url.startsWith('/uploads/')) continue;

      const relativePath = m.url.replace('/uploads/', '');
      const filePath = join(UPLOADS_DIR, relativePath);
      const issue = {
        id: m.id,
        materialTitle: m.title || '无标题',
        type: m.type,
        url: m.url,
        exhibitionId: m.exhibitionId,
        exhibitionTitle: exMap[m.exhibitionId] || '未知展厅',
        filePath,
        exists: false,
        fileSize: 0,
        issues: [],
        canRepair: false,
        repairSuggestion: ''
      };

      if (!fs.existsSync(filePath)) {
        issue.issues.push('文件丢失');
        issue.repairSuggestion = '重新上传素材文件';
        issue.canRepair = true;
      } else {
        issue.exists = true;
        try {
          const stat = fs.statSync(filePath);
          issue.fileSize = stat.size;
          if (stat.size === 0) {
            issue.issues.push('文件为空');
            issue.repairSuggestion = '重新上传素材文件';
            issue.canRepair = true;
          }

          const ext = extname(filePath).toLowerCase();
          const expectedTypes = {
            images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            audios: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
            videos: ['.mp4', '.webm', '.mov']
          };
          const dirName = relativePath.split('/')[0];
          if (expectedTypes[dirName] && !expectedTypes[dirName].includes(ext)) {
            issue.issues.push(`文件扩展名与目录不匹配: 目录=${dirName}, 扩展名=${ext}`);
            issue.repairSuggestion = '移动文件到正确目录或修正扩展名';
            issue.canRepair = true;
          }
        } catch (err) {
          issue.issues.push(`文件读取异常: ${err.message}`);
          issue.repairSuggestion = '检查文件权限或重新上传';
          issue.canRepair = true;
        }
      }

      if (issue.issues.length > 0) {
        abnormalFiles.push(issue);
      }
    }

    const orphanFiles = [];
    try {
      const subDirs = ['images', 'audios', 'videos', 'others'];
      const allMaterialUrls = new Set(materials.map(m => m.url).filter(Boolean));

      for (const subDir of subDirs) {
        const dirPath = join(UPLOADS_DIR, subDir);
        if (!fs.existsSync(dirPath)) continue;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const url = `/uploads/${subDir}/${file}`;
          if (!allMaterialUrls.has(url)) {
            const filePath = join(dirPath, file);
            let size = 0;
            try { size = fs.statSync(filePath).size; } catch {}
            orphanFiles.push({
              filename: file,
              url,
              dir: subDir,
              filePath,
              size,
              suggestion: '可清理未关联文件'
            });
          }
        }
      }
    } catch {}

    return {
      abnormalCount: abnormalFiles.length,
      orphanCount: orphanFiles.length,
      abnormalFiles,
      orphanFiles
    };
  });

  fastify.post('/files/repair', async (request) => {
    const { materialId, action, newUrl } = request.body;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === materialId);
    if (index === -1) {
      return { error: '素材不存在' };
    }

    const repairLogs = getCollection('fileRepairLogs');
    const log = {
      id: uuidv4(),
      materialId,
      materialTitle: materials[index].title,
      action,
      oldUrl: materials[index].url,
      newUrl: newUrl || '',
      createdAt: new Date().toISOString()
    };

    if (action === 'replace') {
      if (!newUrl) {
        return { error: '替换操作需要提供 newUrl' };
      }
      const oldUrl = materials[index].url;
      if (oldUrl && oldUrl.startsWith('/uploads/')) {
        const oldRelativePath = oldUrl.replace('/uploads/', '');
        const oldFilePath = join(UPLOADS_DIR, oldRelativePath);
        if (fs.existsSync(oldFilePath)) {
          try { fs.unlinkSync(oldFilePath); } catch {}
        }
      }
      materials[index].url = newUrl;
      materials[index].updatedAt = new Date().toISOString();
      log.result = 'replaced';
      log.oldFileDeleted = true;
    } else if (action === 'remove') {
      if (materials[index].url && materials[index].url.startsWith('/uploads/')) {
        const relativePath = materials[index].url.replace('/uploads/', '');
        const filePath = join(UPLOADS_DIR, relativePath);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }
      materials[index].url = '';
      log.result = 'removed';
    } else if (action === 'orphan-cleanup') {
      if (materials[index].url && materials[index].url.startsWith('/uploads/')) {
        const relativePath = materials[index].url.replace('/uploads/', '');
        const filePath = join(UPLOADS_DIR, relativePath);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }
      const filtered = materials.filter(m => m.id !== materialId);
      saveCollection('materials', filtered);
      log.result = 'cleaned';
      repairLogs.push(log);
      saveCollection('fileRepairLogs', repairLogs);
      return { success: true, result: 'cleaned' };
    } else {
      return { error: '不支持的操作类型' };
    }

    saveCollection('materials', materials);
    repairLogs.push(log);
    saveCollection('fileRepairLogs', repairLogs);
    return { success: true, result: log.result, material: materials[index] };
  });

  fastify.post('/files/orphan-cleanup', async (request) => {
    const { urls } = request.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return { error: 'urls 不能为空' };
    }

    const repairLogs = getCollection('fileRepairLogs');
    let cleaned = 0;

    for (const url of urls) {
      if (!url.startsWith('/uploads/')) continue;
      const relativePath = url.replace('/uploads/', '');
      const filePath = join(UPLOADS_DIR, relativePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          cleaned++;
          repairLogs.push({
            id: uuidv4(),
            materialId: null,
            action: 'orphan-cleanup',
            oldUrl: url,
            newUrl: '',
            result: 'cleaned',
            createdAt: new Date().toISOString()
          });
        } catch {}
      }
    }

    saveCollection('fileRepairLogs', repairLogs);
    return { success: true, cleaned };
  });

  fastify.post('/files/upload-repair', async (request, reply) => {
    const materialId = request.query.materialId;
    if (!materialId) {
      reply.code(400);
      return { error: '缺少 materialId 参数' };
    }

    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === materialId);
    if (index === -1) {
      reply.code(404);
      return { error: '素材不存在' };
    }

    const parts = request.files();
    let uploadedFile = null;

    for await (const part of parts) {
      if (!part.file) continue;

      const originalExt = extname(part.filename || '').toLowerCase();
      const fileId = uuidv4();
      const fileName = `${fileId}${originalExt}`;

      let subDir = 'others';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(originalExt)) {
        subDir = 'images';
      } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(originalExt)) {
        subDir = 'audios';
      } else if (['.mp4', '.webm', '.mov'].includes(originalExt)) {
        subDir = 'videos';
      }

      const targetDir = join(UPLOADS_DIR, subDir);
      ensureDir(targetDir);
      const filePath = join(targetDir, fileName);

      await pipeline(part.file, fs.createWriteStream(filePath));

      uploadedFile = {
        id: fileId,
        filename: part.filename,
        url: `/uploads/${subDir}/${fileName}`,
        type: subDir,
        size: fs.statSync(filePath).size
      };
      break;
    }

    if (!uploadedFile) {
      reply.code(400);
      return { error: '未上传文件' };
    }

    const oldUrl = materials[index].url;
    let oldFileDeleted = false;
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
      const oldRelativePath = oldUrl.replace('/uploads/', '');
      const oldFilePath = join(UPLOADS_DIR, oldRelativePath);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); oldFileDeleted = true; } catch {}
      }
    }

    materials[index].url = uploadedFile.url;
    materials[index].updatedAt = new Date().toISOString();
    saveCollection('materials', materials);

    const repairLogs = getCollection('fileRepairLogs');
    const log = {
      id: uuidv4(),
      materialId,
      materialTitle: materials[index].title,
      action: 'upload-replace',
      oldUrl: oldUrl,
      newUrl: uploadedFile.url,
      result: 'replaced',
      oldFileDeleted,
      uploadedFilename: uploadedFile.filename,
      fileSize: uploadedFile.size,
      createdAt: new Date().toISOString()
    };
    repairLogs.push(log);
    saveCollection('fileRepairLogs', repairLogs);

    return {
      success: true,
      result: 'replaced',
      material: materials[index],
      uploadedFile,
      oldFileDeleted
    };
  });

  fastify.post('/files/bind-orphan', async (request, reply) => {
    const { materialId, orphanUrl } = request.body;
    if (!materialId || !orphanUrl) {
      reply.code(400);
      return { error: '缺少 materialId 或 orphanUrl' };
    }

    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === materialId);
    if (index === -1) {
      reply.code(404);
      return { error: '素材不存在' };
    }

    if (!orphanUrl.startsWith('/uploads/')) {
      reply.code(400);
      return { error: 'orphanUrl 格式无效' };
    }

    const relativePath = orphanUrl.replace('/uploads/', '');
    const filePath = join(UPLOADS_DIR, relativePath);
    if (!fs.existsSync(filePath)) {
      reply.code(404);
      return { error: '孤立文件不存在' };
    }

    const oldUrl = materials[index].url;
    let oldFileDeleted = false;
    if (oldUrl && oldUrl.startsWith('/uploads/')) {
      const oldRelativePath = oldUrl.replace('/uploads/', '');
      const oldFilePath = join(UPLOADS_DIR, oldRelativePath);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); oldFileDeleted = true; } catch {}
      }
    }

    materials[index].url = orphanUrl;
    materials[index].updatedAt = new Date().toISOString();
    saveCollection('materials', materials);

    const repairLogs = getCollection('fileRepairLogs');
    const log = {
      id: uuidv4(),
      materialId,
      materialTitle: materials[index].title,
      action: 'bind-orphan',
      oldUrl: oldUrl,
      newUrl: orphanUrl,
      result: 'replaced',
      oldFileDeleted,
      fileSize: fs.statSync(filePath).size,
      createdAt: new Date().toISOString()
    };
    repairLogs.push(log);
    saveCollection('fileRepairLogs', repairLogs);

    return {
      success: true,
      result: 'replaced',
      material: materials[index],
      oldFileDeleted
    };
  });

  fastify.get('/reviews', async (request) => {
    const { status, exhibitionId, type, page = '1', pageSize = '20' } = request.query;
    let reviews = getCollection('reviewRecords');

    if (status && status !== 'all') {
      reviews = reviews.filter(r => r.status === status);
    }
    if (exhibitionId) {
      reviews = reviews.filter(r => r.exhibitionId === exhibitionId);
    }
    if (type) {
      reviews = reviews.filter(r => r.type === type);
    }

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = reviews.length;
    const p = Math.max(1, parseInt(page));
    const ps = Math.max(1, parseInt(pageSize));
    const start = (p - 1) * ps;
    const items = reviews.slice(start, start + ps);

    const exhibitions = getCollection('exhibitions');
    const exMap = {};
    exhibitions.forEach(e => { exMap[e.id] = e.title; });

    return {
      total,
      page: p,
      pageSize: ps,
      items: items.map(r => ({ ...r, exhibitionTitle: exMap[r.exhibitionId] || '未知展厅' }))
    };
  });

  fastify.post('/reviews', async (request) => {
    const { exhibitionId, type, targetId, content, reason } = request.body;
    if (!exhibitionId || !type || !targetId) {
      return { error: '缺少必要参数' };
    }

    const reviewRecords = getCollection('reviewRecords');
    const newReview = {
      id: uuidv4(),
      exhibitionId,
      type,
      targetId,
      content: content || '',
      reason: reason || '',
      status: 'pending',
      reviewer: '',
      reviewNote: '',
      createdAt: new Date().toISOString(),
      reviewedAt: null
    };
    reviewRecords.push(newReview);
    saveCollection('reviewRecords', reviewRecords);
    return newReview;
  });

  fastify.put('/reviews/:id/approve', async (request, reply) => {
    const { id } = request.params;
    const { note } = request.body;
    const reviewRecords = getCollection('reviewRecords');
    const index = reviewRecords.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '审核记录不存在' };
    }

    reviewRecords[index] = {
      ...reviewRecords[index],
      status: 'approved',
      reviewNote: note || '',
      reviewedAt: new Date().toISOString()
    };
    saveCollection('reviewRecords', reviewRecords);

    if (reviewRecords[index].type === 'message') {
      const messages = getCollection('messages');
      const mIndex = messages.findIndex(m => m.id === reviewRecords[index].targetId);
      if (mIndex !== -1) {
        messages[mIndex].reviewStatus = 'approved';
        messages[mIndex].reviewedAt = new Date().toISOString();
        saveCollection('messages', messages);
      }
    }

    return reviewRecords[index];
  });

  fastify.put('/reviews/:id/reject', async (request, reply) => {
    const { id } = request.params;
    const { note } = request.body;
    const reviewRecords = getCollection('reviewRecords');
    const index = reviewRecords.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '审核记录不存在' };
    }

    reviewRecords[index] = {
      ...reviewRecords[index],
      status: 'rejected',
      reviewNote: note || '',
      reviewedAt: new Date().toISOString()
    };
    saveCollection('reviewRecords', reviewRecords);

    if (reviewRecords[index].type === 'message') {
      const messages = getCollection('messages');
      const mIndex = messages.findIndex(m => m.id === reviewRecords[index].targetId);
      if (mIndex !== -1) {
        messages[mIndex].reviewStatus = 'rejected';
        messages[mIndex].reviewReason = note || '';
        messages[mIndex].reviewedAt = new Date().toISOString();
        saveCollection('messages', messages);
      }
    }

    return reviewRecords[index];
  });

  fastify.post('/reviews/generate', async () => {
    const materials = getCollection('materials');
    const messages = getCollection('messages');
    const exhibitions = getCollection('exhibitions');
    const reviewRecords = getCollection('reviewRecords');

    const existingTargets = new Set(reviewRecords.filter(r => r.status === 'pending').map(r => `${r.type}:${r.targetId}`));
    let generated = 0;

    for (const m of materials) {
      const key = `material:${m.id}`;
      if (!existingTargets.has(key)) {
        const needsReview = !m.title || !m.url || (m.url && m.url.startsWith('/uploads/') && !fs.existsSync(join(UPLOADS_DIR, m.url.replace('/uploads/', ''))));
        if (needsReview) {
          reviewRecords.push({
            id: uuidv4(),
            exhibitionId: m.exhibitionId,
            type: 'material',
            targetId: m.id,
            content: `素材「${m.title || '无标题'}」需要审核`,
            reason: !m.title ? '缺少标题' : !m.url ? '缺少文件' : '文件丢失',
            status: 'pending',
            reviewer: '',
            reviewNote: '',
            createdAt: new Date().toISOString(),
            reviewedAt: null
          });
          generated++;
          existingTargets.add(key);
        }
      }
    }

    for (const msg of messages) {
      if (!msg.reviewStatus || msg.reviewStatus === 'pending') {
        const key = `message:${msg.id}`;
        if (!existingTargets.has(key)) {
          reviewRecords.push({
            id: uuidv4(),
            exhibitionId: msg.exhibitionId,
            type: 'message',
            targetId: msg.id,
            content: msg.content ? (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : '',
            reason: '新留言待审核',
            status: 'pending',
            reviewer: '',
            reviewNote: '',
            createdAt: new Date().toISOString(),
            reviewedAt: null
          });
          generated++;
          existingTargets.add(key);
        }
      }
    }

    for (const ex of exhibitions) {
      const key = `exhibition:${ex.id}`;
      if (!existingTargets.has(key) && (!ex.description || !ex.coverImage)) {
        reviewRecords.push({
          id: uuidv4(),
          exhibitionId: ex.id,
          type: 'exhibition',
          targetId: ex.id,
          content: `展厅「${ex.title}」信息不完整`,
          reason: !ex.description ? '缺少描述' : '缺少封面图',
          status: 'pending',
          reviewer: '',
          reviewNote: '',
          createdAt: new Date().toISOString(),
          reviewedAt: null
        });
        generated++;
        existingTargets.add(key);
      }
    }

    saveCollection('reviewRecords', reviewRecords);
    return { success: true, generated };
  });

  fastify.get('/repair-logs', async (request) => {
    const { page = '1', pageSize = '20' } = request.query;
    const logs = getCollection('fileRepairLogs');
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = logs.length;
    const p = Math.max(1, parseInt(page));
    const ps = Math.max(1, parseInt(pageSize));
    const start = (p - 1) * ps;
    const items = logs.slice(start, start + ps);

    return { total, page: p, pageSize: ps, items };
  });
}
