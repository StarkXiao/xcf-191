import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function materialRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId } = request.query;
    let materials = getCollection('materials');
    if (exhibitionId) {
      materials = materials.filter(m => m.exhibitionId === exhibitionId);
    }
    return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const material = materials.find(m => m.id === id);
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
      createdAt: new Date().toISOString()
    };
    materials.push(newMaterial);
    saveCollection('materials', materials);
    return newMaterial;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, metadata } = request.body;
    const materials = getCollection('materials');
    const index = materials.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '素材不存在' };
    }
    materials[index] = {
      ...materials[index],
      title: title !== undefined ? title : materials[index].title,
      description: description !== undefined ? description : materials[index].description,
      metadata: metadata !== undefined ? metadata : materials[index].metadata
    };
    saveCollection('materials', materials);
    return materials[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const materials = getCollection('materials');
    const filtered = materials.filter(m => m.id !== id);
    if (filtered.length === materials.length) {
      reply.code(404);
      return { error: '素材不存在' };
    }
    saveCollection('materials', filtered);
    return { success: true };
  });
}
