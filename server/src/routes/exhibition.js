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
    const { title, description, coverImage, theme, visitorGroups, memorialDate } = request.body;
    const exhibitions = getCollection('exhibitions');
    const newExhibition = {
      id: uuidv4(),
      title: title || '未命名展厅',
      description: description || '',
      coverImage: coverImage || '',
      theme: theme || 'default',
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
    const { title, description, coverImage, theme, visitorGroups, memorialDate } = request.body;
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
    const currentYear = now.getFullYear();
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + parseInt(days));

    const results = exhibitions
      .filter(ex => ex.memorialDate)
      .map(ex => {
        const memDate = new Date(ex.memorialDate);
        const thisYearAnniversary = new Date(currentYear, memDate.getMonth(), memDate.getDate());
        if (thisYearAnniversary < now) {
          thisYearAnniversary.setFullYear(currentYear + 1);
        }
        const diffMs = thisYearAnniversary - now;
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const yearsSince = thisYearAnniversary.getFullYear() - memDate.getFullYear();

        return {
          exhibitionId: ex.id,
          exhibitionTitle: ex.title,
          exhibitionCover: ex.coverImage || '',
          memorialDate: ex.memorialDate,
          anniversaryDate: thisYearAnniversary.toISOString().split('T')[0],
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
    const currentYear = now.getFullYear();
    const thisYearAnniversary = new Date(currentYear, memDate.getMonth(), memDate.getDate());
    if (thisYearAnniversary < now) {
      thisYearAnniversary.setFullYear(currentYear + 1);
    }
    const yearsSince = thisYearAnniversary.getFullYear() - memDate.getFullYear();

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
}
