import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function exhibitionRoutes(fastify) {
  fastify.get('/', async () => {
    const exhibitions = getCollection('exhibitions');
    return exhibitions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === id);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    return exhibition;
  });

  fastify.post('/', async (request) => {
    const { title, description, coverImage, theme } = request.body;
    const exhibitions = getCollection('exhibitions');
    const newExhibition = {
      id: uuidv4(),
      title: title || '未命名展厅',
      description: description || '',
      coverImage: coverImage || '',
      theme: theme || 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    exhibitions.push(newExhibition);
    saveCollection('exhibitions', exhibitions);
    return newExhibition;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, coverImage, theme } = request.body;
    const exhibitions = getCollection('exhibitions');
    const index = exhibitions.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '展厅不存在' };
    }
    exhibitions[index] = {
      ...exhibitions[index],
      title: title !== undefined ? title : exhibitions[index].title,
      description: description !== undefined ? description : exhibitions[index].description,
      coverImage: coverImage !== undefined ? coverImage : exhibitions[index].coverImage,
      theme: theme !== undefined ? theme : exhibitions[index].theme,
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
}
