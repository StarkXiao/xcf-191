import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function memorialRitualRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId } = request.query;
    let rituals = getCollection('memorialRituals');
    if (exhibitionId) {
      rituals = rituals.filter(r => r.exhibitionId === exhibitionId);
    }
    return rituals.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const rituals = getCollection('memorialRituals');
    const ritual = rituals.find(r => r.id === id);
    if (!ritual) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    return ritual;
  });

  fastify.post('/', async (request) => {
    const { exhibitionId, title, description, steps, backgroundMusic, settings } = request.body;
    const rituals = getCollection('memorialRituals');
    const newRitual = {
      id: uuidv4(),
      exhibitionId: exhibitionId || null,
      title: title || '纪念仪式',
      description: description || '',
      steps: steps || [],
      backgroundMusic: backgroundMusic || [],
      settings: settings || {
        autoAdvance: true,
        stepDuration: 10,
        loopMusic: true,
        showMessageWall: true,
        transitionEffect: 'fade'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    rituals.push(newRitual);
    saveCollection('memorialRituals', rituals);
    return newRitual;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { title, description, steps, backgroundMusic, settings } = request.body;
    const rituals = getCollection('memorialRituals');
    const index = rituals.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    rituals[index] = {
      ...rituals[index],
      title: title !== undefined ? title : rituals[index].title,
      description: description !== undefined ? description : rituals[index].description,
      steps: steps !== undefined ? steps : rituals[index].steps,
      backgroundMusic: backgroundMusic !== undefined ? backgroundMusic : rituals[index].backgroundMusic,
      settings: settings !== undefined ? { ...rituals[index].settings, ...settings } : rituals[index].settings,
      updatedAt: new Date().toISOString()
    };
    saveCollection('memorialRituals', rituals);
    return rituals[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const rituals = getCollection('memorialRituals');
    const filtered = rituals.filter(r => r.id !== id);
    if (filtered.length === rituals.length) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const messages = getCollection('ritualMessages').filter(m => m.ritualId !== id);
    const playStates = getCollection('ritualPlayStates').filter(p => p.ritualId !== id);
    saveCollection('memorialRituals', filtered);
    saveCollection('ritualMessages', messages);
    saveCollection('ritualPlayStates', playStates);
    return { success: true };
  });

  fastify.post('/:id/steps', async (request, reply) => {
    const { id } = request.params;
    const { title, description, type, duration, mediaUrl, order } = request.body;
    const rituals = getCollection('memorialRituals');
    const index = rituals.findIndex(r => r.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const newStep = {
      id: uuidv4(),
      title: title || '步骤',
      description: description || '',
      type: type || 'text',
      duration: duration || 10,
      mediaUrl: mediaUrl || '',
      order: order !== undefined ? order : rituals[index].steps.length
    };
    rituals[index].steps.push(newStep);
    rituals[index].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return newStep;
  });

  fastify.put('/:id/steps/:stepId', async (request, reply) => {
    const { id, stepId } = request.params;
    const { title, description, type, duration, mediaUrl, order } = request.body;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const stepIndex = rituals[ritualIndex].steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      reply.code(404);
      return { error: '步骤不存在' };
    }
    rituals[ritualIndex].steps[stepIndex] = {
      ...rituals[ritualIndex].steps[stepIndex],
      title: title !== undefined ? title : rituals[ritualIndex].steps[stepIndex].title,
      description: description !== undefined ? description : rituals[ritualIndex].steps[stepIndex].description,
      type: type !== undefined ? type : rituals[ritualIndex].steps[stepIndex].type,
      duration: duration !== undefined ? duration : rituals[ritualIndex].steps[stepIndex].duration,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : rituals[ritualIndex].steps[stepIndex].mediaUrl,
      order: order !== undefined ? order : rituals[ritualIndex].steps[stepIndex].order
    };
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return rituals[ritualIndex].steps[stepIndex];
  });

  fastify.delete('/:id/steps/:stepId', async (request, reply) => {
    const { id, stepId } = request.params;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const filteredSteps = rituals[ritualIndex].steps.filter(s => s.id !== stepId);
    if (filteredSteps.length === rituals[ritualIndex].steps.length) {
      reply.code(404);
      return { error: '步骤不存在' };
    }
    rituals[ritualIndex].steps = filteredSteps;
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return { success: true };
  });

  fastify.post('/:id/steps/reorder', async (request, reply) => {
    const { id } = request.params;
    const { stepOrders } = request.body;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    stepOrders.forEach(({ stepId, order }) => {
      const step = rituals[ritualIndex].steps.find(s => s.id === stepId);
      if (step) step.order = order;
    });
    rituals[ritualIndex].steps.sort((a, b) => a.order - b.order);
    rituals[ritualIndex].steps.forEach((s, idx) => s.order = idx);
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return rituals[ritualIndex].steps;
  });

  fastify.post('/:id/music', async (request, reply) => {
    const { id } = request.params;
    const { title, url, artist, duration, order } = request.body;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const newMusic = {
      id: uuidv4(),
      title: title || '背景音乐',
      url: url || '',
      artist: artist || '',
      duration: duration || 0,
      order: order !== undefined ? order : rituals[ritualIndex].backgroundMusic.length
    };
    rituals[ritualIndex].backgroundMusic.push(newMusic);
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return newMusic;
  });

  fastify.put('/:id/music/:musicId', async (request, reply) => {
    const { id, musicId } = request.params;
    const { title, url, artist, duration, order } = request.body;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const musicIndex = rituals[ritualIndex].backgroundMusic.findIndex(m => m.id === musicId);
    if (musicIndex === -1) {
      reply.code(404);
      return { error: '音乐不存在' };
    }
    rituals[ritualIndex].backgroundMusic[musicIndex] = {
      ...rituals[ritualIndex].backgroundMusic[musicIndex],
      title: title !== undefined ? title : rituals[ritualIndex].backgroundMusic[musicIndex].title,
      url: url !== undefined ? url : rituals[ritualIndex].backgroundMusic[musicIndex].url,
      artist: artist !== undefined ? artist : rituals[ritualIndex].backgroundMusic[musicIndex].artist,
      duration: duration !== undefined ? duration : rituals[ritualIndex].backgroundMusic[musicIndex].duration,
      order: order !== undefined ? order : rituals[ritualIndex].backgroundMusic[musicIndex].order
    };
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return rituals[ritualIndex].backgroundMusic[musicIndex];
  });

  fastify.delete('/:id/music/:musicId', async (request, reply) => {
    const { id, musicId } = request.params;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    const filteredMusic = rituals[ritualIndex].backgroundMusic.filter(m => m.id !== musicId);
    if (filteredMusic.length === rituals[ritualIndex].backgroundMusic.length) {
      reply.code(404);
      return { error: '音乐不存在' };
    }
    rituals[ritualIndex].backgroundMusic = filteredMusic;
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return { success: true };
  });

  fastify.post('/:id/music/reorder', async (request, reply) => {
    const { id } = request.params;
    const { musicOrders } = request.body;
    const rituals = getCollection('memorialRituals');
    const ritualIndex = rituals.findIndex(r => r.id === id);
    if (ritualIndex === -1) {
      reply.code(404);
      return { error: '纪念仪式不存在' };
    }
    musicOrders.forEach(({ musicId, order }) => {
      const music = rituals[ritualIndex].backgroundMusic.find(m => m.id === musicId);
      if (music) music.order = order;
    });
    rituals[ritualIndex].backgroundMusic.sort((a, b) => a.order - b.order);
    rituals[ritualIndex].backgroundMusic.forEach((m, idx) => m.order = idx);
    rituals[ritualIndex].updatedAt = new Date().toISOString();
    saveCollection('memorialRituals', rituals);
    return rituals[ritualIndex].backgroundMusic;
  });

  fastify.get('/:id/messages', async (request) => {
    const { id } = request.params;
    let messages = getCollection('ritualMessages').filter(m => m.ritualId === id);
    messages = messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return messages;
  });

  fastify.post('/:id/messages', async (request) => {
    const { id } = request.params;
    const { author, content, avatar } = request.body;
    const messages = getCollection('ritualMessages');
    const newMessage = {
      id: uuidv4(),
      ritualId: id,
      author: author || '匿名访客',
      content: content || '',
      avatar: avatar || '',
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    saveCollection('ritualMessages', messages);
    return newMessage;
  });

  fastify.delete('/:id/messages/:messageId', async (request, reply) => {
    const { id, messageId } = request.params;
    const messages = getCollection('ritualMessages');
    const filtered = messages.filter(m => m.id !== messageId && m.ritualId === id);
    if (filtered.length === messages.filter(m => m.ritualId === id).length) {
      reply.code(404);
      return { error: '留言不存在' };
    }
    saveCollection('ritualMessages', filtered);
    return { success: true };
  });

  fastify.get('/:id/play-state', async (request) => {
    const { id } = request.params;
    const playStates = getCollection('ritualPlayStates');
    const state = playStates.find(p => p.ritualId === id);
    if (!state) {
      return {
        ritualId: id,
        isPlaying: false,
        currentStepIndex: 0,
        currentMusicIndex: 0,
        stepProgress: 0,
        musicProgress: 0,
        volume: 0.7,
        lastUpdated: new Date().toISOString()
      };
    }
    return state;
  });

  fastify.put('/:id/play-state', async (request) => {
    const { id } = request.params;
    const { isPlaying, currentStepIndex, currentMusicIndex, stepProgress, musicProgress, volume } = request.body;
    const playStates = getCollection('ritualPlayStates');
    const index = playStates.findIndex(p => p.ritualId === id);
    const newState = {
      ritualId: id,
      isPlaying: isPlaying !== undefined ? isPlaying : (index >= 0 ? playStates[index].isPlaying : false),
      currentStepIndex: currentStepIndex !== undefined ? currentStepIndex : (index >= 0 ? playStates[index].currentStepIndex : 0),
      currentMusicIndex: currentMusicIndex !== undefined ? currentMusicIndex : (index >= 0 ? playStates[index].currentMusicIndex : 0),
      stepProgress: stepProgress !== undefined ? stepProgress : (index >= 0 ? playStates[index].stepProgress : 0),
      musicProgress: musicProgress !== undefined ? musicProgress : (index >= 0 ? playStates[index].musicProgress : 0),
      volume: volume !== undefined ? volume : (index >= 0 ? playStates[index].volume : 0.7),
      lastUpdated: new Date().toISOString()
    };
    if (index >= 0) {
      playStates[index] = newState;
    } else {
      playStates.push(newState);
    }
    saveCollection('ritualPlayStates', playStates);
    return newState;
  });
}
