import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function familyAlbumRoutes(fastify) {
  fastify.get('/', async () => {
    const albums = getCollection('familyAlbums');
    return albums.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const albums = getCollection('familyAlbums');
    const album = albums.find(a => a.id === id);
    if (!album) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    const exhibitions = getCollection('exhibitions').filter(e => album.exhibitionIds?.includes(e.id));
    const members = getCollection('familyMembers').filter(m => album.memberIds?.includes(m.id));
    return { ...album, exhibitions, members };
  });

  fastify.post('/', async (request) => {
    const { name, description, coverImage, theme, exhibitionIds = [], memberIds = [] } = request.body;
    const albums = getCollection('familyAlbums');
    const newAlbum = {
      id: uuidv4(),
      name: name || '未命名家庭纪念册',
      description: description || '',
      coverImage: coverImage || '',
      theme: theme || 'warm',
      exhibitionIds,
      memberIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    albums.push(newAlbum);
    saveCollection('familyAlbums', albums);
    return newAlbum;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, description, coverImage, theme, exhibitionIds, memberIds } = request.body;
    const albums = getCollection('familyAlbums');
    const index = albums.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    albums[index] = {
      ...albums[index],
      name: name !== undefined ? name : albums[index].name,
      description: description !== undefined ? description : albums[index].description,
      coverImage: coverImage !== undefined ? coverImage : albums[index].coverImage,
      theme: theme !== undefined ? theme : albums[index].theme,
      exhibitionIds: exhibitionIds !== undefined ? exhibitionIds : albums[index].exhibitionIds,
      memberIds: memberIds !== undefined ? memberIds : albums[index].memberIds,
      updatedAt: new Date().toISOString()
    };
    saveCollection('familyAlbums', albums);
    return albums[index];
  });

  fastify.post('/:id/exhibitions', async (request, reply) => {
    const { id } = request.params;
    const { exhibitionId } = request.body;
    const albums = getCollection('familyAlbums');
    const index = albums.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    if (!albums[index].exhibitionIds) {
      albums[index].exhibitionIds = [];
    }
    if (!albums[index].exhibitionIds.includes(exhibitionId)) {
      albums[index].exhibitionIds.push(exhibitionId);
      albums[index].updatedAt = new Date().toISOString();
      saveCollection('familyAlbums', albums);
    }
    return albums[index];
  });

  fastify.delete('/:id/exhibitions/:exhibitionId', async (request, reply) => {
    const { id, exhibitionId } = request.params;
    const albums = getCollection('familyAlbums');
    const index = albums.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    albums[index].exhibitionIds = (albums[index].exhibitionIds || []).filter(eid => eid !== exhibitionId);
    albums[index].updatedAt = new Date().toISOString();
    saveCollection('familyAlbums', albums);
    return albums[index];
  });

  fastify.post('/:id/members', async (request, reply) => {
    const { id } = request.params;
    const { memberId } = request.body;
    const albums = getCollection('familyAlbums');
    const index = albums.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    if (!albums[index].memberIds) {
      albums[index].memberIds = [];
    }
    if (!albums[index].memberIds.includes(memberId)) {
      albums[index].memberIds.push(memberId);
      albums[index].updatedAt = new Date().toISOString();
      saveCollection('familyAlbums', albums);
    }
    return albums[index];
  });

  fastify.delete('/:id/members/:memberId', async (request, reply) => {
    const { id, memberId } = request.params;
    const albums = getCollection('familyAlbums');
    const index = albums.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    albums[index].memberIds = (albums[index].memberIds || []).filter(mid => mid !== memberId);
    albums[index].updatedAt = new Date().toISOString();
    saveCollection('familyAlbums', albums);
    return albums[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const albums = getCollection('familyAlbums');
    const filtered = albums.filter(a => a.id !== id);
    if (filtered.length === albums.length) {
      reply.code(404);
      return { error: '家庭纪念册不存在' };
    }
    saveCollection('familyAlbums', filtered);
    return { success: true };
  });
}
