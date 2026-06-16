import { getCollection } from './src/storage.js';

function filterMaterials(filters = {}) {
  const {
    exhibitionId,
    type,
    timelineNodeId,
    startDate,
    endDate,
    keyword
  } = filters;

  let materials = getCollection('materials');
  const timelines = getCollection('timelines');

  console.log('总素材数:', materials.length);
  console.log('时间节点数:', timelines.length);

  if (exhibitionId) {
    materials = materials.filter(m => m.exhibitionId === exhibitionId);
    console.log('按展览筛选后:', materials.length);
  }

  if (type) {
    const typeList = Array.isArray(type) ? type : [type];
    materials = materials.filter(m => typeList.includes(m.type));
    console.log('按类型筛选后:', materials.length);
  }

  if (timelineNodeId) {
    const node = timelines.find(t => t.id === timelineNodeId);
    if (node && node.materialIds) {
      materials = materials.filter(m => node.materialIds.includes(m.id));
      console.log('按时间节点筛选后:', materials.length);
    } else {
      materials = [];
    }
  }

  if (startDate) {
    const start = new Date(startDate).getTime();
    materials = materials.filter(m => new Date(m.createdAt).getTime() >= start);
    console.log('按开始日期筛选后:', materials.length);
  }

  if (endDate) {
    const end = new Date(endDate).getTime();
    materials = materials.filter(m => new Date(m.createdAt).getTime() <= end);
    console.log('按结束日期筛选后:', materials.length);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    materials = materials.filter(m =>
      (m.title && m.title.toLowerCase().includes(kw)) ||
      (m.description && m.description.toLowerCase().includes(kw))
    );
    console.log('按关键词筛选后:', materials.length);
  }

  return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

console.log('=== 测试素材筛选功能 ===\n');

const firstExhibition = getCollection('exhibitions')[0];
if (firstExhibition) {
  console.log('第一个展览 ID:', firstExhibition.id);
  console.log('第一个展览标题:', firstExhibition.title);
}

console.log('\n--- 测试 1: 按类型筛选 (image) ---');
const result1 = filterMaterials({ type: 'image' });
console.log('结果数量:', result1.length);
console.log('第一个结果:', result1[0]?.title, result1[0]?.type);

console.log('\n--- 测试 2: 按类型多选 (image, text) ---');
const result2 = filterMaterials({ type: ['image', 'text'] });
console.log('结果数量:', result2.length);

console.log('\n--- 测试 3: 按关键词筛选 ---');
const result3 = filterMaterials({ keyword: '童年' });
console.log('结果数量:', result3.length);
result3.forEach(m => console.log('  -', m.title));

console.log('\n--- 测试 4: 组合筛选 (类型 + 关键词) ---');
const result4 = filterMaterials({ type: 'text', keyword: '回忆' });
console.log('结果数量:', result4.length);
result4.forEach(m => console.log('  -', m.title));

console.log('\n--- 测试 5: 按日期范围筛选 ---');
const result5 = filterMaterials({
  startDate: '2026-06-01',
  endDate: '2026-06-30'
});
console.log('结果数量:', result5.length);

console.log('\n=== 筛选功能测试完成 ===');
