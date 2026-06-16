import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function timelineRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId, familyAlbumId } = request.query;
    let timelines = getCollection('timelines');
    const exhibitions = getCollection('exhibitions');
    if (familyAlbumId) {
      const albums = getCollection('familyAlbums');
      const album = albums.find(a => a.id === familyAlbumId);
      if (album && album.exhibitionIds) {
        timelines = timelines.filter(t => album.exhibitionIds.includes(t.exhibitionId));
      } else {
        timelines = [];
      }
    } else if (exhibitionId) {
      timelines = timelines.filter(t => t.exhibitionId === exhibitionId);
    }
    return timelines
      .map(t => {
        const exhibition = exhibitions.find(e => e.id === t.exhibitionId);
        return {
          ...t,
          exhibitionTitle: exhibition ? exhibition.title : null,
          exhibitionCover: exhibition ? exhibition.coverImage : null
        };
      })
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return new Date(a.eventDate) - new Date(b.eventDate);
      });
  });

  fastify.post('/batch/reorder', async (request) => {
    const { orders } = request.body;
    if (!Array.isArray(orders)) {
      return { error: 'orders 必须为数组' };
    }
    const timelines = getCollection('timelines');
    for (const item of orders) {
      const idx = timelines.findIndex(t => t.id === item.id);
      if (idx !== -1) {
        timelines[idx].order = item.order;
      }
    }
    saveCollection('timelines', timelines);
    return { success: true, updated: orders.length };
  });

  fastify.post('/batch/merge', async (request) => {
    const { nodeIds, title, eventDate } = request.body;
    if (!Array.isArray(nodeIds) || nodeIds.length < 2) {
      return { error: '至少需要选择两个节点才能合并' };
    }
    const timelines = getCollection('timelines');
    const nodesToMerge = nodeIds.map(id => timelines.find(t => t.id === id)).filter(Boolean);
    if (nodesToMerge.length < 2) {
      return { error: '未找到足够的有效节点' };
    }
    const mergedMaterialIds = nodesToMerge.reduce((acc, node) => {
      return acc.concat(node.materialIds || []);
    }, []);
    const uniqueMaterialIds = [...new Set(mergedMaterialIds)];
    const mergedDescriptions = nodesToMerge
      .filter(n => n.description)
      .map(n => n.description)
      .join('\n\n');
    const mergedNode = {
      id: uuidv4(),
      exhibitionId: nodesToMerge[0].exhibitionId,
      title: title || nodesToMerge.map(n => n.title).join(' + '),
      description: mergedDescriptions || '',
      eventDate: eventDate || nodesToMerge[0].eventDate,
      materialIds: uniqueMaterialIds,
      location: nodesToMerge[0].location || null,
      order: Math.min(...nodesToMerge.map(n => n.order !== undefined ? n.order : Infinity)),
      createdAt: new Date().toISOString()
    };
    const remaining = timelines.filter(t => !nodeIds.includes(t.id));
    remaining.push(mergedNode);
    saveCollection('timelines', remaining);
    return mergedNode;
  });

  fastify.post('/:id/split', async (request, reply) => {
    const { id } = request.params;
    const { splitMaterialGroups } = request.body;
    const timelines = getCollection('timelines');
    const index = timelines.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '时间节点不存在' };
    }
    const sourceNode = timelines[index];
    if (!Array.isArray(splitMaterialGroups) || splitMaterialGroups.length < 2) {
      reply.code(400);
      return { error: '至少需要两组素材才能拆分' };
    }
    const sourceMatIds = sourceNode.materialIds || [];
    if (sourceMatIds.length < 2) {
      reply.code(400);
      return { error: '该节点素材数量不足，无法拆分' };
    }
    const allAssignedMatIds = splitMaterialGroups.reduce((acc, g) => acc.concat(g.materialIds || []), []);
    const uniqueAssignedIds = [...new Set(allAssignedMatIds)];
    if (allAssignedMatIds.length !== uniqueAssignedIds.length) {
      reply.code(400);
      return { error: '存在重复分配的素材' };
    }
    const missingIds = sourceMatIds.filter(mid => !allAssignedMatIds.includes(mid));
    if (missingIds.length > 0) {
      reply.code(400);
      return { error: `有 ${missingIds.length} 个素材未分配` };
    }
    const extraIds = allAssignedMatIds.filter(mid => !sourceMatIds.includes(mid));
    if (extraIds.length > 0) {
      reply.code(400);
      return { error: '存在不属于该节点的素材' };
    }
    const emptyGroup = splitMaterialGroups.find(g => !g.materialIds || g.materialIds.length === 0);
    if (emptyGroup) {
      reply.code(400);
      return { error: '每个分组至少需要一个素材' };
    }
    const newNodes = splitMaterialGroups.map((group, i) => ({
      id: uuidv4(),
      exhibitionId: sourceNode.exhibitionId,
      title: group.title || `${sourceNode.title} (${i + 1})`,
      description: group.description || (i === 0 ? sourceNode.description : ''),
      eventDate: group.eventDate || sourceNode.eventDate,
      materialIds: group.materialIds || [],
      location: group.location || (i === 0 ? sourceNode.location : null),
      order: sourceNode.order !== undefined ? sourceNode.order + i : undefined,
      createdAt: new Date().toISOString()
    }));
    timelines.splice(index, 1, ...newNodes);
    saveCollection('timelines', timelines);
    return { created: newNodes };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const timelines = getCollection('timelines');
    const timeline = timelines.find(t => t.id === id);
    if (!timeline) {
      reply.code(404);
      return { error: '时间节点不存在' };
    }
    return timeline;
  });

  fastify.post('/', async (request) => {
    const { exhibitionId, title, description, eventDate, materialIds, location, order } = request.body;
    const timelines = getCollection('timelines');
    const exhibitionTimelines = timelines.filter(t => t.exhibitionId === exhibitionId);
    const newTimeline = {
      id: uuidv4(),
      exhibitionId,
      title: title || '',
      description: description || '',
      eventDate: eventDate || new Date().toISOString(),
      materialIds: materialIds || [],
      location: location || null,
      order: order !== undefined ? order : (exhibitionTimelines.length > 0
        ? Math.max(...exhibitionTimelines.map(t => t.order !== undefined ? t.order : 0)) + 1
        : 0),
      createdAt: new Date().toISOString()
    };
    timelines.push(newTimeline);
    saveCollection('timelines', timelines);
    return newTimeline;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, eventDate, materialIds, location, order } = request.body;
    const timelines = getCollection('timelines');
    const index = timelines.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '时间节点不存在' };
    }
    timelines[index] = {
      ...timelines[index],
      title: title !== undefined ? title : timelines[index].title,
      description: description !== undefined ? description : timelines[index].description,
      eventDate: eventDate !== undefined ? eventDate : timelines[index].eventDate,
      materialIds: materialIds !== undefined ? materialIds : timelines[index].materialIds,
      location: location !== undefined ? location : timelines[index].location,
      order: order !== undefined ? order : timelines[index].order
    };
    saveCollection('timelines', timelines);
    return timelines[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const timelines = getCollection('timelines');
    const filtered = timelines.filter(t => t.id !== id);
    if (filtered.length === timelines.length) {
      reply.code(404);
      return { error: '时间节点不存在' };
    }
    saveCollection('timelines', filtered);
    return { success: true };
  });
}
