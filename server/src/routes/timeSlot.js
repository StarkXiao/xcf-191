import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

export default async function timeSlotRoutes(fastify) {
  fastify.get('/', async (request) => {
    const { exhibitionId, date, isActive } = request.query;
    let timeSlots = getCollection('timeSlots');

    if (exhibitionId) {
      timeSlots = timeSlots.filter(t => t.exhibitionId === exhibitionId);
    }
    if (date) {
      timeSlots = timeSlots.filter(t => t.date === date);
    }
    if (isActive !== undefined) {
      timeSlots = timeSlots.filter(t => t.isActive === (isActive === 'true'));
    }

    const appointments = getCollection('appointments');
    timeSlots = timeSlots.map(slot => {
      const slotBookings = appointments.filter(
        a => a.timeSlotId === slot.id &&
          a.status !== 'cancelled' &&
          a.status !== 'no_show'
      );
      const bookedCount = slotBookings.reduce((sum, a) => sum + (a.numberOfPeople || 1), 0);
      return {
        ...slot,
        bookedCount,
        availableCount: Math.max(0, slot.maxCapacity - bookedCount)
      };
    });

    return timeSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const timeSlots = getCollection('timeSlots');
    const timeSlot = timeSlots.find(t => t.id === id);
    if (!timeSlot) {
      reply.code(404);
      return { error: '时段不存在' };
    }

    const appointments = getCollection('appointments');
    const slotBookings = appointments.filter(
      a => a.timeSlotId === id &&
        a.status !== 'cancelled' &&
        a.status !== 'no_show'
    );
    const bookedCount = slotBookings.reduce((sum, a) => sum + (a.numberOfPeople || 1), 0);

    return {
      ...timeSlot,
      bookedCount,
      availableCount: Math.max(0, timeSlot.maxCapacity - bookedCount)
    };
  });

  fastify.post('/', async (request, reply) => {
    const {
      exhibitionId,
      date,
      startTime,
      endTime,
      maxCapacity,
      isActive,
      note
    } = request.body;

    if (!exhibitionId || !date || !startTime || !endTime || !maxCapacity) {
      reply.code(400);
      return { error: '请填写必填项：展厅、日期、开始时间、结束时间、最大容量' };
    }

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const timeSlots = getCollection('timeSlots');
    const conflict = timeSlots.find(t =>
      t.exhibitionId === exhibitionId &&
        t.date === date &&
        !(endTime <= t.startTime || startTime >= t.endTime)
    );
    if (conflict) {
      reply.code(400);
      return { error: '该时段与已有时间段冲突' };
    }

    const newTimeSlot = {
      id: uuidv4(),
      exhibitionId,
      exhibitionTitle: exhibition.title,
      date,
      startTime,
      endTime,
      maxCapacity: parseInt(maxCapacity, 10),
      isActive: isActive !== undefined ? isActive : true,
      note: note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    timeSlots.push(newTimeSlot);
    saveCollection('timeSlots', timeSlots);
    return newTimeSlot;
  });

  fastify.post('/batch', async (request, reply) => {
    const {
      exhibitionId,
      startDate,
      endDate,
      timeRanges,
      maxCapacity,
      weekdays
    } = request.body;

    if (!exhibitionId || !startDate || !endDate || !timeRanges || !maxCapacity) {
      reply.code(400);
      return { error: '请填写必填项' };
    }

    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);
    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const timeSlots = getCollection('timeSlots');
    const createdSlots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allowedWeekdays = weekdays || [0, 1, 2, 3, 4, 5, 6];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (!allowedWeekdays.includes(dayOfWeek)) continue;

      const dateStr = d.toISOString().split('T')[0];

      for (const range of timeRanges) {
        const { startTime, endTime } = range;
        if (!startTime || !endTime) continue;

        const conflict = timeSlots.find(t =>
          t.exhibitionId === exhibitionId &&
            t.date === dateStr &&
            !(endTime <= t.startTime || startTime >= t.endTime)
        );
        if (conflict) continue;

        const newSlot = {
          id: uuidv4(),
          exhibitionId,
          exhibitionTitle: exhibition.title,
          date: dateStr,
          startTime,
          endTime,
          maxCapacity: parseInt(maxCapacity, 10),
          isActive: true,
          note: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        timeSlots.push(newSlot);
        createdSlots.push(newSlot);
      }
    }

    saveCollection('timeSlots', timeSlots);
    return { created: createdSlots.length, slots: createdSlots };
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const updateData = request.body;
    const timeSlots = getCollection('timeSlots');
    const index = timeSlots.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '时段不存在' };
    }

    if (updateData.startTime || updateData.endTime || updateData.date) {
      const newDate = updateData.date || timeSlots[index].date;
      const newStart = updateData.startTime || timeSlots[index].startTime;
      const newEnd = updateData.endTime || timeSlots[index].endTime;
      const conflict = timeSlots.find(t =>
        t.id !== id &&
          t.exhibitionId === timeSlots[index].exhibitionId &&
          t.date === newDate &&
          !(newEnd <= t.startTime || newStart >= t.endTime)
      );
      if (conflict) {
        reply.code(400);
        return { error: '该时段与已有时间段冲突' };
      }
    }

    timeSlots[index] = {
      ...timeSlots[index],
      ...updateData,
      id: timeSlots[index].id,
      createdAt: timeSlots[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    saveCollection('timeSlots', timeSlots);
    return timeSlots[index];
  });

  fastify.post('/:id/toggle', async (request, reply) => {
    const { id } = request.params;
    const timeSlots = getCollection('timeSlots');
    const index = timeSlots.findIndex(t => t.id === id);
    if (index === -1) {
      reply.code(404);
      return { error: '时段不存在' };
    }
    timeSlots[index].isActive = !timeSlots[index].isActive;
    timeSlots[index].updatedAt = new Date().toISOString();
    saveCollection('timeSlots', timeSlots);
    return timeSlots[index];
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const timeSlots = getCollection('timeSlots');
    const filtered = timeSlots.filter(t => t.id !== id);
    if (filtered.length === timeSlots.length) {
      reply.code(404);
      return { error: '时段不存在' };
    }
    saveCollection('timeSlots', filtered);
    return { success: true };
  });

  fastify.delete('/cleanup/expired', async () => {
    const timeSlots = getCollection('timeSlots');
    const today = new Date().toISOString().split('T')[0];
    const filtered = timeSlots.filter(t => t.date >= today);
    const deletedCount = timeSlots.length - filtered.length;
    saveCollection('timeSlots', filtered);
    return { deleted: deletedCount };
  });
}
