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
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
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
    const { exhibitionId, title, description, eventDate, materialIds, location } = request.body;
    const timelines = getCollection('timelines');
    const newTimeline = {
      id: uuidv4(),
      exhibitionId,
      title: title || '',
      description: description || '',
      eventDate: eventDate || new Date().toISOString(),
      materialIds: materialIds || [],
      location: location || null,
      createdAt: new Date().toISOString()
    };
    timelines.push(newTimeline);
    saveCollection('timelines', timelines);
    return newTimeline;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, eventDate, materialIds, location } = request.body;
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
      location: location !== undefined ? location : timelines[index].location
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
