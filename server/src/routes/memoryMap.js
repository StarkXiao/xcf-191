import { v4 as uuidv4 } from 'uuid';
import { getCollection, saveCollection } from '../storage.js';

const calculateBounds = (locations) => {
  if (!locations || locations.length === 0) {
    return {
      minLat: 18,
      maxLat: 54,
      minLng: 73,
      maxLng: 135,
      centerLat: 36,
      centerLng: 104
    };
  }
  const lats = locations.map(l => l.lat);
  const lngs = locations.map(l => l.lng);
  return {
    minLat: Math.min(...lats) - 2,
    maxLat: Math.max(...lats) + 2,
    minLng: Math.min(...lngs) - 2,
    maxLng: Math.max(...lngs) + 2,
    centerLat: (Math.min(...lats) + Math.max(...lats)) / 2,
    centerLng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };
};

export default async function memoryMapRoutes(fastify) {
  fastify.get('/:exhibitionId', async (request, reply) => {
    const { exhibitionId } = request.params;
    const memoryMaps = getCollection('memoryMaps');
    let memoryMap = memoryMaps.find(m => m.exhibitionId === exhibitionId);

    if (!memoryMap) {
      memoryMap = {
        id: uuidv4(),
        exhibitionId,
        centerLat: 36,
        centerLng: 104,
        zoom: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memoryMaps.push(memoryMap);
      saveCollection('memoryMaps', memoryMaps);
    }

    return memoryMap;
  });

  fastify.put('/:exhibitionId', async (request, reply) => {
    const { exhibitionId } = request.params;
    const { centerLat, centerLng, zoom } = request.body;
    const memoryMaps = getCollection('memoryMaps');
    const index = memoryMaps.findIndex(m => m.exhibitionId === exhibitionId);

    if (index === -1) {
      const newMap = {
        id: uuidv4(),
        exhibitionId,
        centerLat: centerLat !== undefined ? centerLat : 36,
        centerLng: centerLng !== undefined ? centerLng : 104,
        zoom: zoom !== undefined ? zoom : 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memoryMaps.push(newMap);
      saveCollection('memoryMaps', memoryMaps);
      return newMap;
    }

    memoryMaps[index] = {
      ...memoryMaps[index],
      centerLat: centerLat !== undefined ? centerLat : memoryMaps[index].centerLat,
      centerLng: centerLng !== undefined ? centerLng : memoryMaps[index].centerLng,
      zoom: zoom !== undefined ? zoom : memoryMaps[index].zoom,
      updatedAt: new Date().toISOString()
    };
    saveCollection('memoryMaps', memoryMaps);
    return memoryMaps[index];
  });

  fastify.get('/:exhibitionId/markers', async (request, reply) => {
    const { exhibitionId } = request.params;
    const { keyword, startDate, endDate, materialType } = request.query;

    const timelines = getCollection('timelines').filter(t => t.exhibitionId === exhibitionId);
    const materials = getCollection('materials').filter(m => m.exhibitionId === exhibitionId);
    const materialMap = new Map(materials.map(m => [m.id, m]));

    let markers = timelines
      .filter(t => t.location && t.location.lat !== undefined && t.location.lng !== undefined)
      .map(timeline => {
        const timelineMaterials = (timeline.materialIds || [])
          .map(id => materialMap.get(id))
          .filter(Boolean);

        return {
          id: timeline.id,
          title: timeline.title,
          description: timeline.description,
          eventDate: timeline.eventDate,
          location: timeline.location,
          materialIds: timeline.materialIds || [],
          materials: timelineMaterials,
          materialStats: {
            total: timelineMaterials.length,
            image: timelineMaterials.filter(m => m.type === 'image').length,
            audio: timelineMaterials.filter(m => m.type === 'audio').length,
            video: timelineMaterials.filter(m => m.type === 'video').length,
            text: timelineMaterials.filter(m => m.type === 'text').length
          },
          createdAt: timeline.createdAt
        };
      });

    if (keyword) {
      const kw = keyword.toLowerCase();
      markers = markers.filter(m =>
        m.title.toLowerCase().includes(kw) ||
        m.description.toLowerCase().includes(kw) ||
        (m.location.name && m.location.name.toLowerCase().includes(kw)) ||
        (m.location.address && m.location.address.toLowerCase().includes(kw))
      );
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      markers = markers.filter(m => new Date(m.eventDate).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      markers = markers.filter(m => new Date(m.eventDate).getTime() <= end);
    }

    if (materialType) {
      markers = markers.filter(m => m.materialStats[materialType] > 0);
    }

    markers.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    const validLocations = markers.map(m => m.location);
    const bounds = calculateBounds(validLocations);

    return {
      markers,
      bounds,
      total: markers.length,
      stats: {
        locations: new Set(markers.map(m => `${m.location.lat},${m.location.lng}`)).size,
        materialsTotal: markers.reduce((sum, m) => sum + m.materialStats.total, 0),
        dateRange: markers.length > 0 ? {
          start: markers[0].eventDate,
          end: markers[markers.length - 1].eventDate
        } : null
      }
    };
  });

  fastify.get('/:exhibitionId/search', async (request, reply) => {
    const { exhibitionId } = request.params;
    const {
      keyword,
      startDate,
      endDate,
      materialType,
      locationName,
      latMin, latMax, lngMin, lngMax,
      sortBy = 'date',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20
    } = request.query;

    const timelines = getCollection('timelines').filter(t => t.exhibitionId === exhibitionId);
    const materials = getCollection('materials').filter(m => m.exhibitionId === exhibitionId);
    const materialMap = new Map(materials.map(m => [m.id, m]));

    let results = timelines
      .filter(t => t.location && t.location.lat !== undefined && t.location.lng !== undefined)
      .map(timeline => {
        const timelineMaterials = (timeline.materialIds || [])
          .map(id => materialMap.get(id))
          .filter(Boolean);

        return {
          id: timeline.id,
          title: timeline.title,
          description: timeline.description,
          eventDate: timeline.eventDate,
          location: timeline.location,
          materialIds: timeline.materialIds || [],
          materials: timelineMaterials,
          materialStats: {
            total: timelineMaterials.length,
            image: timelineMaterials.filter(m => m.type === 'image').length,
            audio: timelineMaterials.filter(m => m.type === 'audio').length,
            video: timelineMaterials.filter(m => m.type === 'video').length,
            text: timelineMaterials.filter(m => m.type === 'text').length
          },
          createdAt: timeline.createdAt
        };
      });

    if (keyword) {
      const kw = keyword.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw)
      );
    }

    if (locationName) {
      const ln = locationName.toLowerCase();
      results = results.filter(r =>
        (r.location.name && r.location.name.toLowerCase().includes(ln)) ||
        (r.location.address && r.location.address.toLowerCase().includes(ln))
      );
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      results = results.filter(r => new Date(r.eventDate).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      results = results.filter(r => new Date(r.eventDate).getTime() <= end);
    }

    if (materialType) {
      results = results.filter(r => r.materialStats[materialType] > 0);
    }

    if (latMin !== undefined) results = results.filter(r => r.location.lat >= parseFloat(latMin));
    if (latMax !== undefined) results = results.filter(r => r.location.lat <= parseFloat(latMax));
    if (lngMin !== undefined) results = results.filter(r => r.location.lng >= parseFloat(lngMin));
    if (lngMax !== undefined) results = results.filter(r => r.location.lng <= parseFloat(lngMax));

    if (sortBy === 'date') {
      results.sort((a, b) => {
        const diff = new Date(a.eventDate) - new Date(b.eventDate);
        return sortOrder === 'desc' ? -diff : diff;
      });
    } else if (sortBy === 'materials') {
      results.sort((a, b) => {
        const diff = a.materialStats.total - b.materialStats.total;
        return sortOrder === 'desc' ? -diff : diff;
      });
    } else if (sortBy === 'created') {
      results.sort((a, b) => {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return sortOrder === 'desc' ? -diff : diff;
      });
    }

    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(parseInt(page), totalPages || 1));
    const startIdx = (currentPage - 1) * pageSize;
    const pagedResults = results.slice(startIdx, startIdx + parseInt(pageSize));

    return {
      results: pagedResults,
      pagination: {
        page: currentPage,
        pageSize: parseInt(pageSize),
        total,
        totalPages
      },
      aggregations: {
        byYear: results.reduce((acc, r) => {
          const year = new Date(r.eventDate).getFullYear();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {}),
        byMaterialType: {
          image: results.filter(r => r.materialStats.image > 0).length,
          audio: results.filter(r => r.materialStats.audio > 0).length,
          video: results.filter(r => r.materialStats.video > 0).length,
          text: results.filter(r => r.materialStats.text > 0).length
        },
        locations: {
          total: new Set(results.map(r => `${r.location.lat},${r.location.lng}`)).size,
          byCity: results.reduce((acc, r) => {
            const city = r.location.city || r.location.name || '未知地点';
            acc[city] = (acc[city] || 0) + 1;
            return acc;
          }, {})
        }
      }
    };
  });

  fastify.get('/:exhibitionId/aggregate', async (request, reply) => {
    const { exhibitionId } = request.params;
    const timelines = getCollection('timelines').filter(t => t.exhibitionId === exhibitionId);
    const materials = getCollection('materials').filter(m => m.exhibitionId === exhibitionId);
    const materialMap = new Map(materials.map(m => [m.id, m]));

    const withLocation = timelines.filter(t => t.location && t.location.lat !== undefined);
    const withoutLocation = timelines.filter(t => !t.location || t.location.lat === undefined);

    const locationGroups = {};
    withLocation.forEach(timeline => {
      const key = `${timeline.location.lat.toFixed(4)},${timeline.location.lng.toFixed(4)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          location: timeline.location,
          timelines: [],
          materials: []
        };
      }
      locationGroups[key].timelines.push({
        id: timeline.id,
        title: timeline.title,
        eventDate: timeline.eventDate,
        description: timeline.description
      });
      (timeline.materialIds || []).forEach(mid => {
        const mat = materialMap.get(mid);
        if (mat) locationGroups[key].materials.push(mat);
      });
    });

    const unboundMaterials = materials.filter(m =>
      !timelines.some(t => (t.materialIds || []).includes(m.id))
    );

    return {
      overview: {
        totalTimelines: timelines.length,
        withLocation: withLocation.length,
        withoutLocation: withoutLocation.length,
        totalLocations: Object.keys(locationGroups).length,
        totalMaterials: materials.length
      },
      locationGroups: Object.values(locationGroups).map(g => ({
        ...g,
        timelineCount: g.timelines.length,
        materialCount: g.materials.length,
        dateRange: g.timelines.length > 0 ? {
          start: g.timelines[g.timelines.length - 1].eventDate,
          end: g.timelines[0].eventDate
        } : null
      })).sort((a, b) => b.timelineCount - a.timelineCount),
      unboundMaterials: unboundMaterials.map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        url: m.url
      })),
      orphanTimelines: withoutLocation.map(t => ({
        id: t.id,
        title: t.title,
        eventDate: t.eventDate
      }))
    };
  });
}
