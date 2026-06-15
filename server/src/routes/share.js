import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getCollection, saveCollection } from '../storage.js';

const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 10);
};

const hashPassword = (password) => {
  return createHash('sha256').update(password).digest('hex');
};

const isShareExpired = (share) => {
  if (!share.expiresAt) return false;
  return new Date(share.expiresAt) < new Date();
};

const isShareDisabled = (share) => {
  return share.status === 'disabled';
};

const isShareValid = (share) => {
  if (!share) return false;
  if (isShareDisabled(share)) return false;
  if (isShareExpired(share)) return false;
  return true;
};

const getClientIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.ip || 'unknown';
};

const recordView = (shareId, exhibitionId, request, success) => {
  const shareViews = getCollection('shareViews');
  const view = {
    id: uuidv4(),
    shareId,
    exhibitionId,
    ip: getClientIp(request),
    userAgent: request.headers['user-agent'] || '',
    success,
    viewedAt: new Date().toISOString()
  };
  shareViews.push(view);
  saveCollection('shareViews', shareViews);
  return view;
};

const stripPassword = (share) => {
  const { passwordHash, ...rest } = share;
  return rest;
};

export default async function shareRoutes(fastify) {

  fastify.get('/', async (request) => {
    const { exhibitionId } = request.query;
    const shares = getCollection('shares');
    let result = shares;
    if (exhibitionId) {
      result = shares.filter(s => s.exhibitionId === exhibitionId);
    }
    return result
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(stripPassword);
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const shares = getCollection('shares');
    const share = shares.find(s => s.id === id);
    if (!share) {
      reply.code(404);
      return { error: '分享不存在' };
    }
    return stripPassword(share);
  });

  fastify.get('/code/:code', async (request, reply) => {
    const { code } = request.params;
    const shares = getCollection('shares');
    const share = shares.find(s => s.shortCode === code);
    if (!share) {
      reply.code(404);
      return { error: '分享链接不存在或已被删除' };
    }
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === share.exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '关联的展厅不存在' };
    }
    const valid = isShareValid(share);
    const shareData = stripPassword(share);
    return {
      share: shareData,
      exhibition: {
        id: exhibition.id,
        title: exhibition.title,
        description: exhibition.description,
        coverImage: exhibition.coverImage,
        theme: exhibition.theme,
        createdAt: exhibition.createdAt
      },
      requirePassword: !!share.passwordHash,
      isValid: valid,
      expireReason: isShareExpired(share) ? 'expired' : (isShareDisabled(share) ? 'disabled' : null)
    };
  });

  const isMessageVisibleForShare = (message, visitorGroupId) => {
    const visibility = message.visibility || 'public';
    if (visibility === 'public') return true;
    if (visibility === 'private') return false;
    if (visibility === 'groups') {
      if (!visitorGroupId) return false;
      const visibleGroupIds = message.visibleGroupIds || [];
      return visibleGroupIds.includes(visitorGroupId);
    }
    return true;
  };

  fastify.post('/', async (request, reply) => {
    const {
      exhibitionId,
      title,
      password,
      expiresAt,
      maxViews,
      allowDownload = false,
      allowTimeline = true,
      allowMessages = false,
      watermark = '',
      visitorGroupId = null
    } = request.body;

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const shares = getCollection('shares');
    let shortCode;
    do {
      shortCode = generateShortCode();
    } while (shares.some(s => s.shortCode === shortCode));

    const newShare = {
      id: uuidv4(),
      shortCode,
      exhibitionId,
      title: title || exhibition.title,
      passwordHash: password ? hashPassword(password) : null,
      expiresAt: expiresAt || null,
      maxViews: maxViews || null,
      viewCount: 0,
      allowDownload,
      allowTimeline,
      allowMessages,
      watermark,
      visitorGroupId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    shares.push(newShare);
    saveCollection('shares', shares);

    return stripPassword(newShare);
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const {
      title,
      password,
      expiresAt,
      maxViews,
      allowDownload,
      allowTimeline,
      allowMessages,
      watermark,
      visitorGroupId,
      status
    } = request.body;

    const shares = getCollection('shares');
    const index = shares.findIndex(s => s.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '分享不存在' };
    }

    shares[index] = {
      ...shares[index],
      title: title !== undefined ? title : shares[index].title,
      expiresAt: expiresAt !== undefined ? expiresAt : shares[index].expiresAt,
      maxViews: maxViews !== undefined ? maxViews : shares[index].maxViews,
      allowDownload: allowDownload !== undefined ? allowDownload : shares[index].allowDownload,
      allowTimeline: allowTimeline !== undefined ? allowTimeline : shares[index].allowTimeline,
      allowMessages: allowMessages !== undefined ? allowMessages : shares[index].allowMessages,
      watermark: watermark !== undefined ? watermark : shares[index].watermark,
      visitorGroupId: visitorGroupId !== undefined ? visitorGroupId : shares[index].visitorGroupId,
      status: status !== undefined ? status : shares[index].status,
      updatedAt: new Date().toISOString()
    };

    if (password !== undefined) {
      if (password === null || password === '') {
        shares[index].passwordHash = null;
      } else {
        shares[index].passwordHash = hashPassword(password);
      }
    }

    saveCollection('shares', shares);
    return stripPassword(shares[index]);
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const shares = getCollection('shares');
    const filtered = shares.filter(s => s.id !== id);
    if (filtered.length === shares.length) {
      reply.code(404);
      return { error: '分享不存在' };
    }
    saveCollection('shares', filtered);

    const shareViews = getCollection('shareViews').filter(v => v.shareId !== id);
    saveCollection('shareViews', shareViews);

    return { success: true };
  });

  fastify.post('/:id/disable', async (request, reply) => {
    const { id } = request.params;
    const shares = getCollection('shares');
    const index = shares.findIndex(s => s.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '分享不存在' };
    }
    shares[index].status = 'disabled';
    shares[index].updatedAt = new Date().toISOString();
    saveCollection('shares', shares);
    return stripPassword(shares[index]);
  });

  fastify.post('/:id/enable', async (request, reply) => {
    const { id } = request.params;
    const shares = getCollection('shares');
    const index = shares.findIndex(s => s.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '分享不存在' };
    }
    shares[index].status = 'active';
    shares[index].updatedAt = new Date().toISOString();
    saveCollection('shares', shares);
    return stripPassword(shares[index]);
  });

  fastify.post('/code/:code/verify', async (request, reply) => {
    const { code } = request.params;
    const { password } = request.body || {};

    const shares = getCollection('shares');
    const share = shares.find(s => s.shortCode === code);

    if (!share) {
      reply.code(404);
      return { error: '分享链接不存在或已被删除' };
    }

    if (!isShareValid(share)) {
      const reason = isShareExpired(share) ? '分享链接已过期' : '分享链接已被禁用';
      recordView(share.id, share.exhibitionId, request, false);
      reply.code(403);
      return { error: reason, expired: isShareExpired(share), disabled: isShareDisabled(share) };
    }

    if (share.passwordHash) {
      if (!password) {
        reply.code(401);
        return { error: '请输入访问口令', requirePassword: true };
      }
      if (hashPassword(password) !== share.passwordHash) {
        recordView(share.id, share.exhibitionId, request, false);
        reply.code(401);
        return { error: '访问口令错误', requirePassword: true };
      }
    }

    if (share.maxViews && share.viewCount >= share.maxViews) {
      recordView(share.id, share.exhibitionId, request, false);
      reply.code(403);
      return { error: '已达到最大浏览次数限制' };
    }

    const shareIndex = shares.findIndex(s => s.id === share.id);
    shares[shareIndex].viewCount = (shares[shareIndex].viewCount || 0) + 1;
    shares[shareIndex].lastViewedAt = new Date().toISOString();
    saveCollection('shares', shares);

    recordView(share.id, share.exhibitionId, request, true);

    const materials = getCollection('materials').filter(m => m.exhibitionId === share.exhibitionId);
    const timelines = share.allowTimeline
      ? getCollection('timelines')
          .filter(t => t.exhibitionId === share.exhibitionId)
          .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      : [];
    const messages = share.allowMessages
      ? getCollection('messages')
          .filter(m => m.exhibitionId === share.exhibitionId)
          .filter(m => isMessageVisibleForShare(m, share.visitorGroupId))
      : [];

    return {
      success: true,
      share: stripPassword(shares[shareIndex]),
      data: {
        exhibition: getCollection('exhibitions').find(e => e.id === share.exhibitionId),
        materials,
        timelines,
        messages
      }
    };
  });

  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = request.params;
    const shares = getCollection('shares');
    const share = shares.find(s => s.id === id);
    if (!share) {
      reply.code(404);
      return { error: '分享不存在' };
    }

    const shareViews = getCollection('shareViews').filter(v => v.shareId === id);
    const successViews = shareViews.filter(v => v.success);
    const failedViews = shareViews.filter(v => !v.success);

    const uniqueIps = [...new Set(successViews.map(v => v.ip))];

    const viewsByDate = {};
    successViews.forEach(v => {
      const date = v.viewedAt.substring(0, 10);
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    const dailyStats = Object.entries(viewsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalViews: share.viewCount || 0,
      totalRecords: shareViews.length,
      successViews: successViews.length,
      failedViews: failedViews.length,
      uniqueVisitors: uniqueIps.length,
      lastViewedAt: share.lastViewedAt || null,
      dailyStats,
      createdAt: share.createdAt
    };
  });

  fastify.get('/code/:code/preview', async (request, reply) => {
    const { code } = request.params;
    const shares = getCollection('shares');
    const share = shares.find(s => s.shortCode === code);
    if (!share) {
      reply.code(404);
      return { error: '分享链接不存在' };
    }
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === share.exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '关联的展厅不存在' };
    }
    return {
      title: share.title || exhibition.title,
      description: exhibition.description,
      coverImage: exhibition.coverImage,
      hasPassword: !!share.passwordHash
    };
  });
}
