import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { join } from 'path';
import { getCollection, saveCollection } from '../storage.js';
import { UPLOADS_DIR } from '../config.js';

export default async function materialRoutes(fastify) {
  fastify.get('/', async (request) => {
    const {
      exhibitionId,
      type,
      timelineNodeId,
      startDate,
      endDate,
      keyword
    } = request.query;

    let materials = getCollection('materials').filter(m => !m.deleted);

    if (exhibitionId) {
      materials = materials.filter(m => m.exhibitionId === exhibitionId);
    }

    if (type) {
      let typeList;
      if (Array.isArray(type)) {
        typeList = type;
      } else if (typeof type === 'string') {
        typeList = type.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        typeList = [type];
      }
      materials = materials.filter(m => typeList.includes(m.type));
    }

    if (timelineNodeId) {
      const timelines = getCollection('timelines');
      const node = timelines.find(t => t.id === timelineNodeId);
      if (node && node.materialIds) {
        materials = materials.filter(m => node.materialIds.includes(m.id));
      } else {
        materials = [];
      }
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      materials = materials.filter(m => new Date(m.createdAt).getTime() >= start);
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      const end = new Date(
        endDateObj.getFullYear(),
        endDateObj.getMonth(),
        endDateObj.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
      materials = materials.filter(m => new Date(m.createdAt).getTime() <= end);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      materials = materials.filter(m =>
        (m.title && m.title.toLowerCase().includes(kw)) ||
        (m.description && m.description.toLowerCase().includes(kw))
      );
    }

    return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const material = materials.find(m => m.id === id && !m.deleted);
    if (!material) {
      reply.code(404);
      return { error: '素材不存在' };
    }
    return material;
  });

  fastify.post('/', async (request) => {
    const { exhibitionId, type, url, title, description, metadata } = request.body;
    const materials = getCollection('materials');
    const newMaterial = {
      id: uuidv4(),
      exhibitionId,
      type: type || 'text',
      url: url || '',
      title: title || '',
      description: description || '',
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      deletedRelations: null
    };
    materials.push(newMaterial);
    saveCollection('materials', materials);
    return newMaterial;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, metadata } = request.body;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === id && !m.deleted);
    if (index === -1) {
      reply.code(404);
      return { error: '素材不存在' };
    }
    materials[index] = {
      ...materials[index],
      title: title !== undefined ? title : materials[index].title,
      description: description !== undefined ? description : materials[index].description,
      metadata: metadata !== undefined ? metadata : materials[index].metadata,
      updatedAt: new Date().toISOString()
    };
    saveCollection('materials', materials);
    return materials[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === id && !m.deleted);
    if (index === -1) {
      reply.code(404);
      return { error: '素材不存在' };
    }

    const timelines = getCollection('timelines');
    const relatedTimelineNodes = timelines
      .filter(t => (t.materialIds || []).includes(id))
      .map(t => ({
        nodeId: t.id,
        nodeTitle: t.title,
        exhibitionId: t.exhibitionId
      }));

    timelines.forEach(t => {
      if (t.materialIds && t.materialIds.includes(id)) {
        t.materialIds = t.materialIds.filter(mid => mid !== id);
      }
    });
    saveCollection('timelines', timelines);

    materials[index] = {
      ...materials[index],
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedRelations: {
        timelineNodes: relatedTimelineNodes
      }
    };

    saveCollection('materials', materials);
    return { success: true, deletedAt: materials[index].deletedAt };
  });

  fastify.get('/recycle/list', async (request) => {
    const { exhibitionId, type, keyword, page = '1', pageSize = '20' } = request.query;

    let materials = getCollection('materials').filter(m => m.deleted);

    if (exhibitionId) {
      materials = materials.filter(m => m.exhibitionId === exhibitionId);
    }

    if (type) {
      let typeList;
      if (Array.isArray(type)) {
        typeList = type;
      } else if (typeof type === 'string') {
        typeList = type.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        typeList = [type];
      }
      materials = materials.filter(m => typeList.includes(m.type));
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      materials = materials.filter(m =>
        (m.title && m.title.toLowerCase().includes(kw)) ||
        (m.description && m.description.toLowerCase().includes(kw))
      );
    }

    materials.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    const total = materials.length;
    const p = Math.max(1, parseInt(page));
    const ps = Math.max(1, parseInt(pageSize));
    const start = (p - 1) * ps;
    const items = materials.slice(start, start + ps);

    const exhibitions = getCollection('exhibitions');
    const exMap = {};
    exhibitions.forEach(e => { exMap[e.id] = e.title; });

    return {
      total,
      page: p,
      pageSize: ps,
      items: items.map(m => ({
        ...m,
        exhibitionTitle: exMap[m.exhibitionId] || '未知展厅'
      }))
    };
  });

  fastify.post('/recycle/:id/restore', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === id && m.deleted);

    if (index === -1) {
      reply.code(404);
      return { error: '回收站中未找到该素材' };
    }

    const deletedRelations = materials[index].deletedRelations || {};
    const restoredRelations = { timelineNodes: [] };

    if (deletedRelations.timelineNodes && deletedRelations.timelineNodes.length > 0) {
      const timelines = getCollection('timelines');
      const timelineIdsToRestore = deletedRelations.timelineNodes.map(n => n.nodeId);

      timelines.forEach(t => {
        if (timelineIdsToRestore.includes(t.id)) {
          if (!t.materialIds) {
            t.materialIds = [];
          }
          if (!t.materialIds.includes(id)) {
            t.materialIds.push(id);
            restoredRelations.timelineNodes.push({
              nodeId: t.id,
              nodeTitle: t.title
            });
          }
        }
      });

      saveCollection('timelines', timelines);
    }

    materials[index] = {
      ...materials[index],
      deleted: false,
      deletedAt: null,
      deletedRelations: null,
      restoredAt: new Date().toISOString()
    };

    saveCollection('materials', materials);

    return {
      success: true,
      material: materials[index],
      restoredRelations
    };
  });

  fastify.delete('/recycle/:id', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === id && m.deleted);

    if (index === -1) {
      reply.code(404);
      return { error: '回收站中未找到该素材' };
    }

    const material = materials[index];
    if (material.url && material.url.startsWith('/uploads/')) {
      const relativePath = material.url.replace('/uploads/', '');
      const filePath = join(UPLOADS_DIR, relativePath);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    materials.splice(index, 1);
    saveCollection('materials', materials);

    return { success: true };
  });

  fastify.post('/recycle/batch-restore', async (request) => {
    const { ids } = request.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return { error: 'ids 不能为空' };
    }

    const materials = getCollection('materials');
    const timelines = getCollection('timelines');
    let restoredCount = 0;
    const restoredItems = [];

    for (const id of ids) {
      const index = materials.findIndex(m => m.id === id && m.deleted);
      if (index === -1) continue;

      const deletedRelations = materials[index].deletedRelations || {};

      if (deletedRelations.timelineNodes && deletedRelations.timelineNodes.length > 0) {
        const timelineIdsToRestore = deletedRelations.timelineNodes.map(n => n.nodeId);
        timelines.forEach(t => {
          if (timelineIdsToRestore.includes(t.id)) {
            if (!t.materialIds) {
              t.materialIds = [];
            }
            if (!t.materialIds.includes(id)) {
              t.materialIds.push(id);
            }
          }
        });
      }

      materials[index] = {
        ...materials[index],
        deleted: false,
        deletedAt: null,
        deletedRelations: null,
        restoredAt: new Date().toISOString()
      };

      restoredCount++;
      restoredItems.push(materials[index]);
    }

    saveCollection('materials', materials);
    saveCollection('timelines', timelines);

    return { success: true, restored: restoredCount, items: restoredItems };
  });

  fastify.post('/recycle/batch-delete', async (request) => {
    const { ids } = request.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return { error: 'ids 不能为空' };
    }

    const materials = getCollection('materials');
    let deletedCount = 0;

    for (const id of ids) {
      const index = materials.findIndex(m => m.id === id && m.deleted);
      if (index === -1) continue;

      const material = materials[index];
      if (material.url && material.url.startsWith('/uploads/')) {
        const relativePath = material.url.replace('/uploads/', '');
        const filePath = join(UPLOADS_DIR, relativePath);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }

      materials.splice(index, 1);
      deletedCount++;
    }

    saveCollection('materials', materials);

    return { success: true, deleted: deletedCount };
  });

  fastify.get('/recycle/stats', async () => {
    const materials = getCollection('materials');
    const deletedMaterials = materials.filter(m => m.deleted);

    const typeCount = {};
    deletedMaterials.forEach(m => {
      const t = m.type || 'unknown';
      typeCount[t] = (typeCount[t] || 0) + 1;
    });

    let totalSize = 0;
    deletedMaterials.forEach(m => {
      if (m.url && m.url.startsWith('/uploads/')) {
        const relativePath = m.url.replace('/uploads/', '');
        const filePath = join(UPLOADS_DIR, relativePath);
        try {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            totalSize += stat.size;
          }
        } catch {}
      }
    });

    return {
      total: deletedMaterials.length,
      typeCount,
      totalFileSize: totalSize
    };
  });
}
