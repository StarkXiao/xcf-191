import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const DEFAULT_CATEGORIES = [
  { id: 'default-image', name: '照片影像', type: 'image', icon: '📷', color: '#ffd700', sort: 1 },
  { id: 'default-audio', name: '语音音频', type: 'audio', icon: '🎵', color: '#87ceeb', sort: 2 },
  { id: 'default-video', name: '视频录像', type: 'video', icon: '🎬', color: '#dda0dd', sort: 3 },
  { id: 'default-text', name: '文字手札', type: 'text', icon: '✎', color: '#f4a460', sort: 4 }
];

const initDefaultCategories = () => {
  const categories = getCollection('relicCategories');
  if (categories.length === 0) {
    saveCollection('relicCategories', DEFAULT_CATEGORIES.map(c => ({
      ...c,
      createdAt: new Date().toISOString()
    })));
  }
};

initDefaultCategories();

export default async function relicRoutes(fastify) {

  fastify.get('/categories', async () => {
    const categories = getCollection('relicCategories');
    return categories.sort((a, b) => a.sort - b.sort);
  });

  fastify.post('/categories', async (request) => {
    const { name, type, icon, color, sort } = request.body;
    const categories = getCollection('relicCategories');
    const newCategory = {
      id: uuidv4(),
      name: name || '新分类',
      type: type || 'other',
      icon: icon || '📁',
      color: color || '#98fb98',
      sort: sort !== undefined ? sort : categories.length + 1,
      createdAt: new Date().toISOString()
    };
    categories.push(newCategory);
    saveCollection('relicCategories', categories);
    return newCategory;
  });

  fastify.put('/categories/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, type, icon, color, sort } = request.body;
    const categories = getCollection('relicCategories');
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '分类不存在' };
    }
    categories[index] = {
      ...categories[index],
      name: name !== undefined ? name : categories[index].name,
      type: type !== undefined ? type : categories[index].type,
      icon: icon !== undefined ? icon : categories[index].icon,
      color: color !== undefined ? color : categories[index].color,
      sort: sort !== undefined ? sort : categories[index].sort
    };
    saveCollection('relicCategories', categories);
    return categories[index];
  });

  fastify.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params;
    if (id.startsWith('default-')) {
      reply.code(400);
      return { error: '默认分类不可删除' };
    }
    const categories = getCollection('relicCategories');
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length === categories.length) {
      reply.code(404);
      return { error: '分类不存在' };
    }
    const relics = getCollection('relics');
    const updatedRelics = relics.map(r => {
      if (r.categoryId === id) {
        const defaultCat = DEFAULT_CATEGORIES.find(dc => dc.type === r.type) || DEFAULT_CATEGORIES[3];
        return { ...r, categoryId: defaultCat.id };
      }
      return r;
    });
    saveCollection('relicCategories', filtered);
    saveCollection('relics', updatedRelics);
    return { success: true };
  });

  fastify.get('/relics', async (request) => {
    const { categoryId, type, archived, keyword, sortBy, sortOrder, page, pageSize } = request.query;
    let relics = getCollection('relics');

    if (categoryId) relics = relics.filter(r => r.categoryId === categoryId);
    if (type) relics = relics.filter(r => r.type === type);
    if (archived !== undefined) {
      const isArchived = archived === 'true' || archived === true;
      relics = relics.filter(r => !!r.archived === isArchived);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      relics = relics.filter(r =>
        (r.title && r.title.toLowerCase().includes(kw)) ||
        (r.description && r.description.toLowerCase().includes(kw)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(kw)))
      );
    }

    const sortField = sortBy || 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    relics.sort((a, b) => {
      const va = a[sortField] || '';
      const vb = b[sortField] || '';
      if (va < vb) return -1 * order;
      if (va > vb) return 1 * order;
      return 0;
    });

    const total = relics.length;

    if (page && pageSize) {
      const p = parseInt(page, 10);
      const ps = parseInt(pageSize, 10);
      const start = (p - 1) * ps;
      relics = relics.slice(start, start + ps);
    }

    return {
      items: relics,
      total,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : total
    };
  });

  fastify.get('/relics/:id', async (request, reply) => {
    const { id } = request.params;
    const relics = getCollection('relics');
    const relic = relics.find(r => r.id === id);
    if (!relic) {
      reply.code(404);
      return { error: '遗物不存在' };
    }
    return relic;
  });

  fastify.post('/relics', async (request) => {
    const { categoryId, type, url, title, description, tags, metadata, exhibitionId, familyAlbumId } = request.body;
    const relics = getCollection('relics');
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const categories = getCollection('relicCategories');
      const defaultCat = categories.find(c => c.type === type && c.id.startsWith('default-'));
      finalCategoryId = defaultCat ? defaultCat.id : (categories[0]?.id || 'default-text');
    }
    const newRelic = {
      id: uuidv4(),
      categoryId: finalCategoryId,
      type: type || 'text',
      url: url || '',
      title: title || '未命名遗物',
      description: description || '',
      tags: tags || [],
      metadata: metadata || {},
      exhibitionId: exhibitionId || null,
      familyAlbumId: familyAlbumId || null,
      archived: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    relics.push(newRelic);
    saveCollection('relics', relics);
    return newRelic;
  });

  fastify.put('/relics/:id', async (request, reply) => {
    const { id } = request.params;
    const { categoryId, title, description, tags, metadata, archived, exhibitionId, familyAlbumId } = request.body;
    const relics = getCollection('relics');
    const index = relics.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '遗物不存在' };
    }
    const now = new Date().toISOString();
    const wasArchived = relics[index].archived;
    relics[index] = {
      ...relics[index],
      categoryId: categoryId !== undefined ? categoryId : relics[index].categoryId,
      title: title !== undefined ? title : relics[index].title,
      description: description !== undefined ? description : relics[index].description,
      tags: tags !== undefined ? tags : relics[index].tags,
      metadata: metadata !== undefined ? metadata : relics[index].metadata,
      exhibitionId: exhibitionId !== undefined ? exhibitionId : relics[index].exhibitionId,
      familyAlbumId: familyAlbumId !== undefined ? familyAlbumId : relics[index].familyAlbumId,
      archived: archived !== undefined ? archived : relics[index].archived,
      archivedAt: archived !== undefined && archived !== wasArchived
        ? (archived ? now : null)
        : relics[index].archivedAt,
      updatedAt: now
    };
    saveCollection('relics', relics);
    return relics[index];
  });

  fastify.delete('/relics/:id', async (request, reply) => {
    const { id } = request.params;
    const relics = getCollection('relics');
    const filtered = relics.filter(r => r.id !== id);
    if (filtered.length === relics.length) {
      reply.code(404);
      return { error: '遗物不存在' };
    }
    saveCollection('relics', filtered);
    return { success: true };
  });

  fastify.post('/relics/batch/archive', async (request) => {
    const { ids, archived } = request.body;
    const relics = getCollection('relics');
    const now = new Date().toISOString();
    const updated = relics.map(r => {
      if (ids.includes(r.id)) {
        return {
          ...r,
          archived: !!archived,
          archivedAt: archived ? now : null,
          updatedAt: now
        };
      }
      return r;
    });
    saveCollection('relics', updated);
    return { success: true, count: ids.length };
  });

  fastify.post('/relics/batch/migrate', async (request) => {
    const { ids, targetCategoryId, targetExhibitionId, targetFamilyAlbumId } = request.body;
    const relics = getCollection('relics');
    const now = new Date().toISOString();
    const updated = relics.map(r => {
      if (ids.includes(r.id)) {
        return {
          ...r,
          categoryId: targetCategoryId !== undefined ? targetCategoryId : r.categoryId,
          exhibitionId: targetExhibitionId !== undefined ? targetExhibitionId : r.exhibitionId,
          familyAlbumId: targetFamilyAlbumId !== undefined ? targetFamilyAlbumId : r.familyAlbumId,
          updatedAt: now
        };
      }
      return r;
    });
    saveCollection('relics', updated);
    return { success: true, count: ids.length };
  });

  fastify.post('/relics/batch/delete', async (request) => {
    const { ids } = request.body;
    const relics = getCollection('relics');
    const filtered = relics.filter(r => !ids.includes(r.id));
    const deleted = relics.length - filtered.length;
    saveCollection('relics', filtered);
    return { success: true, count: deleted };
  });

  fastify.post('/relics/:id/import-from-material', async (request, reply) => {
    const { materialId, categoryId } = request.body;
    const materials = getCollection('materials');
    const material = materials.find(m => m.id === materialId);
    if (!material) {
      reply.code(404);
      return { error: '素材不存在' };
    }
    const relics = getCollection('relics');
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const categories = getCollection('relicCategories');
      const defaultCat = categories.find(c => c.type === material.type && c.id.startsWith('default-'));
      finalCategoryId = defaultCat ? defaultCat.id : (categories[0]?.id || 'default-text');
    }
    const newRelic = {
      id: uuidv4(),
      categoryId: finalCategoryId,
      type: material.type || 'text',
      url: material.url || '',
      title: material.title || '未命名遗物',
      description: material.description || '',
      tags: [],
      metadata: material.metadata || {},
      exhibitionId: material.exhibitionId || null,
      familyAlbumId: null,
      archived: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    relics.push(newRelic);
    saveCollection('relics', relics);
    return newRelic;
  });

  fastify.get('/rules', async () => {
    const rules = getCollection('archiveRules');
    return rules.sort((a, b) => a.sort - b.sort);
  });

  fastify.post('/rules', async (request) => {
    const { name, conditions, action, enabled, sort } = request.body;
    const rules = getCollection('archiveRules');
    const newRule = {
      id: uuidv4(),
      name: name || '新归档规则',
      conditions: conditions || { types: [], keywords: [], dateRange: null, categoryIds: [] },
      action: action || { archive: true, targetCategoryId: null },
      enabled: enabled !== undefined ? enabled : true,
      sort: sort !== undefined ? sort : rules.length + 1,
      createdAt: new Date().toISOString(),
      lastRunAt: null
    };
    rules.push(newRule);
    saveCollection('archiveRules', rules);
    return newRule;
  });

  fastify.put('/rules/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, conditions, action, enabled, sort } = request.body;
    const rules = getCollection('archiveRules');
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '规则不存在' };
    }
    rules[index] = {
      ...rules[index],
      name: name !== undefined ? name : rules[index].name,
      conditions: conditions !== undefined ? conditions : rules[index].conditions,
      action: action !== undefined ? action : rules[index].action,
      enabled: enabled !== undefined ? enabled : rules[index].enabled,
      sort: sort !== undefined ? sort : rules[index].sort
    };
    saveCollection('archiveRules', rules);
    return rules[index];
  });

  fastify.delete('/rules/:id', async (request, reply) => {
    const { id } = request.params;
    const rules = getCollection('archiveRules');
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length === rules.length) {
      reply.code(404);
      return { error: '规则不存在' };
    }
    saveCollection('archiveRules', filtered);
    return { success: true };
  });

  fastify.post('/rules/:id/execute', async (request, reply) => {
    const { id } = request.params;
    const rules = getCollection('archiveRules');
    const rule = rules.find(r => r.id === id);
    if (!rule) {
      reply.code(404);
      return { error: '规则不存在' };
    }
    const relics = getCollection('relics');
    const { conditions, action } = rule;
    const now = new Date().toISOString();
    let matchedCount = 0;

    const matches = relics.map(r => {
      let matched = true;
      if (conditions.types && conditions.types.length > 0) {
        matched = matched && conditions.types.includes(r.type);
      }
      if (conditions.categoryIds && conditions.categoryIds.length > 0) {
        matched = matched && conditions.categoryIds.includes(r.categoryId);
      }
      if (conditions.keywords && conditions.keywords.length > 0) {
        const searchText = `${r.title} ${r.description} ${(r.tags || []).join(' ')}`.toLowerCase();
        matched = matched && conditions.keywords.some(kw => searchText.includes(kw.toLowerCase()));
      }
      if (conditions.dateRange && (conditions.dateRange.from || conditions.dateRange.to)) {
        const date = new Date(r.createdAt);
        if (conditions.dateRange.from) {
          matched = matched && date >= new Date(conditions.dateRange.from);
        }
        if (conditions.dateRange.to) {
          matched = matched && date <= new Date(conditions.dateRange.to);
        }
      }
      return { relic: r, matched };
    });

    const updated = matches.map(({ relic, matched }) => {
      if (!matched) return relic;
      matchedCount++;
      const newRelic = { ...relic, updatedAt: now };
      if (action.archive !== undefined) {
        newRelic.archived = !!action.archive;
        newRelic.archivedAt = action.archive ? now : null;
      }
      if (action.targetCategoryId) {
        newRelic.categoryId = action.targetCategoryId;
      }
      return newRelic;
    });

    const ruleIndex = rules.findIndex(r => r.id === id);
    rules[ruleIndex] = { ...rule, lastRunAt: now };
    saveCollection('archiveRules', rules);
    saveCollection('relics', updated);
    return { success: true, matched: matchedCount };
  });

  fastify.post('/rules/execute-all', async () => {
    const rules = getCollection('archiveRules').filter(r => r.enabled).sort((a, b) => a.sort - b.sort);
    const relics = getCollection('relics');
    const now = new Date().toISOString();
    let totalMatched = 0;

    let updatedRelics = [...relics];
    const updatedRules = [...rules];

    for (const rule of updatedRules) {
      const { conditions, action } = rule;
      let matchedCount = 0;

      updatedRelics = updatedRelics.map(r => {
        let matched = true;
        if (conditions.types && conditions.types.length > 0) {
          matched = matched && conditions.types.includes(r.type);
        }
        if (conditions.categoryIds && conditions.categoryIds.length > 0) {
          matched = matched && conditions.categoryIds.includes(r.categoryId);
        }
        if (conditions.keywords && conditions.keywords.length > 0) {
          const searchText = `${r.title} ${r.description} ${(r.tags || []).join(' ')}`.toLowerCase();
          matched = matched && conditions.keywords.some(kw => searchText.includes(kw.toLowerCase()));
        }
        if (conditions.dateRange && (conditions.dateRange.from || conditions.dateRange.to)) {
          const date = new Date(r.createdAt);
          if (conditions.dateRange.from) {
            matched = matched && date >= new Date(conditions.dateRange.from);
          }
          if (conditions.dateRange.to) {
            matched = matched && date <= new Date(conditions.dateRange.to);
          }
        }
        if (!matched) return r;

        matchedCount++;
        const newRelic = { ...r, updatedAt: now };
        if (action.archive !== undefined) {
          newRelic.archived = !!action.archive;
          newRelic.archivedAt = action.archive ? now : null;
        }
        if (action.targetCategoryId) {
          newRelic.categoryId = action.targetCategoryId;
        }
        return newRelic;
      });

      totalMatched += matchedCount;
      const ruleIndex = rules.findIndex(r => r.id === rule.id);
      if (ruleIndex !== -1) {
        updatedRules[ruleIndex] = { ...rule, lastRunAt: now };
      }
    }

    saveCollection('archiveRules', updatedRules);
    saveCollection('relics', updatedRelics);
    return { success: true, totalMatched, rulesExecuted: rules.length };
  });

  fastify.get('/stats/summary', async () => {
    const relics = getCollection('relics');
    const categories = getCollection('relicCategories');

    const byType = { image: 0, audio: 0, video: 0, text: 0, other: 0 };
    const byCategory = {};
    let archived = 0;
    let notArchived = 0;

    categories.forEach(c => { byCategory[c.id] = 0; });

    relics.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (byCategory[r.categoryId] !== undefined) {
        byCategory[r.categoryId]++;
      }
      if (r.archived) archived++; else notArchived++;
    });

    return {
      total: relics.length,
      archived,
      notArchived,
      byType,
      byCategory,
      categoryCount: categories.length
    };
  });
}
