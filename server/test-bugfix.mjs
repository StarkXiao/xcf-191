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

  if (exhibitionId) {
    materials = materials.filter(m => m.exhibitionId === exhibitionId);
  }

  if (type) {
    let typeList;
    if (Array.isArray(type)) {
      typeList = type;
    } else if (typeof type === 'string') {
      typeList = type.split(',').map(t => t.trim()).filter(Boolean);
    } else {
      typeList = [type];
    }
    materials = materials.filter(m => typeList.includes(m.type));
  }

  if (timelineNodeId) {
    const node = timelines.find(t => t.id === timelineNodeId);
    if (node && node.materialIds) {
      materials = materials.filter(m => node.materialIds.includes(m.id));
    } else {
      materials = [];
    }
  }

  if (startDate) {
    const start = new Date(startDate).getTime();
    materials = materials.filter(m => new Date(m.createdAt).getTime() >= start);
  }

  if (endDate) {
    const endDateObj = new Date(endDate);
    const end = new Date(
      endDateObj.getFullYear(),
      endDateObj.getMonth(),
      endDateObj.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
    materials = materials.filter(m => new Date(m.createdAt).getTime() <= end);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    materials = materials.filter(m =>
      (m.title && m.title.toLowerCase().includes(kw)) ||
      (m.description && m.description.toLowerCase().includes(kw))
    );
  }

  return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

console.log('=== 测试 Bug 修复 ===\n');

const materials = getCollection('materials');
console.log('总素材数:', materials.length);
materials.forEach(m => {
  console.log(`  - ${m.title} [${m.type}] 创建于: ${m.createdAt}`);
});

console.log('\n--- 测试 1: 逗号分隔的类型多选 (image,text) ---');
const result1 = filterMaterials({ type: 'image,text' });
console.log('结果数量:', result1.length);
result1.forEach(m => console.log('  -', m.title, m.type));

console.log('\n--- 测试 2: 数组形式的类型多选 (兼容) ---');
const result2 = filterMaterials({ type: ['image', 'audio'] });
console.log('结果数量:', result2.length);
result2.forEach(m => console.log('  -', m.title, m.type));

console.log('\n--- 测试 3: 单个类型 ---');
const result3 = filterMaterials({ type: 'video' });
console.log('结果数量:', result3.length);

console.log('\n--- 测试 4: 结束日期包含当天整日 ---');
const testDate = '2026-06-14';
const result4 = filterMaterials({ endDate: testDate });
console.log(`结束日期: ${testDate}`);
const endDateObj = new Date(testDate);
const end = new Date(
  endDateObj.getFullYear(),
  endDateObj.getMonth(),
  endDateObj.getDate(),
  23,
  59,
  59,
  999
);
console.log(`实际截止时间戳: ${end.toISOString()}`);
console.log('结果数量:', result4.length);
result4.forEach(m => console.log('  -', m.title, m.createdAt));

console.log('\n=== Bug 修复测试完成 ===');
