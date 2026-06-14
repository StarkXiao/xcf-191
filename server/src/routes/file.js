import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { UPLOADS_DIR, ensureDir } from '../config.js';

const ensureSubDir = (subDir) => {
  const dir = join(UPLOADS_DIR, subDir);
  ensureDir(dir);
  return dir;
};

export default async function fileRoutes(fastify) {
  fastify.post('/upload', async (request, reply) => {
    const parts = request.files();
    const uploadedFiles = [];

    for await (const part of parts) {
      if (!part.file) continue;

      const originalExt = extname(part.filename || '').toLowerCase();
      const fileId = uuidv4();
      const fileName = `${fileId}${originalExt}`;

      let subDir = 'others';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(originalExt)) {
        subDir = 'images';
      } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(originalExt)) {
        subDir = 'audios';
      } else if (['.mp4', '.webm', '.mov'].includes(originalExt)) {
        subDir = 'videos';
      }

      const targetDir = ensureSubDir(subDir);
      const filePath = join(targetDir, fileName);

      await pipeline(part.file, fs.createWriteStream(filePath));

      uploadedFiles.push({
        id: fileId,
        filename: part.filename,
        url: `/uploads/${subDir}/${fileName}`,
        type: subDir,
        size: fs.statSync(filePath).size
      });
    }

    return { files: uploadedFiles };
  });

  fastify.delete('/:type/:filename', async (request, reply) => {
    const { type, filename } = request.params;
    const filePath = join(UPLOADS_DIR, type, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }

    reply.code(404);
    return { error: '文件不存在' };
  });
}
