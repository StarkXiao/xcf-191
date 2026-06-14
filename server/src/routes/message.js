import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function messageRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId } = request.query;
    let messages = getCollection('messages');
    if (exhibitionId) {
      messages = messages.filter(m => m.exhibitionId === exhibitionId);
    }
    return messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.post('/', async (request) => {
    const { exhibitionId, author, content, avatar } = request.body;
    const messages = getCollection('messages');
    const newMessage = {
      id: uuidv4(),
      exhibitionId,
      author: author || '匿名访客',
      content: content || '',
      avatar: avatar || '',
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    saveCollection('messages', messages);
    return newMessage;
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const messages = getCollection('messages');
    const filtered = messages.filter(m => m.id !== id);
    if (filtered.length === messages.length) {
      reply.code(404);
      return { error: '留言不存在' };
    }
    saveCollection('messages', filtered);
    return { success: true };
  });
}
