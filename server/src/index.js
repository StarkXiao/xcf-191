import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import exhibitionRoutes from './routes/exhibition.js';
import materialRoutes from './routes/material.js';
import timelineRoutes from './routes/timeline.js';
import messageRoutes from './routes/message.js';
import fileRoutes from './routes/file.js';
import { initStorage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const uploadsDir = join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/'
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

const start = async () => {
  try {
    await fastify.listen({ port: 4500, host: '0.0.0.0' });
    console.log('🚀 星屑纪念馆后端服务已启动: http://localhost:4500');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
