import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function collectionRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { type, keyword } = request.query;
    let collections = getCollection('collections');
    
    if (type) {
      collections = collections.filter(c => c.type === type);
    }
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      collections = collections.filter(c => 
        c.title.toLowerCase().includes(kw) ||
        c.description.toLowerCase().includes(kw) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(kw)))
      );
    }
    
    return collections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const collections = getCollection('collections');
    const collection = collections.find(c => c.id === id);
    if (!collection) {
      reply.code(404);
      return { error: '专题不存在' };
    }
    return collection;
  });

  fastify.get('/:id/detail', async (request, reply) => {
    const { id } = request.params;
    const collections = getCollection('collections');
    const collection = collections.find(c => c.id === id);
    if (!collection) {
      reply.code(404);
      return { error: '专题不存在' };
    }

    const exhibitions = getCollection('exhibitions');
    const materials = getCollection('materials');
    const timelines = getCollection('timelines');

    const collectionExhibitions = exhibitions.filter(e => 
      collection.exhibitionIds && collection.exhibitionIds.includes(e.id)
    );

    const allMaterials = materials.filter(m => 
      collection.exhibitionIds && collection.exhibitionIds.includes(m.exhibitionId)
    );

    const allTimelines = timelines.filter(t => 
      collection.exhibitionIds && collection.exhibitionIds.includes(t.exhibitionId)
    );

    return {
      ...collection,
      exhibitions: collectionExhibitions,
      materials: allMaterials,
      timelines: allTimelines,
      stats: {
        exhibitionCount: collectionExhibitions.length,
        materialCount: allMaterials.length,
        timelineCount: allTimelines.length
      }
    };
  });

  fastify.post('/', async (request) => {
    const { 
      title, description, coverImage, type, 
      tags, exhibitionIds, config, personInfo, eventInfo 
    } = request.body;
    
    const collections = getCollection('collections');
    const newCollection = {
      id: uuidv4(),
      title: title || '未命名专题',
      description: description || '',
      coverImage: coverImage || '',
      type: type || 'person',
      tags: tags || [],
      exhibitionIds: exhibitionIds || [],
      config: config || { layout: 'grid', sortBy: 'date' },
      personInfo: personInfo || {},
      eventInfo: eventInfo || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    collections.push(newCollection);
    saveCollection('collections', collections);
    return newCollection;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { 
      title, description, coverImage, type, 
      tags, exhibitionIds, config, personInfo, eventInfo 
    } = request.body;
    
    const collections = getCollection('collections');
    const index = collections.findIndex(c => c.id === id);
    
    if (index === -1) {
      reply.code(404);
      return { error: '专题不存在' };
    }
    
    collections[index] = {
      ...collections[index],
      title: title !== undefined ? title : collections[index].title,
      description: description !== undefined ? description : collections[index].description,
      coverImage: coverImage !== undefined ? coverImage : collections[index].coverImage,
      type: type !== undefined ? type : collections[index].type,
      tags: tags !== undefined ? tags : collections[index].tags,
      exhibitionIds: exhibitionIds !== undefined ? exhibitionIds : collections[index].exhibitionIds,
      config: config !== undefined ? { ...collections[index].config, ...config } : collections[index].config,
      personInfo: personInfo !== undefined ? { ...collections[index].personInfo, ...personInfo } : collections[index].personInfo,
      eventInfo: eventInfo !== undefined ? { ...collections[index].eventInfo, ...eventInfo } : collections[index].eventInfo,
      updatedAt: new Date().toISOString()
    };
    
    saveCollection('collections', collections);
    return collections[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const collections = getCollection('collections');
    const filtered = collections.filter(c => c.id !== id);
    
    if (filtered.length === collections.length) {
      reply.code(404);
      return { error: '专题不存在' };
    }
    
    saveCollection('collections', filtered);
    return { success: true };
  });

  fastify.post('/:id/exhibitions', async (request, reply) => {
    const { id } = request.params;
    const { exhibitionId } = request.body;
    
    const collections = getCollection('collections');
    const index = collections.findIndex(c => c.id === id);
    
    if (index === -1) {
      reply.code(404);
      return { error: '专题不存在' };
    }
    
    if (!collections[index].exhibitionIds) {
      collections[index].exhibitionIds = [];
    }
    
    if (!collections[index].exhibitionIds.includes(exhibitionId)) {
      collections[index].exhibitionIds.push(exhibitionId);
      collections[index].updatedAt = new Date().toISOString();
      saveCollection('collections', collections);
    }
    
    return collections[index];
  });

  fastify.delete('/:id/exhibitions/:exhibitionId', async (request, reply) => {
    const { id, exhibitionId } = request.params;
    
    const collections = getCollection('collections');
    const index = collections.findIndex(c => c.id === id);
    
    if (index === -1) {
      reply.code(404);
      return { error: '专题不存在' };
    }
    
    collections[index].exhibitionIds = (collections[index].exhibitionIds || [])
      .filter(eid => eid !== exhibitionId);
    collections[index].updatedAt = new Date().toISOString();
    
    saveCollection('collections', collections);
    return collections[index];
  });

  fastify.get('/search/materials', async (request) => {
    const { keyword, type, collectionId } = request.query;
    let materials = getCollection('materials');
    let exhibitions = getCollection('exhibitions');

    if (collectionId) {
      const collections = getCollection('collections');
      const collection = collections.find(c => c.id === collectionId);
      if (collection && collection.exhibitionIds) {
        materials = materials.filter(m => collection.exhibitionIds.includes(m.exhibitionId));
      }
    }

    if (type) {
      materials = materials.filter(m => m.type === type);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      materials = materials.filter(m =>
        (m.title && m.title.toLowerCase().includes(kw)) ||
        (m.description && m.description.toLowerCase().includes(kw))
      );
    }

    const exhibitionMap = {};
    exhibitions.forEach(e => { exhibitionMap[e.id] = e; });

    const result = materials.map(m => ({
      ...m,
      exhibition: exhibitionMap[m.exhibitionId] || null
    }));

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/aggregate/by-person', async () => {
    const collections = getCollection('collections');
    const personCollections = collections.filter(c => c.type === 'person');
    
    return personCollections.map(c => ({
      id: c.id,
      title: c.title,
      coverImage: c.coverImage,
      description: c.description,
      personInfo: c.personInfo,
      exhibitionCount: (c.exhibitionIds || []).length,
      createdAt: c.createdAt
    }));
  });

  fastify.get('/aggregate/by-event', async () => {
    const collections = getCollection('collections');
    const eventCollections = collections.filter(c => c.type === 'event');
    
    return eventCollections.map(c => ({
      id: c.id,
      title: c.title,
      coverImage: c.coverImage,
      description: c.description,
      eventInfo: c.eventInfo,
      exhibitionCount: (c.exhibitionIds || []).length,
      createdAt: c.createdAt
    }));
  });
}
