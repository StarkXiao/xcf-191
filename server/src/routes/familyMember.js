import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function familyMemberRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { familyAlbumId } = request.query;
    let members = getCollection('familyMembers');
    if (familyAlbumId) {
      const albums = getCollection('familyAlbums');
      const album = albums.find(a => a.id === familyAlbumId);
      if (album) {
        members = members.filter(m => album.memberIds?.includes(m.id));
      } else {
        members = [];
      }
    }
    const allMembers = getCollection('familyMembers');
    const membersWithRelations = members.map(member => {
      const relations = (member.relations || []).map(rel => {
        const relatedMember = allMembers.find(m => m.id === rel.memberId);
        return {
          ...rel,
          member: relatedMember ? { id: relatedMember.id, name: relatedMember.name, avatar: relatedMember.avatar } : null
        };
      });
      return { ...member, relations };
    });
    return membersWithRelations.sort((a, b) => {
      if (a.birthDate && b.birthDate) {
        return new Date(a.birthDate) - new Date(b.birthDate);
      }
      return 0;
    });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const members = getCollection('familyMembers');
    const member = members.find(m => m.id === id);
    if (!member) {
      reply.code(404);
      return { error: '家庭成员不存在' };
    }
    const allMembers = getCollection('familyMembers');
    const relations = (member.relations || []).map(rel => {
      const relatedMember = allMembers.find(m => m.id === rel.memberId);
      return {
        ...rel,
        member: relatedMember ? { id: relatedMember.id, name: relatedMember.name, avatar: relatedMember.avatar } : null
      };
    });
    return { ...member, relations };
  });

  fastify.post('/', async (request) => {
    const { name, avatar, birthDate, deathDate, gender, description, role, relations = [] } = request.body;
    const members = getCollection('familyMembers');
    const newMember = {
      id: uuidv4(),
      name: name || '未命名成员',
      avatar: avatar || '',
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      gender: gender || 'unknown',
      description: description || '',
      role: role || '',
      relations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    members.push(newMember);
    saveCollection('familyMembers', members);

    if (relations.length > 0) {
      relations.forEach(rel => {
        const targetIndex = members.findIndex(m => m.id === rel.memberId);
        if (targetIndex !== -1) {
          if (!members[targetIndex].relations) {
            members[targetIndex].relations = [];
          }
          const reverseRelation = getReverseRelation(rel.type);
          if (!members[targetIndex].relations.find(r => r.memberId === newMember.id)) {
            members[targetIndex].relations.push({
              memberId: newMember.id,
              type: reverseRelation
            });
            members[targetIndex].updatedAt = new Date().toISOString();
          }
        }
      });
      saveCollection('familyMembers', members);
    }

    return newMember;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, avatar, birthDate, deathDate, gender, description, role, relations } = request.body;
    const members = getCollection('familyMembers');
    const index = members.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭成员不存在' };
    }
    members[index] = {
      ...members[index],
      name: name !== undefined ? name : members[index].name,
      avatar: avatar !== undefined ? avatar : members[index].avatar,
      birthDate: birthDate !== undefined ? birthDate : members[index].birthDate,
      deathDate: deathDate !== undefined ? deathDate : members[index].deathDate,
      gender: gender !== undefined ? gender : members[index].gender,
      description: description !== undefined ? description : members[index].description,
      role: role !== undefined ? role : members[index].role,
      relations: relations !== undefined ? relations : members[index].relations,
      updatedAt: new Date().toISOString()
    };
    saveCollection('familyMembers', members);
    return members[index];
  });

  fastify.post('/:id/relations', async (request, reply) => {
    const { id } = request.params;
    const { memberId, type } = request.body;
    const members = getCollection('familyMembers');
    const index = members.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭成员不存在' };
    }
    if (!members[index].relations) {
      members[index].relations = [];
    }
    if (!members[index].relations.find(r => r.memberId === memberId)) {
      members[index].relations.push({ memberId, type });
      members[index].updatedAt = new Date().toISOString();
    }

    const targetIndex = members.findIndex(m => m.id === memberId);
    if (targetIndex !== -1) {
      if (!members[targetIndex].relations) {
        members[targetIndex].relations = [];
      }
      const reverseRelation = getReverseRelation(type);
      if (!members[targetIndex].relations.find(r => r.memberId === id)) {
        members[targetIndex].relations.push({
          memberId: id,
          type: reverseRelation
        });
        members[targetIndex].updatedAt = new Date().toISOString();
      }
    }

    saveCollection('familyMembers', members);
    return members[index];
  });

  fastify.delete('/:id/relations/:memberId', async (request, reply) => {
    const { id, memberId } = request.params;
    const members = getCollection('familyMembers');
    const index = members.findIndex(m => m.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '家庭成员不存在' };
    }
    members[index].relations = (members[index].relations || []).filter(r => r.memberId !== memberId);
    members[index].updatedAt = new Date().toISOString();

    const targetIndex = members.findIndex(m => m.id === memberId);
    if (targetIndex !== -1) {
      members[targetIndex].relations = (members[targetIndex].relations || []).filter(r => r.memberId !== id);
      members[targetIndex].updatedAt = new Date().toISOString();
    }

    saveCollection('familyMembers', members);
    return members[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const members = getCollection('familyMembers');
    const filtered = members.filter(m => m.id !== id);
    if (filtered.length === members.length) {
      reply.code(404);
      return { error: '家庭成员不存在' };
    }

    filtered.forEach((m, idx) => {
      if (m.relations) {
        filtered[idx].relations = m.relations.filter(r => r.memberId !== id);
      }
    });

    const albums = getCollection('familyAlbums');
    albums.forEach((album, idx) => {
      if (album.memberIds) {
        albums[idx].memberIds = album.memberIds.filter(mid => mid !== id);
      }
    });

    saveCollection('familyMembers', filtered);
    saveCollection('familyAlbums', albums);
    return { success: true };
  });
}

function getReverseRelation(type) {
  const reverseMap = {
    'father': 'child',
    'mother': 'child',
    'child': 'parent',
    'parent': 'child',
    'spouse': 'spouse',
    'sibling': 'sibling',
    'grandparent': 'grandchild',
    'grandchild': 'grandparent',
    'uncle_aunt': 'nephew_niece',
    'nephew_niece': 'uncle_aunt',
    'cousin': 'cousin'
  };
  return reverseMap[type] || type;
}
