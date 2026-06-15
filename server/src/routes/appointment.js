import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show'
};

export default async function appointmentRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId, status, date, visitorPhone } = request.query;
    let appointments = getCollection('appointments');

    if (exhibitionId) {
      appointments = appointments.filter(a => a.exhibitionId === exhibitionId);
    }
    if (status) {
      appointments = appointments.filter(a => a.status === status);
    }
    if (date) {
      appointments = appointments.filter(a => a.appointmentDate === date);
    }
    if (visitorPhone) {
      appointments = appointments.filter(a => a.visitorPhone.includes(visitorPhone));
    }

    return appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }

    const timeSlots = getCollection('timeSlots');
    const timeSlot = timeSlots.find(t => t.id === appointment.timeSlotId);

    return { ...appointment, timeSlot };
  });

  fastify.post('/', async (request, reply) => {
    const {
      exhibitionId,
      visitorName,
      visitorPhone,
      visitorEmail,
      appointmentDate,
      timeSlotId,
      numberOfPeople,
      purpose,
      message,
      relation
    } = request.body;

    if (!exhibitionId || !visitorName || !visitorPhone || !appointmentDate || !timeSlotId) {
      reply.code(400);
      return { error: '请填写必填项：展厅、姓名、手机号、日期、时段' };
    }

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const timeSlots = getCollection('timeSlots');
    const timeSlot = timeSlots.find(t => t.id === timeSlotId && t.exhibitionId === exhibitionId);
    if (!timeSlot) {
      reply.code(404);
      return { error: '所选时段不存在' };
    }
    if (!timeSlot.isActive) {
      reply.code(400);
      return { error: '所选时段已关闭' };
    }

    const appointments = getCollection('appointments');
    const slotBookings = appointments.filter(
      a => a.timeSlotId === timeSlotId &&
        a.status !== APPOINTMENT_STATUS.CANCELLED &&
        a.status !== APPOINTMENT_STATUS.NO_SHOW
    );
    const totalPeople = slotBookings.reduce((sum, a) => sum + (a.numberOfPeople || 1), 0);
    if (totalPeople + (numberOfPeople || 1) > timeSlot.maxCapacity) {
      reply.code(400);
      return { error: '该时段预约人数已满' };
    }

    const newAppointment = {
      id: uuidv4(),
      exhibitionId,
      exhibitionTitle: exhibition.title,
      visitorName,
      visitorPhone,
      visitorEmail: visitorEmail || '',
      appointmentDate,
      timeSlotId,
      timeSlotLabel: `${timeSlot.startTime}-${timeSlot.endTime}`,
      numberOfPeople: numberOfPeople || 1,
      purpose: purpose || '',
      message: message || '',
      relation: relation || '',
      status: APPOINTMENT_STATUS.PENDING,
      reminderSent: false,
      checkInTime: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveCollection('appointments', appointments);

    const reminderTemplates = getCollection('reminderTemplates');
    const confirmTemplate = reminderTemplates.find(t => t.type === 'confirm' && t.enabled);
    if (confirmTemplate) {
      console.log(`[预约提醒] 发送给 ${visitorName}(${visitorPhone}): ${confirmTemplate.content}`);
    }

    return newAppointment;
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const updateData = request.body;
    const appointments = getCollection('appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }

    if (updateData.timeSlotId && updateData.timeSlotId !== appointments[index].timeSlotId) {
      const timeSlots = getCollection('timeSlots');
      const timeSlot = timeSlots.find(t => t.id === updateData.timeSlotId);
      if (!timeSlot) {
        reply.code(404);
        return { error: '所选时段不存在' };
      }
      if (!timeSlot.isActive) {
        reply.code(400);
        return { error: '所选时段已关闭' };
      }

      const slotBookings = appointments.filter(
        a => a.timeSlotId === updateData.timeSlotId &&
          a.id !== id &&
          a.status !== APPOINTMENT_STATUS.CANCELLED &&
          a.status !== APPOINTMENT_STATUS.NO_SHOW
      );
      const totalPeople = slotBookings.reduce((sum, a) => sum + (a.numberOfPeople || 1), 0);
      if (totalPeople + (updateData.numberOfPeople || appointments[index].numberOfPeople) > timeSlot.maxCapacity) {
        reply.code(400);
        return { error: '该时段预约人数已满' };
      }
      appointments[index].timeSlotLabel = `${timeSlot.startTime}-${timeSlot.endTime}`;
    }

    appointments[index] = {
      ...appointments[index],
      ...updateData,
      id: appointments[index].id,
      createdAt: appointments[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    saveCollection('appointments', appointments);
    return appointments[index];
  });

  fastify.post('/:id/confirm', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }
    appointments[index].status = APPOINTMENT_STATUS.CONFIRMED;
    appointments[index].updatedAt = new Date().toISOString();
    saveCollection('appointments', appointments);
    return appointments[index];
  });

  fastify.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }
    appointments[index].status = APPOINTMENT_STATUS.CANCELLED;
    appointments[index].updatedAt = new Date().toISOString();
    saveCollection('appointments', appointments);
    return appointments[index];
  });

  fastify.post('/:id/complete', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }
    appointments[index].status = APPOINTMENT_STATUS.COMPLETED;
    appointments[index].updatedAt = new Date().toISOString();
    saveCollection('appointments', appointments);
    return appointments[index];
  });

  fastify.post('/:id/no-show', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }
    appointments[index].status = APPOINTMENT_STATUS.NO_SHOW;
    appointments[index].updatedAt = new Date().toISOString();
    saveCollection('appointments', appointments);
    return appointments[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const appointments = getCollection('appointments');
    const filtered = appointments.filter(a => a.id !== id);
    if (filtered.length === appointments.length) {
      reply.code(404);
      return { error: '预约记录不存在' };
    }
    saveCollection('appointments', filtered);
    return { success: true };
  });

  fastify.get('/stats/summary', async (request) => {
    const { exhibitionId, startDate, endDate } = request.query;
    let appointments = getCollection('appointments');

    if (exhibitionId) {
      appointments = appointments.filter(a => a.exhibitionId === exhibitionId);
    }
    if (startDate) {
      appointments = appointments.filter(a => a.appointmentDate >= startDate);
    }
    if (endDate) {
      appointments = appointments.filter(a => a.appointmentDate <= endDate);
    }

    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length,
      confirmed: appointments.filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED).length,
      completed: appointments.filter(a => a.status === APPOINTMENT_STATUS.COMPLETED).length,
      cancelled: appointments.filter(a => a.status === APPOINTMENT_STATUS.CANCELLED).length,
      noShow: appointments.filter(a => a.status === APPOINTMENT_STATUS.NO_SHOW).length,
      totalVisitors: appointments.reduce((sum, a) => sum + (a.numberOfPeople || 1), 0)
    };

    return stats;
  });
}
