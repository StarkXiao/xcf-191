import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const defaultVisitorGroups = [
  { id: 'family', name: '家人', color: '#E74C3C' },
  { id: 'friend', name: '朋友', color: '#3498DB' },
  { id: 'colleague', name: '同事', color: '#2ECC71' },
  { id: 'other', name: '其他访客', color: '#95A5A6' }
];

const ensureVisitorGroups = (exhibition) => {
  if (!exhibition.visitorGroups || !Array.isArray(exhibition.visitorGroups)) {
    return { ...exhibition, visitorGroups: [...defaultVisitorGroups] };
  }
  return exhibition;
};

export default async function exhibitionRoutes(fastify) {
  fastify.get('/', async () => {
    const exhibitions = getCollection('exhibitions');
    return exhibitions
      .map(ensureVisitorGroups)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    let exhibition = exhibitions.find(e => e.id === id);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    return ensureVisitorGroups(exhibition);
  });

  fastify.post('/', async (request) => {
    const { title, description, coverImage, theme, themeConfig, visitorGroups, memorialDate } = request.body;
    const exhibitions = getCollection('exhibitions');
    const newExhibition = {
      id: uuidv4(),
      title: title || '未命名展厅',
      description: description || '',
      coverImage: coverImage || '',
      theme: theme || 'default',
      themeConfig: themeConfig || null,
      visitorGroups: visitorGroups && visitorGroups.length > 0
        ? visitorGroups
        : [...defaultVisitorGroups],
      memorialDate: memorialDate || '',
      lastRemindedAt: null,
      revisitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    exhibitions.push(newExhibition);
    saveCollection('exhibitions', exhibitions);
    return newExhibition;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, coverImage, theme, themeConfig, visitorGroups, memorialDate } = request.body;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    const current = ensureVisitorGroups(exhibitions[index]);
    exhibitions[index] = {
      ...current,
      title: title !== undefined ? title : current.title,
      description: description !== undefined ? description : current.description,
      coverImage: coverImage !== undefined ? coverImage : current.coverImage,
      theme: theme !== undefined ? theme : current.theme,
      themeConfig: themeConfig !== undefined ? themeConfig : (current.themeConfig || null),
      visitorGroups: visitorGroups !== undefined ? visitorGroups : current.visitorGroups,
      memorialDate: memorialDate !== undefined ? memorialDate : (current.memorialDate || ''),
      lastRemindedAt: current.lastRemindedAt || null,
      revisitCount: current.revisitCount || 0,
      updatedAt: new Date().toISOString()
    };
    saveCollection('exhibitions', exhibitions);
    return exhibitions[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    const filtered = exhibitions.filter(e => e.id !== id);
    if (filtered.length === exhibitions.length) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const materials = getCollection('materials').filter(m => m.exhibitionId !== id);
    const timelines = getCollection('timelines').filter(t => t.exhibitionId !== id);
    const messages = getCollection('messages').filter(m => m.exhibitionId !== id);

    saveCollection('exhibitions', filtered);
    saveCollection('materials', materials);
    saveCollection('timelines', timelines);
    saveCollection('messages', messages);

    return { success: true };
  });

  fastify.get('/:id/visitor-groups', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === id);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    const withGroups = ensureVisitorGroups(exhibition);
    return withGroups.visitorGroups;
  });

  fastify.post('/:id/visitor-groups', async (request, reply) => {
    const { id } = request.params;
    const { name, color } = request.body;
    if (!name || !name.trim()) {
      reply.code(400);
      return { error: '分组名称不能为空' };
    }
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    const current = ensureVisitorGroups(exhibitions[index]);
    const newGroup = {
      id: uuidv4(),
      name: name.trim(),
      color: color || '#95A5A6',
      createdAt: new Date().toISOString()
    };
    current.visitorGroups.push(newGroup);
    current.updatedAt = new Date().toISOString();
    exhibitions[index] = current;
    saveCollection('exhibitions', exhibitions);
    return newGroup;
  });

  fastify.put('/:id/visitor-groups/:groupId', async (request, reply) => {
    const { id, groupId } = request.params;
    const { name, color } = request.body;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    const current = ensureVisitorGroups(exhibitions[index]);
    const groupIndex = current.visitorGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
      reply.code(404);
      return { error: '访客分组不存在' };
    }
    current.visitorGroups[groupIndex] = {
      ...current.visitorGroups[groupIndex],
      name: name !== undefined ? name.trim() : current.visitorGroups[groupIndex].name,
      color: color !== undefined ? color : current.visitorGroups[groupIndex].color
    };
    current.updatedAt = new Date().toISOString();
    exhibitions[index] = current;
    saveCollection('exhibitions', exhibitions);
    return current.visitorGroups[groupIndex];
  });

  fastify.delete('/:id/visitor-groups/:groupId', async (request, reply) => {
    const { id, groupId } = request.params;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    const current = ensureVisitorGroups(exhibitions[index]);
    const groupIndex = current.visitorGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) {
      reply.code(404);
      return { error: '访客分组不存在' };
    }
    current.visitorGroups.splice(groupIndex, 1);
    current.updatedAt = new Date().toISOString();
    exhibitions[index] = current;
    saveCollection('exhibitions', exhibitions);

    const messages = getCollection('messages');
    const updatedMessages = messages.map(m => {
      if (m.exhibitionId === id && m.visitorGroupId === groupId) {
        return { ...m, visitorGroupId: null };
      }
      if (m.exhibitionId === id && m.visibleGroupIds && Array.isArray(m.visibleGroupIds)) {
        return {
          ...m,
          visibleGroupIds: m.visibleGroupIds.filter(gid => gid !== groupId)
        };
      }
      return m;
    });
    saveCollection('messages', updatedMessages);

    return { success: true };
  });

  fastify.get('/anniversaries/upcoming', async (request) => {
    const { days = 30 } = request.query;
    const exhibitions = getCollection('exhibitions');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();

    const results = exhibitions
      .filter(ex => ex.memorialDate)
      .map(ex => {
        const memDate = new Date(ex.memorialDate);
        const thisYearAnniversary = new Date(currentYear, memDate.getMonth(), memDate.getDate());
        const anniversaryEndOfDay = new Date(currentYear, memDate.getMonth(), memDate.getDate(), 23, 59, 59);
        let anniversaryYear = currentYear;
        if (anniversaryEndOfDay < today) {
          anniversaryYear = currentYear + 1;
        }
        const nextAnniversary = new Date(anniversaryYear, memDate.getMonth(), memDate.getDate());
        const diffMs = nextAnniversary - today;
        const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const yearsSince = anniversaryYear - memDate.getFullYear();

        return {
          exhibitionId: ex.id,
          exhibitionTitle: ex.title,
          exhibitionCover: ex.coverImage || '',
          memorialDate: ex.memorialDate,
          anniversaryDate: nextAnniversary.toISOString().split('T')[0],
          daysUntil,
          yearsSince,
          revisitCount: ex.revisitCount || 0,
          lastRemindedAt: ex.lastRemindedAt || null
        };
      })
      .filter(item => item.daysUntil <= parseInt(days))
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return results;
  });

  fastify.post('/:id/anniversary-remind', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    if (!exhibitions[index].memorialDate) {
      reply.code(400);
      return { error: '该展厅未设置纪念日' };
    }
    exhibitions[index].lastRemindedAt = new Date().toISOString();
    exhibitions[index].updatedAt = new Date().toISOString();
    saveCollection('exhibitions', exhibitions);

    const memDate = new Date(exhibitions[index].memorialDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();
    const anniversaryEndOfDay = new Date(currentYear, memDate.getMonth(), memDate.getDate(), 23, 59, 59);
    let anniversaryYear = currentYear;
    if (anniversaryEndOfDay < today) {
      anniversaryYear = currentYear + 1;
    }
    const yearsSince = anniversaryYear - memDate.getFullYear();

    return {
      reminded: true,
      exhibitionId: id,
      exhibitionTitle: exhibitions[index].title,
      memorialDate: exhibitions[index].memorialDate,
      yearsSince,
      lastRemindedAt: exhibitions[index].lastRemindedAt
    };
  });

  fastify.post('/:id/revisit', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    exhibitions[index].revisitCount = (exhibitions[index].revisitCount || 0) + 1;
    exhibitions[index].updatedAt = new Date().toISOString();
    saveCollection('exhibitions', exhibitions);
    return {
      success: true,
      revisitCount: exhibitions[index].revisitCount
    };
  });

  fastify.get('/featured/memories', async (request) => {
    const { limit = 6 } = request.query;
    const exhibitions = getCollection('exhibitions');
    const timelines = getCollection('timelines');
    const messages = getCollection('messages');
    const materials = getCollection('materials');

    const calcTimelineHeat = (exhibitionId) => {
      const exTimelines = timelines.filter(t => t.exhibitionId === exhibitionId);
      if (exTimelines.length === 0) return { score: 0, detail: { nodeCount: 0, avgMaterials: 0, descRichness: 0 } };

      let totalMaterials = 0;
      let descCount = 0;
      exTimelines.forEach(t => {
        totalMaterials += (t.materialIds || []).length;
        if (t.description && t.description.trim().length > 0) descCount++;
      });

      const nodeCount = exTimelines.length;
      const avgMaterials = totalMaterials / nodeCount;
      const descRichness = descCount / nodeCount;

      const nodeScore = Math.min(nodeCount / 10, 1) * 40;
      const materialScore = Math.min(avgMaterials / 5, 1) * 35;
      const descScore = descRichness * 25;

      return {
        score: nodeScore + materialScore + descScore,
        detail: { nodeCount, avgMaterials: Math.round(avgMaterials * 10) / 10, descRichness: Math.round(descRichness * 100) }
      };
    };

    const calcMessageInteraction = (exhibitionId) => {
      const exMessages = messages.filter(m => m.exhibitionId === exhibitionId && m.reviewStatus === 'approved');
      if (exMessages.length === 0) return { score: 0, detail: { messageCount: 0, uniqueVisitors: 0, recentActivity: 0 } };

      const uniqueVisitors = new Set(exMessages.map(m => m.visitorSessionId || m.author)).size;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentMessages = exMessages.filter(m => new Date(m.createdAt) >= weekAgo).length;

      const countScore = Math.min(exMessages.length / 20, 1) * 40;
      const visitorScore = Math.min(uniqueVisitors / 10, 1) * 35;
      const recentScore = Math.min(recentMessages / 5, 1) * 25;

      return {
        score: countScore + visitorScore + recentScore,
        detail: { messageCount: exMessages.length, uniqueVisitors, recentActivity: recentMessages }
      };
    };

    const calcMaterialCompleteness = (exhibitionId) => {
      const exMaterials = materials.filter(m => m.exhibitionId === exhibitionId);
      if (exMaterials.length === 0) return { score: 0, detail: { totalCount: 0, typeDiversity: 0, qualityScore: 0 } };

      const types = new Set(exMaterials.map(m => m.type));
      const typeDiversity = types.size / 5;

      let qualityCount = 0;
      exMaterials.forEach(m => {
        let hasQuality = false;
        if (m.title && m.title.trim().length > 0) hasQuality = true;
        if (m.description && m.description.trim().length > 20) hasQuality = true;
        if (m.metadata && Object.keys(m.metadata).length > 0) hasQuality = true;
        if (hasQuality) qualityCount++;
      });
      const qualityScore = qualityCount / exMaterials.length;

      const countScore = Math.min(exMaterials.length / 30, 1) * 35;
      const diversityScore = Math.min(typeDiversity, 1) * 35;
      const qualityFinalScore = qualityScore * 30;

      return {
        score: countScore + diversityScore + qualityFinalScore,
        detail: { totalCount: exMaterials.length, typeDiversity: Math.round(typeDiversity * 100), qualityScore: Math.round(qualityScore * 100) }
      };
    };

    const featuredList = exhibitions
      .map(ex => {
        const timelineData = calcTimelineHeat(ex.id);
        const messageData = calcMessageInteraction(ex.id);
        const materialData = calcMaterialCompleteness(ex.id);

        const totalScore = timelineData.score * 0.35 + messageData.score * 0.35 + materialData.score * 0.30;

        const tags = [];
        if (timelineData.detail.nodeCount >= 5) tags.push('时光沉淀');
        if (messageData.detail.messageCount >= 5) tags.push('温情留言');
        if (materialData.detail.totalCount >= 10) tags.push('素材丰富');
        if (materialData.detail.typeDiversity >= 60) tags.push('多媒体');
        if (messageData.detail.recentActivity >= 2) tags.push('近期活跃');

        let highlightTimeline = null;
        const exTimelines = timelines.filter(t => t.exhibitionId === ex.id);
        if (exTimelines.length > 0) {
          const sorted = [...exTimelines].sort((a, b) => (b.materialIds || []).length - (a.materialIds || []).length);
          const best = sorted[0];
          const exTimelineMaterials = materials.filter(m => (best.materialIds || []).includes(m.id));
          const previewImage = exTimelineMaterials.find(m => m.type === 'image')?.url || null;
          highlightTimeline = {
            id: best.id,
            title: best.title,
            eventDate: best.eventDate,
            previewImage,
            materialCount: (best.materialIds || []).length
          };
        }

        let topMessage = null;
        const approvedMessages = messages.filter(m => m.exhibitionId === ex.id && m.reviewStatus === 'approved');
        if (approvedMessages.length > 0) {
          const sorted = [...approvedMessages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latest = sorted[0];
          topMessage = {
            author: latest.author,
            content: latest.content,
            avatar: latest.avatar,
            createdAt: latest.createdAt
          };
        }

        return {
          exhibitionId: ex.id,
          exhibitionTitle: ex.title,
          exhibitionCover: ex.coverImage || '',
          exhibitionDescription: ex.description || '',
          memorialDate: ex.memorialDate || '',
          totalScore: Math.round(totalScore * 10) / 10,
          scores: {
            timeline: Math.round(timelineData.score * 10) / 10,
            message: Math.round(messageData.score * 10) / 10,
            material: Math.round(materialData.score * 10) / 10
          },
          stats: {
            timelineNodes: timelineData.detail.nodeCount,
            messageCount: messageData.detail.messageCount,
            materialCount: materialData.detail.totalCount
          },
          tags,
          highlightTimeline,
          topMessage,
          revisitCount: ex.revisitCount || 0,
          createdAt: ex.createdAt
        };
      })
      .filter(item => item.totalScore > 5)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, parseInt(limit));

    return featuredList;
  });
}
