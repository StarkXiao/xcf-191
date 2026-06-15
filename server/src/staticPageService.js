import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { collectExhibitionData, getTempDir, computeFileHash, MANIFEST_FILENAME, CHECKSUM_FILENAME, EXPORT_VERSION } from './backupService.js';
import { ensureDir } from './config.js';

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatDate = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return isoStr;
  }
};

const buildStaticHtml = (data) => {
  const { exhibition, materials, timelines, messages } = data;

  const materialById = new Map(materials.map((m) => [m.id, m]));

  const sortedTimelines = [...timelines].sort(
    (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
  );

  const timelineHtml = sortedTimelines
    .map((t) => {
      const timelineMaterials = (t.materialIds || [])
        .map((mid) => materialById.get(mid))
        .filter(Boolean);

      const materialCardsHtml = timelineMaterials
        .map((m) => {
          const relPath = m.url ? './files/' + m.url.replace('/uploads/', '') : '';
          if (m.type === 'image' && relPath) {
            return `<div class="material-card image">
              <img src="${escapeHtml(relPath)}" alt="${escapeHtml(m.title)}" loading="lazy" />
              ${m.title ? `<div class="material-title">${escapeHtml(m.title)}</div>` : ''}
              ${m.description ? `<div class="material-desc">${escapeHtml(m.description)}</div>` : ''}
            </div>`;
          }
          if (m.type === 'audio' && relPath) {
            return `<div class="material-card audio">
              <audio controls preload="metadata" src="${escapeHtml(relPath)}"></audio>
              ${m.title ? `<div class="material-title">${escapeHtml(m.title)}</div>` : ''}
              ${m.description ? `<div class="material-desc">${escapeHtml(m.description)}</div>` : ''}
            </div>`;
          }
          if (m.type === 'video' && relPath) {
            return `<div class="material-card video">
              <video controls preload="metadata" src="${escapeHtml(relPath)}" poster=""></video>
              ${m.title ? `<div class="material-title">${escapeHtml(m.title)}</div>` : ''}
              ${m.description ? `<div class="material-desc">${escapeHtml(m.description)}</div>` : ''}
            </div>`;
          }
          if (m.type === 'text') {
            return `<div class="material-card text">
              ${m.title ? `<div class="material-title">${escapeHtml(m.title)}</div>` : ''}
              ${m.description ? `<div class="material-desc">${escapeHtml(m.description)}</div>` : ''}
            </div>`;
          }
          return '';
        })
        .join('');

      const locationHtml =
        t.location && (t.location.name || t.location.address)
          ? `<div class="timeline-location">
              📍 ${escapeHtml(t.location.name || '')} ${escapeHtml(t.location.address ? `(${t.location.address})` : '')}
            </div>`
          : '';

      return `<div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-date">${escapeHtml(formatDate(t.eventDate))}</div>
          <h3 class="timeline-title">${escapeHtml(t.title || '未命名事件')}</h3>
          ${t.description ? `<p class="timeline-desc">${escapeHtml(t.description)}</p>` : ''}
          ${locationHtml}
          ${timelineMaterials.length > 0 ? `<div class="timeline-materials">${materialCardsHtml}</div>` : ''}
        </div>
      </div>`;
    })
    .join('');

  const messageHtml = messages.length
    ? `<section class="messages-section">
        <h2 class="section-title">💌 留言板</h2>
        <div class="messages-list">
          ${messages
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((msg) => {
              const avatarRel = msg.avatar ? './files/' + msg.avatar.replace('/uploads/', '') : '';
              return `<div class="message-item">
                ${avatarRel ? `<img class="message-avatar" src="${escapeHtml(avatarRel)}" alt="" />` : `<div class="message-avatar-placeholder">${escapeHtml((msg.author || '匿')[0])}</div>`}
                <div class="message-body">
                  <div class="message-header">
                    <span class="message-author">${escapeHtml(msg.author || '匿名访客')}</span>
                    <span class="message-time">${escapeHtml(formatDate(msg.createdAt))}</span>
                  </div>
                  <div class="message-content">${escapeHtml(msg.content || '')}</div>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </section>`
    : '';

  const coverRel = exhibition.coverImage
    ? './files/' + exhibition.coverImage.replace('/uploads/', '')
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(exhibition.title || '回忆展厅')} - 星屑纪念馆</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #f0f0f0;
  min-height: 100vh;
  line-height: 1.6;
}
.container { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 50px; }
.cover-image {
  width: 100%; max-height: 360px; object-fit: cover; border-radius: 16px;
  margin-bottom: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.4);
}
.exhibition-title {
  font-size: 2.4em; font-weight: 700; margin-bottom: 12px;
  background: linear-gradient(90deg, #e94560, #ffd700);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.exhibition-desc { font-size: 1.05em; color: #b0b8d4; max-width: 700px; margin: 0 auto; }
.section-title {
  font-size: 1.6em; margin: 40px 0 24px; padding-bottom: 12px;
  border-bottom: 2px solid rgba(233, 69, 96, 0.5);
}
.timeline { position: relative; padding-left: 32px; }
.timeline::before {
  content: ''; position: absolute; left: 10px; top: 0; bottom: 0;
  width: 2px; background: linear-gradient(180deg, #e94560, #ffd700);
}
.timeline-item { position: relative; margin-bottom: 32px; }
.timeline-dot {
  position: absolute; left: -28px; top: 8px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #e94560; border: 3px solid #16213e;
  box-shadow: 0 0 10px rgba(233,69,96,0.6);
}
.timeline-content {
  background: rgba(255,255,255,0.06); padding: 20px;
  border-radius: 12px; backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
}
.timeline-date { color: #ffd700; font-size: 0.95em; font-weight: 600; margin-bottom: 8px; }
.timeline-title { font-size: 1.25em; margin-bottom: 8px; }
.timeline-desc { color: #c0c8d8; margin-bottom: 12px; }
.timeline-location { color: #8ecae6; font-size: 0.9em; margin-bottom: 12px; }
.timeline-materials { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); margin-top: 12px; }
.material-card {
  background: rgba(0,0,0,0.3); border-radius: 10px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}
.material-card img { width: 100%; height: 160px; object-fit: cover; display: block; }
.material-card video, .material-card audio { width: 100%; display: block; }
.material-card.text { padding: 14px; }
.material-title { padding: 8px 12px 4px; font-weight: 600; font-size: 0.95em; }
.material-desc { padding: 0 12px 12px; color: #a0a8b8; font-size: 0.85em; }
.messages-list { display: flex; flex-direction: column; gap: 16px; }
.message-item { display: flex; gap: 12px; }
.message-avatar, .message-avatar-placeholder {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #e94560, #ffd700);
  font-weight: bold; color: white; font-size: 1.1em;
}
.message-avatar { object-fit: cover; }
.message-body {
  flex: 1; background: rgba(255,255,255,0.06); padding: 14px 16px;
  border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
}
.message-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.message-author { font-weight: 600; }
.message-time { color: #8892a8; font-size: 0.85em; }
.message-content { color: #d0d8e8; }
.footer {
  margin-top: 60px; padding: 24px; text-align: center;
  color: #606880; font-size: 0.85em; border-top: 1px solid rgba(255,255,255,0.1);
}
.backup-info { color: #8892a8; font-size: 0.8em; margin-top: 8px; }
.empty-state { text-align: center; padding: 40px; color: #8892a8; }
@media (max-width: 640px) {
  .container { padding: 20px 14px; }
  .exhibition-title { font-size: 1.6em; }
  .timeline-materials { grid-template-columns: 1fr 1fr; }
}
</style>
</head>
<body>
<div class="container">
  <header class="header">
    ${coverRel ? `<img class="cover-image" src="${escapeHtml(coverRel)}" alt="${escapeHtml(exhibition.title || '')}" />` : ''}
    <h1 class="exhibition-title">${escapeHtml(exhibition.title || '未命名展厅')}</h1>
    ${exhibition.description ? `<p class="exhibition-desc">${escapeHtml(exhibition.description)}</p>` : ''}
  </header>

  <section class="timeline-section">
    <h2 class="section-title">📖 回忆时间线</h2>
    ${sortedTimelines.length > 0
      ? `<div class="timeline">${timelineHtml}</div>`
      : `<div class="empty-state">暂无时间线记录</div>`}
  </section>

  ${messageHtml}

  <footer class="footer">
    <div>✨ 星屑纪念馆 · 离线回忆页</div>
    <div class="backup-info">导出时间: ${new Date().toLocaleString('zh-CN')} · 格式版本 v${EXPORT_VERSION}</div>
  </footer>
</div>
</body>
</html>`;
};

export const generateStaticPage = async (exhibitionId) => {
  const collected = collectExhibitionData(exhibitionId);
  if (!collected) {
    throw new Error('展厅不存在');
  }

  const tempDir = getTempDir(`static-${exhibitionId}-`);
  try {
    const filesDir = path.join(tempDir, 'files');
    ensureDir(filesDir);
    for (const file of collected.files) {
      const destPath = path.join(filesDir, file.relativePath);
      ensureDir(path.dirname(destPath));
      if (fs.existsSync(file.filePath)) {
        fs.copyFileSync(file.filePath, destPath);
      }
    }

    const htmlContent = buildStaticHtml({
      exhibition: collected.exhibition,
      materials: collected.materials,
      timelines: collected.timelines,
      messages: collected.messages
    });
    const htmlPath = path.join(tempDir, 'index.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

    const dataJson = {
      exhibition: collected.exhibition,
      materials: collected.materials,
      timelines: collected.timelines,
      messages: collected.messages,
      memoryMap: collected.memoryMap
    };
    fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(dataJson, null, 2), 'utf-8');

    const checksums = {};
    checksums['index.html'] = await computeFileHash(htmlPath);
    checksums['data.json'] = await computeFileHash(path.join(tempDir, 'data.json'));
    for (const file of collected.files) {
      const filePath = path.join(filesDir, file.relativePath);
      if (fs.existsSync(filePath)) {
        checksums[`files/${file.relativePath}`] = await computeFileHash(filePath);
      }
    }
    fs.writeFileSync(path.join(tempDir, CHECKSUM_FILENAME), JSON.stringify(checksums, null, 2), 'utf-8');

    const safeTitle = (collected.exhibition.title || 'exhibition').replace(
      /[^a-zA-Z0-9\u4e00-\u9fa5_-]/g,
      '_'
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipName = `static-${safeTitle}-${timestamp}.zip`;

    const exportDir = path.join(tempDir, '..');
    ensureDir(exportDir);
    const zipPath = path.join(exportDir, zipName);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });

    const finalDir = path.join(
      path.dirname(path.dirname(tempDir)),
      'exports'
    );
    ensureDir(finalDir);
    const finalPath = path.join(finalDir, zipName);
    fs.renameSync(zipPath, finalPath);

    return {
      filename: zipName,
      path: finalPath,
      size: fs.statSync(finalPath).size,
      title: collected.exhibition.title,
      fileCount: collected.files.length
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
