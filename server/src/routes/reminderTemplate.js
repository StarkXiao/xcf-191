import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const DEFAULT_TEMPLATES = [
  {
    type: 'confirm',
    name: '预约确认',
    content: '尊敬的{visitorName}，您已成功预约"{exhibitionTitle}"展厅，预约时间：{appointmentDate} {timeSlot}，请准时到场。如有疑问请联系我们。',
    enabled: true
  },
  {
    type: 'reminder',
    name: '预约提醒',
    content: '温馨提醒：{visitorName}，您预约的"{exhibitionTitle}"展厅将在明天({appointmentDate}) {timeSlot}开放，请合理安排时间前来追思。',
    enabled: true
  },
  {
    type: 'cancel',
    name: '取消通知',
    content: '{visitorName}您好，您预约的"{exhibitionTitle}"展厅({appointmentDate} {timeSlot})已取消。如需再次预约，请重新提交申请。',
    enabled: true
  },
  {
    type: 'checkin',
    name: '签到欢迎',
    content: '欢迎{visitorName}来到"{exhibitionTitle}"展厅，愿您在此找到心灵的慰藉与温暖的回忆。',
    enabled: true
  }
];

const ensureDefaultTemplates = () => {
  const templates = getCollection('reminderTemplates');
  if (templates.length === 0) {
    const defaults = DEFAULT_TEMPLATES.map(t => ({
      ...t,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    saveCollection('reminderTemplates', defaults);
    return defaults;
  }
  return templates;
};

export default async function reminderTemplateRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { type, enabled } = request.query;
    let templates = ensureDefaultTemplates();

    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    if (enabled !== undefined) {
      templates = templates.filter(t => t.enabled === (enabled === 'true'));
    }

    return templates;
  });

  fastify.get('/:id', async (request, reply) => {
    ensureDefaultTemplates();
    const { id } = request.params;
    const templates = getCollection('reminderTemplates');
    const template = templates.find(t => t.id === id);
    if (!template) {
      reply.code(404);
      return { error: '模板不存在' };
    }
    return template;
  });

  fastify.post('/', async (request, reply) => {
    const { type, name, content, enabled } = request.body;
    if (!type || !name || !content) {
      reply.code(400);
      return { error: '请填写必填项：类型、名称、内容' };
    }
    ensureDefaultTemplates();
    const templates = getCollection('reminderTemplates');
    const newTemplate = {
      id: uuidv4(),
      type,
      name,
      content,
      enabled: enabled !== undefined ? enabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    templates.push(newTemplate);
    saveCollection('reminderTemplates', templates);
    return newTemplate;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    ensureDefaultTemplates();
    const templates = getCollection('reminderTemplates');
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '模板不存在' };
    }
    templates[index] = {
      ...templates[index],
      ...request.body,
      id: templates[index].id,
      createdAt: templates[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    saveCollection('reminderTemplates', templates);
    return templates[index];
  });

  fastify.post('/:id/toggle', async (request, reply) => {
    const { id } = request.params;
    ensureDefaultTemplates();
    const templates = getCollection('reminderTemplates');
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '模板不存在' };
    }
    templates[index].enabled = !templates[index].enabled;
    templates[index].updatedAt = new Date().toISOString();
    saveCollection('reminderTemplates', templates);
    return templates[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    ensureDefaultTemplates();
    const templates = getCollection('reminderTemplates');
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) {
      reply.code(404);
      return { error: '模板不存在' };
    }
    saveCollection('reminderTemplates', filtered);
    return { success: true };
  });

  fastify.post('/preview', async (request) => {
    const { content, variables } = request.body;
    let result = content || '';
    const vars = variables || {};
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, vars[key] || '');
    });
    return { preview: result };
  });

  fastify.post('/:id/send', async (request, reply) => {
    const { id } = request.params;
    const { appointmentId, variables } = request.body;

    ensureDefaultTemplates();
    const templates = getCollection('reminderTemplates');
    const template = templates.find(t => t.id === id);
    if (!template) {
      reply.code(404);
      return { error: '模板不存在' };
    }

    let content = template.content;
    const vars = variables || {};
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      content = content.replace(regex, vars[key] || '');
    });

    if (appointmentId) {
      const appointments = getCollection('appointments');
      const appointment = appointments.find(a => a.id === appointmentId);
      if (appointment) {
        appointment.reminderSent = true;
        appointment.updatedAt = new Date().toISOString();
        saveCollection('appointments', appointments);
        console.log(`[提醒发送] 模板: ${template.name}, 发送给: ${appointment.visitorName}(${appointment.visitorPhone}), 内容: ${content}`);
        return { sent: true, content, receiver: appointment.visitorPhone };
      }
    }

    console.log(`[提醒发送] 模板: ${template.name}, 内容: ${content}`);
    return { sent: true, content };
  });
}
