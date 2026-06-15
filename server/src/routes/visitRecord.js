import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const VISIT_STATUS = {
  CHECKED_IN: 'checked_in',
  IN_VISIT: 'in_visit',
  CHECKED_OUT: 'checked_out'
};

export default async function visitRecordRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId, appointmentId, status, visitorPhone, startDate, endDate } = request.query;
    let records = getCollection('visitRecords');

    if (exhibitionId) {
      records = records.filter(r => r.exhibitionId === exhibitionId);
    }
    if (appointmentId) {
      records = records.filter(r => r.appointmentId === appointmentId);
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }
    if (visitorPhone) {
      records = records.filter(r => r.visitorPhone && r.visitorPhone.includes(visitorPhone));
    }
    if (startDate) {
      records = records.filter(r => r.checkInTime >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.checkInTime <= endDate + 'T23:59:59.999Z');
    }

    return records.sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const records = getCollection('visitRecords');
    const record = records.find(r => r.id === id);
    if (!record) {
      reply.code(404);
      return { error: '访问记录不存在' };
    }
    return record;
  });

  fastify.post('/checkin', async (request, reply) => {
    const { appointmentId, visitorPhone, exhibitionId, visitorName, numberOfPeople } = request.body;

    let appointment = null;
    if (appointmentId) {
      const appointments = getCollection('appointments');
      appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        reply.code(404);
        return { error: '预约记录不存在' };
      }
      if (appointment.status === 'cancelled') {
        reply.code(400);
        return { error: '该预约已取消' };
      }
    } else if (!visitorPhone && !exhibitionId) {
      reply.code(400);
      return { error: '请提供预约ID或手机号+展厅ID' };
    }

    if (!appointment && visitorPhone && exhibitionId) {
      const appointments = getCollection('appointments');
      const today = new Date().toISOString().split('T')[0];
      appointment = appointments.find(a =>
        a.exhibitionId === exhibitionId &&
          a.visitorPhone === visitorPhone &&
          a.appointmentDate === today &&
          a.status !== 'cancelled'
      );
      if (!appointment) {
        reply.code(404);
        return { error: '未找到今日有效的预约记录' };
      }
    }

    if (!appointment) {
      reply.code(400);
      return { error: '无法确定预约信息' };
    }

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === appointment.exhibitionId);

    const visitRecords = getCollection('visitRecords');
    const existingVisit = visitRecords.find(r =>
      r.appointmentId === appointment.id &&
        r.status !== VISIT_STATUS.CHECKED_OUT
    );
    if (existingVisit) {
      reply.code(400);
      return { error: '该访客已签到，请勿重复操作', record: existingVisit };
    }

    const newRecord = {
      id: uuidv4(),
      appointmentId: appointment.id,
      exhibitionId: appointment.exhibitionId,
      exhibitionTitle: exhibition ? exhibition.title : appointment.exhibitionTitle,
      visitorName: visitorName || appointment.visitorName,
      visitorPhone: appointment.visitorPhone,
      numberOfPeople: numberOfPeople || appointment.numberOfPeople || 1,
      status: VISIT_STATUS.CHECKED_IN,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      purpose: appointment.purpose || '',
      relation: appointment.relation || '',
      createdAt: new Date().toISOString()
    };

    visitRecords.push(newRecord);
    saveCollection('visitRecords', visitRecords);

    const appointments = getCollection('appointments');
    const aptIndex = appointments.findIndex(a => a.id === appointment.id);
    if (aptIndex !== -1) {
      appointments[aptIndex].checkInTime = newRecord.checkInTime;
      appointments[aptIndex].status = 'confirmed';
      appointments[aptIndex].updatedAt = new Date().toISOString();
      saveCollection('appointments', appointments);
    }

    const reminderTemplates = getCollection('reminderTemplates');
    const checkinTemplate = reminderTemplates.find(t => t.type === 'checkin' && t.enabled);
    if (checkinTemplate) {
      let content = checkinTemplate.content
        .replace(/\{visitorName\}/g, newRecord.visitorName)
        .replace(/\{exhibitionTitle\}/g, newRecord.exhibitionTitle);
      console.log(`[签到欢迎] 发送给 ${newRecord.visitorName}(${newRecord.visitorPhone}): ${content}`);
    }

    return {
      ...newRecord,
      exhibition,
      welcomeMessage: checkinTemplate ? checkinTemplate.content
        .replace(/\{visitorName\}/g, newRecord.visitorName)
        .replace(/\{exhibitionTitle\}/g, newRecord.exhibitionTitle) : null
    };
  });

  fastify.post('/checkout', async (request, reply) => {
    const { id, appointmentId } = request.body;
    const visitRecords = getCollection('visitRecords');

    let recordIndex = -1;
    if (id) {
      recordIndex = visitRecords.findIndex(r => r.id === id);
    } else if (appointmentId) {
      recordIndex = visitRecords.findIndex(
        r => r.appointmentId === appointmentId && r.status !== VISIT_STATUS.CHECKED_OUT
      );
    }

    if (recordIndex === -1) {
      reply.code(404);
      return { error: '未找到有效的访问记录' };
    }

    visitRecords[recordIndex].status = VISIT_STATUS.CHECKED_OUT;
    visitRecords[recordIndex].checkOutTime = new Date().toISOString();

    const checkIn = new Date(visitRecords[recordIndex].checkInTime);
    const checkOut = new Date(visitRecords[recordIndex].checkOutTime);
    const durationMinutes = Math.round((checkOut - checkIn) / 60000);
    visitRecords[recordIndex].durationMinutes = durationMinutes;

    saveCollection('visitRecords', visitRecords);

    if (visitRecords[recordIndex].appointmentId) {
      const appointments = getCollection('appointments');
      const aptIndex = appointments.findIndex(a => a.id === visitRecords[recordIndex].appointmentId);
      if (aptIndex !== -1) {
        appointments[aptIndex].status = 'completed';
        appointments[aptIndex].updatedAt = new Date().toISOString();
        saveCollection('appointments', appointments);
      }
    }

    return visitRecords[recordIndex];
  });

  fastify.post('/verify', async (request, reply) => {
    const { appointmentId, visitorPhone, exhibitionId, appointmentDate } = request.body;

    let appointment = null;
    const appointments = getCollection('appointments');

    if (appointmentId) {
      appointment = appointments.find(a => a.id === appointmentId);
    } else if (visitorPhone && exhibitionId) {
      const date = appointmentDate || new Date().toISOString().split('T')[0];
      appointment = appointments.find(a =>
        a.exhibitionId === exhibitionId &&
          a.visitorPhone === visitorPhone &&
          a.appointmentDate === date
      );
    }

    if (!appointment) {
      return {
        valid: false,
        message: '未找到预约记录',
        canCheckIn: false
      };
    }

    const visitRecords = getCollection('visitRecords');
    const alreadyCheckedIn = visitRecords.some(r =>
      r.appointmentId === appointment.id &&
        r.status !== VISIT_STATUS.CHECKED_OUT
    );

    const today = new Date().toISOString().split('T')[0];
    const isToday = appointment.appointmentDate === today;
    const isCancelled = appointment.status === 'cancelled';

    return {
      valid: true,
      appointment,
      canCheckIn: !alreadyCheckedIn && isToday && !isCancelled,
      alreadyCheckedIn,
      isToday,
      isCancelled,
      message: alreadyCheckedIn
        ? '该访客已签到'
        : !isToday
          ? '非预约当日'
          : isCancelled
            ? '预约已取消'
            : '可以签到'
    };
  });

  fastify.get('/stats/summary', async (request) => {
    const { exhibitionId, startDate, endDate } = request.query;
    let records = getCollection('visitRecords');

    if (exhibitionId) {
      records = records.filter(r => r.exhibitionId === exhibitionId);
    }
    if (startDate) {
      records = records.filter(r => r.checkInTime >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.checkInTime <= endDate + 'T23:59:59.999Z');
    }

    const totalCheckIns = records.length;
    const checkedOut = records.filter(r => r.status === VISIT_STATUS.CHECKED_OUT);
    const inVisit = records.filter(r => r.status !== VISIT_STATUS.CHECKED_OUT).length;
    const totalVisitors = records.reduce((sum, r) => sum + (r.numberOfPeople || 1), 0);
    const avgDuration = checkedOut.length > 0
      ? Math.round(checkedOut.reduce((sum, r) => sum + (r.durationMinutes || 0), 0) / checkedOut.length)
      : 0;

    const dailyStats = {};
    records.forEach(r => {
      const date = r.checkInTime.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { checkIns: 0, visitors: 0 };
      }
      dailyStats[date].checkIns++;
      dailyStats[date].visitors += r.numberOfPeople || 1;
    });

    return {
      totalCheckIns,
      inVisit,
      totalVisitors,
      avgDurationMinutes: avgDuration,
      dailyStats
    };
  });

  fastify.post('/quick-entry', async (request, reply) => {
    const { exhibitionId, visitorName, visitorPhone, numberOfPeople, purpose, relation } = request.body;

    if (!exhibitionId || !visitorName) {
      reply.code(400);
      return { error: '请填写展厅和访客姓名' };
    }

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const visitRecords = getCollection('visitRecords');
    const newRecord = {
      id: uuidv4(),
      appointmentId: null,
      exhibitionId,
      exhibitionTitle: exhibition.title,
      visitorName,
      visitorPhone: visitorPhone || '',
      numberOfPeople: numberOfPeople || 1,
      status: VISIT_STATUS.CHECKED_IN,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      purpose: purpose || '现场参观',
      relation: relation || '',
      isQuickEntry: true,
      createdAt: new Date().toISOString()
    };

    visitRecords.push(newRecord);
    saveCollection('visitRecords', visitRecords);

    const reminderTemplates = getCollection('reminderTemplates');
    const checkinTemplate = reminderTemplates.find(t => t.type === 'checkin' && t.enabled);
    const welcomeMessage = checkinTemplate
      ? checkinTemplate.content
        .replace(/\{visitorName\}/g, visitorName)
        .replace(/\{exhibitionTitle\}/g, exhibition.title)
      : null;

    return {
      ...newRecord,
      exhibition,
      welcomeMessage
    };
  });
}
