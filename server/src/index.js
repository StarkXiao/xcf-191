import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

import exhibitionRoutes from './routes/exhibition.js';
import materialRoutes from './routes/material.js';
import timelineRoutes from './routes/timeline.js';
import messageRoutes from './routes/message.js';
import fileRoutes from './routes/file.js';
import shareRoutes from './routes/share.js';
import memoryMapRoutes from './routes/memoryMap.js';
import familyAlbumRoutes from './routes/familyAlbum.js';
import familyMemberRoutes from './routes/familyMember.js';
import exportBackupRoutes from './routes/exportBackup.js';
import appointmentRoutes from './routes/appointment.js';
import timeSlotRoutes from './routes/timeSlot.js';
import reminderTemplateRoutes from './routes/reminderTemplate.js';
import visitRecordRoutes from './routes/visitRecord.js';
import memorialRitualRoutes from './routes/memorialRitual.js';
import collectionRoutes from './routes/collection.js';
import growthTrajectoryRoutes from './routes/growthTrajectory.js';
import { initStorage } from './storage.js';
import { UPLOADS_DIR } from './config.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 100 * 1024 * 1024
});

await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

await fastify.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false
});

initStorage();

fastify.register(exhibitionRoutes, { prefix: '/api/exhibitions' });
fastify.register(materialRoutes, { prefix: '/api/materials' });
fastify.register(timelineRoutes, { prefix: '/api/timelines' });
fastify.register(messageRoutes, { prefix: '/api/messages' });
fastify.register(fileRoutes, { prefix: '/api/files' });
fastify.register(shareRoutes, { prefix: '/api/shares' });
fastify.register(memoryMapRoutes, { prefix: '/api/memory-maps' });
fastify.register(familyAlbumRoutes, { prefix: '/api/family-albums' });
fastify.register(familyMemberRoutes, { prefix: '/api/family-members' });
fastify.register(exportBackupRoutes, { prefix: '/api/backup' });
fastify.register(appointmentRoutes, { prefix: '/api/appointments' });
fastify.register(timeSlotRoutes, { prefix: '/api/time-slots' });
fastify.register(reminderTemplateRoutes, { prefix: '/api/reminder-templates' });
fastify.register(visitRecordRoutes, { prefix: '/api/visit-records' });
fastify.register(memorialRitualRoutes, { prefix: '/api/memorial-rituals' });
fastify.register(collectionRoutes, { prefix: '/api/collections' });
fastify.register(growthTrajectoryRoutes, { prefix: '/api/growth-trajectories' });

fastify.get('/api/health', async () => {
  return { status: 'ok', time: new Date().toISOString() };
});

fastify.get('/api/debug/paths', async () => {
  return {
    uploadsDir: UPLOADS_DIR,
    uploadsExists: await import('fs').then(fs => fs.default.existsSync(UPLOADS_DIR))
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: 4500, host: '0.0.0.0' });
    console.log('🚀 星屑纪念馆后端服务已启动: http://localhost:4500');
    console.log(`📁 上传文件目录: ${UPLOADS_DIR}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
