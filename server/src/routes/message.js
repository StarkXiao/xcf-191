import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';
import { checkSensitiveWords } from '../sensitiveWordFilter.js';

const normalizeMessage = (message) => {
  return {
    ...message,
    visibility: message.visibility || 'public',
    visibleGroupIds: message.visibleGroupIds || [],
    visitorGroupId: message.visitorGroupId || null,
    reviewStatus: message.reviewStatus || 'pending',
    sensitiveWords: message.sensitiveWords || [],
    reviewReason: message.reviewReason || '',
    reviewedAt: message.reviewedAt || null
  };
};

const isMessageVisible = (message, visitorGroupId, visitorSessionId, isAdmin = false) => {
  if (isAdmin) return true;

  const reviewStatus = message.reviewStatus || 'pending';
  if (reviewStatus !== 'approved') return false;

  const visibility = message.visibility || 'public';

  if (visibility === 'public') return true;

  if (visibility === 'private') {
    return message.visitorSessionId && message.visitorSessionId === visitorSessionId;
  }

  if (visibility === 'groups') {
    if (!visitorGroupId) return false;
    const visibleGroupIds = message.visibleGroupIds || [];
    return visibleGroupIds.includes(visitorGroupId);
  }

  return true;
};

export default async function messageRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId, visitorGroupId, visitorSessionId, isAdmin } = request.query;
    let messages = getCollection('messages');

    if (exhibitionId) {
      messages = messages.filter(m => m.exhibitionId === exhibitionId);
    }

    const adminFlag = isAdmin === 'true' || isAdmin === true;

    const filtered = messages
      .map(normalizeMessage)
      .filter(m => isMessageVisible(m, visitorGroupId, visitorSessionId, adminFlag));

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.post('/', async (request) => {
    const {
      exhibitionId,
      author,
      content,
      avatar,
      visibility,
      visibleGroupIds,
      visitorGroupId,
      visitorSessionId
    } = request.body;

    const sensitiveResult = checkSensitiveWords(content || '');
    const messages = getCollection('messages');
    const newMessage = {
      id: uuidv4(),
      exhibitionId,
      author: author || '匿名访客',
      content: content || '',
      avatar: avatar || '',
      visibility: visibility || 'public',
      visibleGroupIds: visibleGroupIds || [],
      visitorGroupId: visitorGroupId || null,
      visitorSessionId: visitorSessionId || null,
      reviewStatus: 'pending',
      sensitiveWords: sensitiveResult.matched,
      reviewReason: '',
      reviewedAt: null,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    saveCollection('messages', messages);
    return newMessage;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const {
      author,
      content,
      avatar,
      visibility,
      visibleGroupIds,
      visitorGroupId
    } = request.body;

    const messages = getCollection('messages');
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '留言不存在' };
    }

    const current = messages[index];
    const newContent = content !== undefined ? content : current.content;
    const sensitiveResult = checkSensitiveWords(newContent);

    const shouldResetReview = content !== undefined && content !== current.content;

    messages[index] = {
      ...current,
      author: author !== undefined ? author : current.author,
      content: newContent,
      avatar: avatar !== undefined ? avatar : current.avatar,
      visibility: visibility !== undefined ? visibility : current.visibility,
      visibleGroupIds: visibleGroupIds !== undefined ? visibleGroupIds : current.visibleGroupIds,
      visitorGroupId: visitorGroupId !== undefined ? visitorGroupId : current.visitorGroupId,
      ...(shouldResetReview ? {
        reviewStatus: 'pending',
        sensitiveWords: sensitiveResult.matched,
        reviewReason: '',
        reviewedAt: null
      } : {}),
      updatedAt: new Date().toISOString()
    };

    saveCollection('messages', messages);
    return messages[index];
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
