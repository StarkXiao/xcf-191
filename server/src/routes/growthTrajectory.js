import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const STAGE_RANGES = [
  { key: 'infancy', name: '婴幼儿期', minAge: 0, maxAge: 3, icon: '👶', color: '#FFE4E1', description: '从出生到懵懂的最初时光' },
  { key: 'childhood', name: '童年期', minAge: 3, maxAge: 12, icon: '🎈', color: '#E6F3FF', description: '充满好奇与幻想的金色年华' },
  { key: 'youth', name: '少年期', minAge: 12, maxAge: 18, icon: '🌟', color: '#FFF8DC', description: '青春萌芽的成长岁月' },
  { key: 'young_adult', name: '青年期', minAge: 18, maxAge: 30, icon: '🚀', color: '#E8FFE8', description: '追逐梦想的奋斗时光' },
  { key: 'adulthood', name: '壮年期', minAge: 30, maxAge: 50, icon: '🏠', color: '#F0E6FF', description: '家庭事业双丰收的岁月' },
  { key: 'maturity', name: '成熟期', minAge: 50, maxAge: 70, icon: '🍂', color: '#FFEFD5', description: '沉淀智慧的从容年华' },
  { key: 'elderly', name: '晚年期', minAge: 70, maxAge: 150, icon: '🕊️', color: '#F5F5F5', description: '安详温暖的夕阳时光' }
];

const calculateAge = (birthDate, eventDate) => {
  const birth = new Date(birthDate);
  const event = new Date(eventDate);
  let age = event.getFullYear() - birth.getFullYear();
  const monthDiff = event.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && event.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

const getStage = (age) => {
  return STAGE_RANGES.find(s => age >= s.minAge && age < s.maxAge) || STAGE_RANGES[STAGE_RANGES.length - 1];
};

const generateStages = (timelines, birthDate) => {
  const stageMap = new Map();
  STAGE_RANGES.forEach(s => {
    stageMap.set(s.key, {
      ...s,
      nodes: [],
      materialCount: 0,
      startDate: null,
      endDate: null
    });
  });

  const sortedTimelines = [...timelines].sort(
    (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
  );

  sortedTimelines.forEach(node => {
    const age = calculateAge(birthDate, node.eventDate);
    const stage = getStage(age);
    const stageData = stageMap.get(stage.key);
    if (stageData) {
      stageData.nodes.push({
        ...node,
        age,
        displayDate: formatDate(node.eventDate)
      });
      stageData.materialCount += (node.materialIds?.length || 0);
      if (!stageData.startDate || new Date(node.eventDate) < new Date(stageData.startDate)) {
        stageData.startDate = node.eventDate;
      }
      if (!stageData.endDate || new Date(node.eventDate) > new Date(stageData.endDate)) {
        stageData.endDate = node.eventDate;
      }
    }
  });

  return Array.from(stageMap.values())
    .filter(s => s.nodes.length > 0)
    .map(s => ({
      ...s,
      nodeCount: s.nodes.length,
      coverImage: s.nodes.find(n => n.coverImage)?.coverImage ||
        s.nodes.find(n => {
          const matIds = n.materialIds || [];
          return matIds.length > 0;
        })?.nodes?.[0]?.url || null,
      dateRange: s.startDate && s.endDate ? `${formatDate(s.startDate)} - ${formatDate(s.endDate)}` : null,
      summary: generateStageSummary(s)
    }));
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

const generateStageSummary = (stage) => {
  const firstAge = stage.nodes[0]?.age ?? 0;
  const lastAge = stage.nodes[stage.nodes.length - 1]?.age ?? 0;
  const yearSpan = lastAge - firstAge;
  const totalMaterials = stage.nodes.reduce((sum, n) => sum + (n.materialIds?.length || 0), 0);

  if (yearSpan === 0) {
    return `${stage.name}记录了${stage.nodeCount}个珍贵瞬间，共${totalMaterials}份回忆素材`;
  }
  return `${stage.name}跨越${yearSpan + 1}年，从${firstAge}岁到${lastAge}岁，共${stage.nodeCount}个珍贵瞬间`;
};

const generateFlattenedPlayList = (stages) => {
  const playlist = [];
  stages.forEach((stage, stageIdx) => {
    playlist.push({
      type: 'chapter_cover',
      stageIdx,
      stageKey: stage.key,
      stageName: stage.name,
      stageIcon: stage.icon,
      stageColor: stage.color,
      stageDescription: stage.description,
      nodeCount: stage.nodeCount,
      materialCount: stage.materialCount,
      dateRange: stage.dateRange,
      summary: stage.summary,
      coverImage: stage.coverImage
    });

    stage.nodes.forEach((node, nodeIdx) => {
      playlist.push({
        type: 'timeline_node',
        stageIdx,
        nodeIdx,
        stageKey: stage.key,
        stageName: stage.name,
        nodeId: node.id,
        nodeTitle: node.title,
        nodeDescription: node.description,
        eventDate: node.eventDate,
        displayDate: node.displayDate,
        age: node.age,
        location: node.location,
        materialIds: node.materialIds || []
      });
    });

    playlist.push({
      type: 'material_review',
      stageIdx,
      stageKey: stage.key,
      stageName: stage.name,
      stageIcon: stage.icon,
      materialCount: stage.materialCount,
      nodes: stage.nodes
    });
  });

  return playlist;
};

export default async function growthTrajectoryRoutes(fastify) {
  fastify.get('/stage-ranges', async () => {
    return STAGE_RANGES;
  });

  fastify.get('/:exhibitionId/stages', async (request, reply) => {
    const { exhibitionId } = request.params;
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);

    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const timelines = getCollection('timelines').filter(t => t.exhibitionId === exhibitionId);
    const materials = getCollection('materials').filter(m => m.exhibitionId === exhibitionId);
    const materialsMap = new Map(materials.map(m => [m.id, m]));

    const timelinesWithImages = timelines.map(t => {
      const coverImage = (t.materialIds || [])
        .map(id => materialsMap.get(id))
        .find(m => m && m.type === 'image')?.url || null;
      return { ...t, coverImage };
    });

    const birthDate = exhibition.birthDate || exhibition.startDate || timelines[0]?.eventDate;

    if (!birthDate) {
      reply.code(400);
      return { error: '缺少出生日期或最早事件日期，无法生成阶段' };
    }

    const stages = generateStages(timelinesWithImages, birthDate);

    return {
      exhibition: {
        id: exhibition.id,
        title: exhibition.title,
        theme: exhibition.theme,
        coverImage: exhibition.coverImage,
        birthDate,
        personName: exhibition.personName
      },
      stages,
      totalNodes: stages.reduce((sum, s) => sum + s.nodeCount, 0),
      totalMaterials: stages.reduce((sum, s) => sum + s.materialCount, 0),
      playlist: generateFlattenedPlayList(stages)
    };
  });

  fastify.get('/:exhibitionId/playlist', async (request, reply) => {
    const { exhibitionId } = request.params;
    const exhibitions = getCollection('exhibitions');
    const exhibition = exhibitions.find(e => e.id === exhibitionId);

    if (!exhibition) {
      reply.code(404);
      return { error: '展厅不存在' };
    }

    const timelines = getCollection('timelines').filter(t => t.exhibitionId === exhibitionId);
    const materials = getCollection('materials').filter(m => m.exhibitionId === exhibitionId);
    const materialsMap = new Map(materials.map(m => [m.id, m]));

    const timelinesWithImages = timelines.map(t => {
      const coverImage = (t.materialIds || [])
        .map(id => materialsMap.get(id))
        .find(m => m && m.type === 'image')?.url || null;
      return { ...t, coverImage };
    });

    const birthDate = exhibition.birthDate || exhibition.startDate || timelines[0]?.eventDate;

    if (!birthDate) {
      reply.code(400);
      return { error: '缺少出生日期或最早事件日期，无法生成播放列表' };
    }

    const stages = generateStages(timelinesWithImages, birthDate);
    const playlist = generateFlattenedPlayList(stages);

    const materialsById = {};
    materials.forEach(m => { materialsById[m.id] = m; });

    return {
      exhibition: {
        id: exhibition.id,
        title: exhibition.title,
        theme: exhibition.theme,
        coverImage: exhibition.coverImage,
        personName: exhibition.personName
      },
      stages,
      playlist,
      materials: materialsById,
      settings: {
        chapterDuration: 6000,
        nodeDuration: 10000,
        reviewDuration: 8000,
        transitionEffect: 'fade'
      }
    };
  });

  fastify.post('/:exhibitionId/cover', async (request, reply) => {
    const { exhibitionId } = request.params;
    const { stageKey, coverImage } = request.body;

    const covers = getCollection('growthTrajectoryCovers');
    const existing = covers.find(c => c.exhibitionId === exhibitionId && c.stageKey === stageKey);

    if (existing) {
      existing.coverImage = coverImage;
      existing.updatedAt = new Date().toISOString();
    } else {
      covers.push({
        id: uuidv4(),
        exhibitionId,
        stageKey,
        coverImage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    saveCollection('growthTrajectoryCovers', covers);
    return { success: true, coverImage };
  });

  fastify.get('/:exhibitionId/covers', async (request) => {
    const { exhibitionId } = request.params;
    const covers = getCollection('growthTrajectoryCovers').filter(c => c.exhibitionId === exhibitionId);
    return covers.reduce((acc, c) => {
      acc[c.stageKey] = c.coverImage;
      return acc;
    }, {});
  });
}
