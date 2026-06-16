import { getCollection } from './src/storage.js';

const timelines = getCollection('timelines');
const materials = getCollection('materials');

console.log('时间节点列表:');
timelines.forEach(t => {
  console.log(`  - ${t.title} (${t.id}): ${t.materialIds?.length || 0} 个素材`);
  if (t.materialIds?.length > 0) {
    console.log(`    素材IDs: ${t.materialIds.join(', ')}`);
  }
});

console.log('\n素材列表:');
materials.forEach(m => {
  console.log(`  - ${m.title} (${m.id}) [${m.type}]`);
});

if (timelines.length > 0 && timelines[0].materialIds?.length > 0) {
  const nodeId = timelines[0].id;
  console.log(`\n--- 测试时间节点筛选 (节点: ${timelines[0].title}) ---`);
  
  const node = timelines.find(t => t.id === nodeId);
  const filtered = materials.filter(m => node.materialIds.includes(m.id));
  
  console.log('筛选结果数量:', filtered.length);
  filtered.forEach(m => console.log('  -', m.title, m.type));
}

console.log('\n=== 时间节点筛选测试完成 ===');
