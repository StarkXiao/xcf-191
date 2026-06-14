import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

import exhibitionRoutes from './routes/exhibition.js';
import materialRoutes from './routes/material.js';
import timelineRoutes from './routes/timeline.js';
import messageRoutes from './routes/message.js';
import fileRoutes from './routes/file.js';
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
