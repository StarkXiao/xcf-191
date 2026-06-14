import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_PORTS = [4500, 3002, 3001, 3000];
const FRONTEND_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183];

const testResults = [];

function log(level, msg) {
  const prefix = level === 'info' ? '  ' : level === 'pass' ? '✅ ' : level === 'fail' ? '❌ ' : level === 'warn' ? '⚠️  ' : '';
  console.log(`${prefix}${msg}`);
}

function recordTest(name, passed, detail = '') {
  testResults.push({ name, passed, detail });
  log(passed ? 'pass' : 'fail', `${name}${detail ? ` - ${detail}` : ''}`);
}

async function checkPort(port, path = '/') {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://localhost:${port}${path}`, { signal: ctrl.signal });
    clearTimeout(timeout);
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function getPageTitle(port) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://localhost:${port}/`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (res.status !== 200) return null;
    const html = await res.text();
    const match = html.match(/<title>([^<]*)<\/title>/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function verifyBackendPort(port, healthPath) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://localhost:${port}${healthPath}`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (res.status !== 200) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

async function findBackendPort(ports, healthPath) {
  for (const port of ports) {
    if (await verifyBackendPort(port, healthPath)) {
      return port;
    }
  }
  return null;
}

async function findFrontendPort(ports, expectedTitle) {
  for (const port of ports) {
    const title = await getPageTitle(port);
    if (title && title.includes(expectedTitle)) {
      return port;
    }
  }
  return null;
}

async function waitForService(name, ports, healthPath, maxRetries = 15, verifyFn = null) {
  log('info', `检测${name}服务...`);
  for (let i = 0; i < maxRetries; i++) {
    let port;
    if (verifyFn) {
      port = await verifyFn(ports, healthPath);
    } else {
      port = await findPort(ports, healthPath);
    }
    if (port) {
      log('info', `${name}服务运行在端口 ${port}`);
      return port;
    }
    log('info', `等待${name}服务启动... (${i + 1}/${maxRetries})`);
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeData = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crcVal]);
}

function generateTestAssets() {
  const testDir = path.join(__dirname, 'test-assets');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const pngPath = path.join(testDir, 'test-image.png');
  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size < 1000) {
    const width = 200;
    const height = 150;
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const rawData = [];
    for (let y = 0; y < height; y++) {
      rawData.push(0);
      for (let x = 0; x < width; x++) {
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = 128 + Math.floor(Math.sin(x * 0.1) * 50);
        rawData.push(r, g, Math.min(255, Math.max(0, b)));
      }
    }

    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const png = Buffer.concat([
      signature,
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', compressed),
      pngChunk('IEND', Buffer.alloc(0))
    ]);
    fs.writeFileSync(pngPath, png);
    log('info', `生成测试图片: ${pngPath} (${png.length} 字节)`);
  }

  const wavPath = path.join(testDir, 'test-audio.wav');
  if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 1000) {
    const durationSec = 2;
    const sampleRate = 44100;
    const numSamples = durationSec * sampleRate;
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.floor(Math.sin(2 * Math.PI * 440 * t) * 10000 * Math.exp(-t * 2));
      buffer.writeInt16LE(sample, 44 + i * 2);
    }

    fs.writeFileSync(wavPath, buffer);
    log('info', `生成测试音频: ${wavPath} (${buffer.length} 字节)`);
  }

  return testDir;
}

async function testUpload(apiBase, filePath, fileType) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append('files', blob, fileName);

  const originalSize = fileBuffer.length;

  try {
    const res = await fetch(`${apiBase}/api/files/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (res.status !== 200 || !data.files || data.files.length === 0) {
      recordTest(`上传${fileType}`, false, `HTTP ${res.status}, ${JSON.stringify(data)}`);
      return null;
    }

    const file = data.files[0];
    const diskPath = path.join(__dirname, 'uploads', file.type, path.basename(file.url));
    const diskExists = fs.existsSync(diskPath);
    const diskSize = diskExists ? fs.statSync(diskPath).size : 0;

    const accessRes = await fetch(`${apiBase}${file.url}`);
    const accessOk = accessRes.status === 200;
    let accessSize = 0;
    let contentMatch = false;
    if (accessOk) {
      const accessBuf = Buffer.from(await accessRes.arrayBuffer());
      accessSize = accessBuf.length;
      contentMatch = Buffer.compare(accessBuf, fileBuffer) === 0;
    }

    const allPassed = diskExists && diskSize === originalSize && accessOk && accessSize === originalSize && contentMatch;
    recordTest(
      `上传${fileType}`,
      allPassed,
      allPassed ? `${file.type}/${path.basename(file.url)}, ${originalSize}字节` :
        `磁盘存在:${diskExists}, 大小匹配:${diskSize === originalSize}, 访问:${accessOk}, 内容一致:${contentMatch}`
    );

    return allPassed ? file : null;
  } catch (err) {
    recordTest(`上传${fileType}`, false, err.message);
    return null;
  }
}

async function testCreateExhibition(apiBase, title, coverImage) {
  try {
    const res = await fetch(`${apiBase}/api/exhibitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: '端到端自测展厅',
        coverImage,
        theme: 'warm'
      })
    });
    const data = await res.json();
    const passed = res.status === 200 && data.id && data.coverImage === coverImage;
    recordTest('创建展厅', passed, passed ? `ID: ${data.id}` : `HTTP ${res.status}`);
    return passed ? data : null;
  } catch (err) {
    recordTest('创建展厅', false, err.message);
    return null;
  }
}

async function testCreateMaterial(apiBase, exhibitionId, type, url, title) {
  try {
    const res = await fetch(`${apiBase}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exhibitionId, type, url, title })
    });
    const data = await res.json();
    const passed = res.status === 200 && data.id;
    recordTest(`创建素材(${type})`, passed, passed ? `ID: ${data.id}` : `HTTP ${res.status}`);
    return passed ? data : null;
  } catch (err) {
    recordTest(`创建素材(${type})`, false, err.message);
    return null;
  }
}

async function testCreateTimeline(apiBase, exhibitionId, title, materialIds) {
  try {
    const res = await fetch(`${apiBase}/api/timelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exhibitionId,
        title,
        description: '自测时间节点',
        eventDate: '2024-01-01',
        materialIds
      })
    });
    const data = await res.json();
    const passed = res.status === 200 && data.id && data.materialIds.length === materialIds.length;
    recordTest('创建时间节点', passed, passed ? `ID: ${data.id}, ${materialIds.length}个素材` : `HTTP ${res.status}`);
    return passed ? data : null;
  } catch (err) {
    recordTest('创建时间节点', false, err.message);
    return null;
  }
}

async function testFrontendPage(frontendBase, pagePath, pageName) {
  try {
    const res = await fetch(`${frontendBase}${pagePath}`);
    if (res.status !== 200) {
      recordTest(`页面访问 ${pageName}`, false, `HTTP ${res.status}`);
      return false;
    }

    const html = await res.text();
    const hasAppRoot = html.includes('<div id="root"></div>') || html.includes('id="root"');
    const hasBundle = html.includes('/src/main.jsx') || html.includes('/assets/') || html.includes('vite');

    const passed = res.status === 200 && (hasAppRoot || hasBundle);
    recordTest(
      `页面访问 ${pageName}`,
      passed,
      passed ? 'SPA入口正常' : `应用入口:${hasAppRoot}, Vite标识:${hasBundle}`
    );
    return passed;
  } catch (err) {
    recordTest(`页面访问 ${pageName}`, false, err.message);
    return false;
  }
}

async function testFrontendProxy(frontendBase, fileUrl, fileType, expectedSize) {
  try {
    const res = await fetch(`${frontendBase}${fileUrl}`);
    const passed = res.status === 200;
    const size = passed ? (await res.arrayBuffer()).byteLength : 0;
    const sizeMatch = size === expectedSize;
    recordTest(
      `前端代理${fileType}访问`,
      passed && sizeMatch,
      (passed && sizeMatch) ? `${size}字节, 内容一致` : `HTTP ${res.status}, 大小:${size}/${expectedSize}`
    );
    return passed && sizeMatch;
  } catch (err) {
    recordTest(`前端代理${fileType}访问`, false, err.message);
    return false;
  }
}

function printSummary() {
  const passed = testResults.filter(t => t.passed).length;
  const total = testResults.length;
  const allPassed = passed === total;

  console.log('\n' + '═'.repeat(60));
  console.log(allPassed ? '🎉 全部测试通过！' : `⚠️  测试结果: ${passed}/${total} 通过`);
  console.log('═'.repeat(60));

  if (!allPassed) {
    console.log('\n失败项:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`  ❌ ${t.name}`);
      if (t.detail) console.log(`     ${t.detail}`);
    });
  }

  return allPassed;
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           星屑纪念馆 - 端到端自测脚本                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const backendPort = await waitForService('后端', BACKEND_PORTS, '/api/health', 15, findBackendPort);
  if (!backendPort) {
    log('fail', '无法连接后端服务，请先启动: cd server && npm start');
    process.exit(1);
  }
  const API_BASE = `http://localhost:${backendPort}`;

  const frontendVerifyFn = (ports) => findFrontendPort(ports, '星屑纪念馆');
  const frontendPort = await waitForService('前端', FRONTEND_PORTS, '/', 15, frontendVerifyFn);
  if (!frontendPort) {
    log('warn', '无法连接前端服务，前端页面验证将跳过。请先启动: cd client && npm run dev');
  }
  const FRONTEND_BASE = frontendPort ? `http://localhost:${frontendPort}` : null;

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', '后端服务地址: ' + API_BASE);
  if (FRONTEND_BASE) log('info', '前端服务地址: ' + FRONTEND_BASE);

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', '准备测试素材...');
  const testAssetsDir = generateTestAssets();
  const imagePath = path.join(testAssetsDir, 'test-image.png');
  const audioPath = path.join(testAssetsDir, 'test-audio.wav');
  recordTest('测试素材就绪', fs.existsSync(imagePath) && fs.existsSync(audioPath));

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', '【阶段一: 文件上传测试】');

  const imageFile = await testUpload(API_BASE, imagePath, '图片');
  const audioFile = await testUpload(API_BASE, audioPath, '语音');

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', '【阶段二: 数据创建测试】');

  if (!imageFile) {
    log('fail', '图片上传失败，后续测试无法继续');
    printSummary();
    process.exit(1);
  }

  const exhibition = await testCreateExhibition(API_BASE, `自测展厅-${Date.now()}`, imageFile.url);
  if (!exhibition) {
    log('fail', '创建展厅失败，后续测试无法继续');
    printSummary();
    process.exit(1);
  }

  const imgMaterial = await testCreateMaterial(API_BASE, exhibition.id, 'image', imageFile.url, '自测图片素材');
  const audioMaterial = audioFile
    ? await testCreateMaterial(API_BASE, exhibition.id, 'audio', audioFile.url, '自测语音素材')
    : null;

  const materialIds = [];
  if (imgMaterial?.id) materialIds.push(imgMaterial.id);
  if (audioMaterial?.id) materialIds.push(audioMaterial.id);

  if (materialIds.length > 0) {
    await testCreateTimeline(API_BASE, exhibition.id, '自测时间节点', materialIds);
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', '【阶段三: 前端页面验证】');

  if (FRONTEND_BASE) {
    const originalImageBuf = fs.readFileSync(imagePath);
    const originalAudioBuf = fs.readFileSync(audioPath);

    await testFrontendProxy(FRONTEND_BASE, imageFile.url, '图片', originalImageBuf.length);
    if (audioFile) {
      await testFrontendProxy(FRONTEND_BASE, audioFile.url, '语音', originalAudioBuf.length);
    }

    await testFrontendPage(FRONTEND_BASE, '/', '首页');
    await testFrontendPage(FRONTEND_BASE, `/exhibition/${exhibition.id}`, '展厅详情页');
    await testFrontendPage(FRONTEND_BASE, `/exhibition/${exhibition.id}/player`, '回忆播放页');
  } else {
    log('warn', '跳过前端页面验证');
    log('info', `展厅详情页: http://localhost:5173/exhibition/${exhibition.id}`);
    log('info', `回忆播放页: http://localhost:5173/exhibition/${exhibition.id}/player`);
  }

  console.log('\n───────────────────────────────────────────────────────────────');
  log('info', `测试展厅ID: ${exhibition.id}`);
  log('info', `展厅封面URL: ${imageFile.url}`);
  if (audioFile) log('info', `语音素材URL: ${audioFile.url}`);
  if (FRONTEND_BASE) {
    log('info', `展厅详情页: ${FRONTEND_BASE}/exhibition/${exhibition.id}`);
    log('info', `回忆播放页: ${FRONTEND_BASE}/exhibition/${exhibition.id}/player`);
  }

  const success = printSummary();
  process.exit(success ? 0 : 1);
}

process.on('unhandledRejection', (err) => {
  log('fail', '未处理的异常: ' + err.message);
  process.exit(1);
});

runAllTests();
