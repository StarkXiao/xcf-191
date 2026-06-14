import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:4500';
const testAssetsDir = path.join(__dirname, 'test-assets');

async function testUpload(filePath, fileType) {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append('files', blob, fileName);

  const res = await fetch(`${API_BASE}/api/files/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  console.log(`\n=== 上传 ${fileType} 测试 ===`);
  console.log('HTTP 状态码:', res.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));

  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    console.log('文件 URL:', file.url);
    console.log('文件类型:', file.type);
    console.log('文件大小:', file.size);

    const diskPath = path.join(__dirname, 'uploads', file.type, path.basename(file.url));
    console.log('磁盘路径:', diskPath);
    console.log('磁盘文件存在:', fs.existsSync(diskPath));
    if (fs.existsSync(diskPath)) {
      console.log('磁盘文件大小:', fs.statSync(diskPath).size);
      console.log('文件大小匹配:', fs.statSync(diskPath).size === file.size);
    }

    const accessUrl = `${API_BASE}${file.url}`;
    const accessRes = await fetch(accessUrl);
    console.log('访问 URL:', accessUrl);
    console.log('访问 HTTP 状态码:', accessRes.status);

    if (accessRes.status === 200) {
      const accessBuf = Buffer.from(await accessRes.arrayBuffer());
      console.log('访问返回大小:', accessBuf.length);
      console.log('内容一致:', accessBuf.length === file.size);
    }

    return file;
  }
  return null;
}

async function testCreateExhibition(title, coverImage) {
  const res = await fetch(`${API_BASE}/api/exhibitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description: '端到端测试展厅',
      coverImage,
      theme: 'warm'
    })
  });
  const data = await res.json();
  console.log(`\n=== 创建展厅测试 ===`);
  console.log('HTTP 状态码:', res.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  return data;
}

async function testCreateMaterial(exhibitionId, type, url, title) {
  const res = await fetch(`${API_BASE}/api/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exhibitionId,
      type,
      url,
      title
    })
  });
  const data = await res.json();
  console.log(`\n=== 创建素材测试 (${type}) ===`);
  console.log('HTTP 状态码:', res.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  return data;
}

async function testCreateTimeline(exhibitionId, title, materialIds) {
  const res = await fetch(`${API_BASE}/api/timelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exhibitionId,
      title,
      description: '测试时间节点',
      eventDate: '2024-01-01',
      materialIds
    })
  });
  const data = await res.json();
  console.log(`\n=== 创建时间节点测试 ===`);
  console.log('HTTP 状态码:', res.status);
  console.log('返回数据:', JSON.stringify(data, null, 2));
  return data;
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     星屑纪念馆 - 端到端上传功能测试       ║');
  console.log('╚══════════════════════════════════════════════╝');

  try {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    console.log('\n后端服务健康检查:', healthRes.status === 200 ? '✓ 正常' : '✗ 异常');

    const pathsRes = await fetch(`${API_BASE}/api/debug/paths`);
    const pathsData = await pathsRes.json();
    console.log('上传目录配置:', pathsData.uploadsDir);
    console.log('上传目录存在:', pathsData.uploadsExists ? '✓ 是' : '✗ 否');

    const imageFile = await testUpload(path.join(testAssetsDir, 'test-image.png'), '图片');
    const audioFile = await testUpload(path.join(testAssetsDir, 'test-audio.wav'), '音频');

    if (imageFile) {
      const exhibition = await testCreateExhibition(
        '端到端测试展厅',
        imageFile.url
      );

      if (exhibition.id) {
        const imgMaterial = await testCreateMaterial(
          exhibition.id,
          'image',
          imageFile.url,
          '测试图片素材'
        );

        let audioMaterial = null;
        if (audioFile) {
          audioMaterial = await testCreateMaterial(
            exhibition.id,
            'audio',
            audioFile.url,
            '测试音频素材'
          );
        }

        const materialIds = [];
        if (imgMaterial?.id) materialIds.push(imgMaterial.id);
        if (audioMaterial?.id) materialIds.push(audioMaterial.id);

        if (materialIds.length > 0) {
          await testCreateTimeline(
            exhibition.id,
            '测试时间节点',
            materialIds
          );
        }

        console.log('\n' + '═'.repeat(50));
        console.log('测试展厅 ID:', exhibition.id);
        console.log('展厅封面 URL:', imageFile.url);
        console.log('展厅详情页:', `http://localhost:5183/exhibition/${exhibition.id}`);
        console.log('回忆播放页:', `http://localhost:5183/exhibition/${exhibition.id}/player`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✓ 所有测试完成！');

  } catch (err) {
    console.error('\n✗ 测试失败:', err);
    process.exit(1);
  }
}

runAllTests();
