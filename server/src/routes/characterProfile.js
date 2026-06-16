import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const RELATION_TYPES = [
  { key: 'ally', name: '盟友', icon: '🤝', reverse: 'ally' },
  { key: 'rival', name: '宿敌', icon: '⚔️', reverse: 'rival' },
  { key: 'mentor', name: '师徒', icon: '🎓', reverse: 'student' },
  { key: 'student', name: '弟子', icon: '📖', reverse: 'mentor' },
  { key: 'family', name: '血亲', icon: '👨‍👩‍👧', reverse: 'family' },
  { key: 'lover', name: '恋人', icon: '💕', reverse: 'lover' },
  { key: 'comrade', name: '战友', icon: '🛡️', reverse: 'comrade' },
  { key: 'suspect', name: '嫌疑', icon: '🔍', reverse: 'suspect' },
  { key: 'benefactor', name: '恩人', icon: '🌟', reverse: 'beneficiary' },
  { key: 'beneficiary', name: '受恩者', icon: '🙏', reverse: 'benefactor' }
];

const DECISION_IMPACT_LEVELS = [
  { key: 'minor', name: '微末', color: '#8080a0' },
  { key: 'moderate', name: '中等', color: '#87ceeb' },
  { key: 'major', name: '重大', color: '#ffd700' },
  { key: 'critical', name: '转折', color: '#ff6347' }
];

const ENDING_TYPES = [
  { key: 'true', name: '真结局', icon: '👑', color: '#ffd700' },
  { key: 'good', name: '好结局', icon: '🌟', color: '#98fb98' },
  { key: 'normal', name: '普通结局', icon: '📜', color: '#87ceeb' },
  { key: 'bad', name: '坏结局', icon: '💀', color: '#ff6347' },
  { key: 'hidden', name: '隐藏结局', icon: '🔮', color: '#dda0dd' }
];

const GROWTH_STAGES = [
  { key: 'origin', name: '起源', minAge: 0, maxAge: 12, icon: '🌱', color: '#E6F3FF' },
  { key: 'awakening', name: '觉醒', minAge: 12, maxAge: 18, icon: '⚡', color: '#FFF8DC' },
  { key: 'struggle', name: '磨砺', minAge: 18, maxAge: 30, icon: '🔥', color: '#FFE4E1' },
  { key: 'turning', name: '蜕变', minAge: 30, maxAge: 45, icon: '🦋', color: '#F0E6FF' },
  { key: 'zenith', name: '巅峰', minAge: 45, maxAge: 60, icon: '🏔️', color: '#E8FFE8' },
  { key: 'twilight', name: '暮年', minAge: 60, maxAge: 150, icon: '🌅', color: '#FFEFD5' }
];

const checkEndingUnlock = (ending, profiles) => {
  if (!ending.conditions || ending.conditions.length === 0) return { unlocked: true, progress: 1 };
  let met = 0;
  for (const cond of ending.conditions) {
    if (cond.type === 'decision') {
      const profile = profiles.find(p => p.id === cond.characterId);
      if (profile) {
        const dec = (profile.keyDecisions || []).find(d => d.id === cond.decisionId);
        if (dec && dec.chosenOption === cond.requiredOption) { met++; continue; }
      }
    } else if (cond.type === 'relationship') {
      const profile = profiles.find(p => p.id === cond.characterId);
      if (profile) {
        const rel = (profile.relationships || []).find(r => r.targetCharacterId === cond.targetId);
        if (rel && rel.currentType === cond.requiredType) { met++; continue; }
      }
    } else if (cond.type === 'status') {
      const profile = profiles.find(p => p.id === cond.characterId);
      if (profile && profile.status === cond.requiredStatus) { met++; continue; }
    } else if (cond.type === 'growth') {
      const profile = profiles.find(p => p.id === cond.characterId);
      if (profile && (profile.growthExperiences || []).some(g => g.id === cond.growthId)) { met++; continue; }
    }
  }
  return { unlocked: met === ending.conditions.length, progress: met / ending.conditions.length };
};

export default async function characterProfileRoutes(fastify) {
  fastify.get('/meta', async () => {
    return { relationTypes: RELATION_TYPES, decisionImpacts: DECISION_IMPACT_LEVELS, endingTypes: ENDING_TYPES, growthStages: GROWTH_STAGES };
  });

  fastify.get('/profiles', async (request) => {
    const { role, faction, status } = request.query;
    let profiles = getCollection('characterProfiles');
    if (role) profiles = profiles.filter(p => p.role === role);
    if (faction) profiles = profiles.filter(p => p.faction === faction);
    if (status) profiles = profiles.filter(p => p.status === status);
    return profiles.map(p => ({
      ...p,
      growthCount: (p.growthExperiences || []).length,
      relationshipCount: (p.relationships || []).length,
      decisionCount: (p.keyDecisions || []).length
    }));
  });

  fastify.get('/profiles/:id', async (request, reply) => {
    const { id } = request.params;
    const profiles = getCollection('characterProfiles');
    const profile = profiles.find(p => p.id === id);
    if (!profile) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const allProfiles = getCollection('characterProfiles');
    const enrichedRelationships = (profile.relationships || []).map(rel => {
      const target = allProfiles.find(p => p.id === rel.targetCharacterId);
      return {
        ...rel,
        targetName: target?.name || rel.targetName || '未知角色',
        targetAvatar: target?.avatar || null,
        targetStatus: target?.status || null
      };
    });
    return { ...profile, relationships: enrichedRelationships };
  });

  fastify.post('/profiles', async (request) => {
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const newProfile = {
      id: uuidv4(),
      name: data.name || '未命名角色',
      alias: data.alias || '',
      avatar: data.avatar || '',
      coverImage: data.coverImage || '',
      role: data.role || 'supporting',
      faction: data.faction || '',
      status: data.status || 'alive',
      birthYear: data.birthYear || null,
      deathYear: data.deathYear || null,
      personality: data.personality || [],
      background: data.background || '',
      growthExperiences: [],
      relationships: [],
      keyDecisions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    profiles.push(newProfile);
    saveCollection('characterProfiles', profiles);
    return newProfile;
  });

  fastify.put('/profiles/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    profiles[index] = {
      ...profiles[index],
      name: data.name !== undefined ? data.name : profiles[index].name,
      alias: data.alias !== undefined ? data.alias : profiles[index].alias,
      avatar: data.avatar !== undefined ? data.avatar : profiles[index].avatar,
      coverImage: data.coverImage !== undefined ? data.coverImage : profiles[index].coverImage,
      role: data.role !== undefined ? data.role : profiles[index].role,
      faction: data.faction !== undefined ? data.faction : profiles[index].faction,
      status: data.status !== undefined ? data.status : profiles[index].status,
      birthYear: data.birthYear !== undefined ? data.birthYear : profiles[index].birthYear,
      deathYear: data.deathYear !== undefined ? data.deathYear : profiles[index].deathYear,
      personality: data.personality !== undefined ? data.personality : profiles[index].personality,
      background: data.background !== undefined ? data.background : profiles[index].background,
      updatedAt: new Date().toISOString()
    };
    saveCollection('characterProfiles', profiles);
    return profiles[index];
  });

  fastify.delete('/profiles/:id', async (request, reply) => {
    const { id } = request.params;
    const profiles = getCollection('characterProfiles');
    const filtered = profiles.filter(p => p.id !== id);
    if (filtered.length === profiles.length) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    filtered.forEach(p => {
      p.relationships = (p.relationships || []).filter(r => r.targetCharacterId !== id);
    });
    saveCollection('characterProfiles', filtered);
    const endings = getCollection('storylineEndings');
    endings.forEach(e => {
      e.conditions = (e.conditions || []).filter(c => c.characterId !== id && c.targetId !== id);
    });
    saveCollection('storylineEndings', endings);
    return { success: true };
  });

  fastify.post('/profiles/:id/growth', async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    if (!profiles[index].growthExperiences) profiles[index].growthExperiences = [];
    const experience = {
      id: uuidv4(),
      title: data.title || '未命名经历',
      description: data.description || '',
      year: data.year || null,
      age: data.age || null,
      stage: data.stage || 'origin',
      impact: data.impact || 'moderate',
      relatedDecisionIds: data.relatedDecisionIds || [],
      createdAt: new Date().toISOString()
    };
    profiles[index].growthExperiences.push(experience);
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return experience;
  });

  fastify.put('/profiles/:id/growth/:growthId', async (request, reply) => {
    const { id, growthId } = request.params;
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const growths = profiles[index].growthExperiences || [];
    const gi = growths.findIndex(g => g.id === growthId);
    if (gi === -1) {
      reply.code(404);
      return { error: '成长经历不存在' };
    }
    growths[gi] = { ...growths[gi], ...data, id: growthId };
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return growths[gi];
  });

  fastify.delete('/profiles/:id/growth/:growthId', async (request, reply) => {
    const { id, growthId } = request.params;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    profiles[index].growthExperiences = (profiles[index].growthExperiences || []).filter(g => g.id !== growthId);
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return { success: true };
  });

  fastify.post('/profiles/:id/relationships', async (request, reply) => {
    const { id } = request.params;
    const { targetCharacterId, type, description, evolution } = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const target = profiles.find(p => p.id === targetCharacterId);
    if (!target) {
      reply.code(400);
      return { error: '目标角色不存在' };
    }
    if (!profiles[index].relationships) profiles[index].relationships = [];
    const rel = {
      id: uuidv4(),
      targetCharacterId,
      targetName: target.name,
      type,
      currentType: type,
      description: description || '',
      evolution: evolution || [{ year: null, from: '', to: type, reason: '初始关系' }],
      createdAt: new Date().toISOString()
    };
    profiles[index].relationships.push(rel);
    profiles[index].updatedAt = new Date().toISOString();

    if (!target.relationships) target.relationships = [];
    const reverseType = (RELATION_TYPES.find(r => r.key === type) || {}).reverse || type;
    const reverseRel = {
      id: uuidv4(),
      targetCharacterId: id,
      targetName: profiles[index].name,
      type: reverseType,
      currentType: reverseType,
      description: description || '',
      evolution: [{ year: null, from: '', to: reverseType, reason: '初始关系' }],
      createdAt: new Date().toISOString()
    };
    target.relationships.push(reverseRel);
    target.updatedAt = new Date().toISOString();

    saveCollection('characterProfiles', profiles);
    return rel;
  });

  fastify.put('/profiles/:id/relationships/:relId', async (request, reply) => {
    const { id, relId } = request.params;
    const { type, description, newEvolution } = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const rels = profiles[index].relationships || [];
    const ri = rels.findIndex(r => r.id === relId);
    if (ri === -1) {
      reply.code(404);
      return { error: '关系不存在' };
    }
    if (type) rels[ri].currentType = type;
    if (description) rels[ri].description = description;
    if (newEvolution) {
      if (!rels[ri].evolution) rels[ri].evolution = [];
      rels[ri].evolution.push(newEvolution);
    }
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return rels[ri];
  });

  fastify.delete('/profiles/:id/relationships/:relId', async (request, reply) => {
    const { id, relId } = request.params;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const rel = (profiles[index].relationships || []).find(r => r.id === relId);
    profiles[index].relationships = (profiles[index].relationships || []).filter(r => r.id !== relId);
    profiles[index].updatedAt = new Date().toISOString();
    if (rel) {
      const targetIdx = profiles.findIndex(p => p.id === rel.targetCharacterId);
      if (targetIdx !== -1) {
        profiles[targetIdx].relationships = (profiles[targetIdx].relationships || []).filter(
          r => r.targetCharacterId !== id
        );
        profiles[targetIdx].updatedAt = new Date().toISOString();
      }
    }
    saveCollection('characterProfiles', profiles);
    return { success: true };
  });

  fastify.post('/profiles/:id/decisions', async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    if (!profiles[index].keyDecisions) profiles[index].keyDecisions = [];
    const decision = {
      id: uuidv4(),
      title: data.title || '未命名抉择',
      description: data.description || '',
      year: data.year || null,
      options: data.options || [],
      chosenOption: data.chosenOption || null,
      consequence: data.consequence || '',
      impact: data.impact || 'major',
      relatedEndingIds: data.relatedEndingIds || [],
      impactOnRelationships: data.impactOnRelationships || [],
      createdAt: new Date().toISOString()
    };
    profiles[index].keyDecisions.push(decision);
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return decision;
  });

  fastify.put('/profiles/:id/decisions/:decisionId', async (request, reply) => {
    const { id, decisionId } = request.params;
    const data = request.body;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    const decisions = profiles[index].keyDecisions || [];
    const di = decisions.findIndex(d => d.id === decisionId);
    if (di === -1) {
      reply.code(404);
      return { error: '抉择记录不存在' };
    }
    decisions[di] = { ...decisions[di], ...data, id: decisionId };
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return decisions[di];
  });

  fastify.delete('/profiles/:id/decisions/:decisionId', async (request, reply) => {
    const { id, decisionId } = request.params;
    const profiles = getCollection('characterProfiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '角色不存在' };
    }
    profiles[index].keyDecisions = (profiles[index].keyDecisions || []).filter(d => d.id !== decisionId);
    profiles[index].updatedAt = new Date().toISOString();
    saveCollection('characterProfiles', profiles);
    return { success: true };
  });

  fastify.get('/endings', async () => {
    const profiles = getCollection('characterProfiles');
    const endings = getCollection('storylineEndings');
    return endings.map(e => {
      const result = checkEndingUnlock(e, profiles);
      return { ...e, isUnlocked: result.unlocked, unlockProgress: result.progress };
    });
  });

  fastify.get('/endings/:id', async (request, reply) => {
    const { id } = request.params;
    const endings = getCollection('storylineEndings');
    const ending = endings.find(e => e.id === id);
    if (!ending) {
      reply.code(404);
      return { error: '结局不存在' };
    }
    const profiles = getCollection('characterProfiles');
    const result = checkEndingUnlock(ending, profiles);
    const conditionDetails = (ending.conditions || []).map(cond => {
      const detail = { ...cond, met: false };
      if (cond.type === 'decision') {
        const profile = profiles.find(p => p.id === cond.characterId);
        if (profile) {
          const dec = (profile.keyDecisions || []).find(d => d.id === cond.decisionId);
          detail.characterName = profile.name;
          detail.decisionTitle = dec?.title || '未知抉择';
          detail.met = dec && dec.chosenOption === cond.requiredOption;
        }
      } else if (cond.type === 'relationship') {
        const profile = profiles.find(p => p.id === cond.characterId);
        const target = profiles.find(p => p.id === cond.targetId);
        if (profile) {
          const rel = (profile.relationships || []).find(r => r.targetCharacterId === cond.targetId);
          detail.characterName = profile.name;
          detail.targetName = target?.name || '未知';
          detail.met = rel && rel.currentType === cond.requiredType;
        }
      } else if (cond.type === 'status') {
        const profile = profiles.find(p => p.id === cond.characterId);
        if (profile) {
          detail.characterName = profile.name;
          detail.met = profile.status === cond.requiredStatus;
        }
      } else if (cond.type === 'growth') {
        const profile = profiles.find(p => p.id === cond.characterId);
        if (profile) {
          const g = (profile.growthExperiences || []).find(ge => ge.id === cond.growthId);
          detail.characterName = profile.name;
          detail.growthTitle = g?.title || '未知经历';
          detail.met = !!g;
        }
      }
      return detail;
    });
    return { ...ending, isUnlocked: result.unlocked, unlockProgress: result.progress, conditionDetails };
  });

  fastify.post('/endings', async (request) => {
    const data = request.body;
    const endings = getCollection('storylineEndings');
    const newEnding = {
      id: uuidv4(),
      name: data.name || '未命名结局',
      description: data.description || '',
      type: data.type || 'normal',
      conditions: data.conditions || [],
      epilogue: data.epilogue || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    endings.push(newEnding);
    saveCollection('storylineEndings', endings);
    return newEnding;
  });

  fastify.put('/endings/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const endings = getCollection('storylineEndings');
    const index = endings.findIndex(e => e.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '结局不存在' };
    }
    endings[index] = {
      ...endings[index],
      name: data.name !== undefined ? data.name : endings[index].name,
      description: data.description !== undefined ? data.description : endings[index].description,
      type: data.type !== undefined ? data.type : endings[index].type,
      conditions: data.conditions !== undefined ? data.conditions : endings[index].conditions,
      epilogue: data.epilogue !== undefined ? data.epilogue : endings[index].epilogue,
      updatedAt: new Date().toISOString()
    };
    saveCollection('storylineEndings', endings);
    return endings[index];
  });

  fastify.delete('/endings/:id', async (request, reply) => {
    const { id } = request.params;
    const endings = getCollection('storylineEndings');
    const filtered = endings.filter(e => e.id !== id);
    if (filtered.length === endings.length) {
      reply.code(404);
      return { error: '结局不存在' };
    }
    saveCollection('storylineEndings', filtered);
    return { success: true };
  });

  fastify.get('/relationship-map', async () => {
    const profiles = getCollection('characterProfiles');
    const nodes = profiles.map(p => ({
      id: p.id,
      name: p.name,
      alias: p.alias,
      avatar: p.avatar,
      role: p.role,
      faction: p.faction,
      status: p.status
    }));
    const edges = [];
    const seen = new Set();
    profiles.forEach(p => {
      (p.relationships || []).forEach(r => {
        const key = [p.id, r.targetCharacterId].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: p.id,
            target: r.targetCharacterId,
            type: r.currentType || r.type,
            description: r.description
          });
        }
      });
    });
    return { nodes, edges };
  });

  fastify.get('/dashboard', async () => {
    const profiles = getCollection('characterProfiles');
    const endings = getCollection('storylineEndings');
    const totalDecisions = profiles.reduce((sum, p) => sum + (p.keyDecisions || []).length, 0);
    const totalRelationships = profiles.reduce((sum, p) => sum + (p.relationships || []).length, 0);
    const totalGrowth = profiles.reduce((sum, p) => sum + (p.growthExperiences || []).length, 0);
    const unlockedEndings = endings.filter(e => checkEndingUnlock(e, profiles).unlocked).length;
    const factions = [...new Set(profiles.map(p => p.faction).filter(Boolean))];
    return {
      totalCharacters: profiles.length,
      totalDecisions,
      totalRelationships: Math.floor(totalRelationships / 2),
      totalGrowth,
      totalEndings: endings.length,
      unlockedEndings,
      factions,
      endingProgress: endings.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        ...checkEndingUnlock(e, profiles)
      }))
    };
  });
}
