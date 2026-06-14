import React, { useState, useEffect, useMemo } from 'react';
import './MemoryMap.scss';

function MemoryMap({ exhibitionId, memoryMapApi, timelineApi, materialApi }) {
  const [loading, setLoading] = useState(true);
  const [mapConfig, setMapConfig] = useState(null);
  const [markersData, setMarkersData] = useState(null);
  const [aggregate, setAggregate] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    startDate: '',
    endDate: '',
    materialType: ''
  });
  const [viewMode, setViewMode] = useState('map');

  useEffect(() => {
    loadData();
  }, [exhibitionId]);

  useEffect(() => {
    if (searchParams.keyword || searchParams.startDate || searchParams.endDate || searchParams.materialType) {
      const timer = setTimeout(() => {
        loadMarkers();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      loadMarkers();
    }
  }, [searchParams, exhibitionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMapConfig(),
        loadMarkers(),
        loadAggregate()
      ]);
    } catch (err) {
      console.error('加载回忆地图数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMapConfig = async () => {
    try {
      const config = await memoryMapApi.get(exhibitionId);
      setMapConfig(config);
    } catch (err) {
      console.error('加载地图配置失败:', err);
    }
  };

  const loadMarkers = async () => {
    try {
      const filters = {};
      if (searchParams.keyword) filters.keyword = searchParams.keyword;
      if (searchParams.startDate) filters.startDate = searchParams.startDate;
      if (searchParams.endDate) filters.endDate = searchParams.endDate;
      if (searchParams.materialType) filters.materialType = searchParams.materialType;
      const data = await memoryMapApi.getMarkers(exhibitionId, filters);
      setMarkersData(data);
    } catch (err) {
      console.error('加载标记点失败:', err);
    }
  };

  const loadAggregate = async () => {
    try {
      const data = await memoryMapApi.aggregate(exhibitionId);
      setAggregate(data);
    } catch (err) {
      console.error('加载聚合数据失败:', err);
    }
  };

  const latLngToXY = (lat, lng, bounds, width, height) => {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const padding = 50;
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - padding * 2);
    const y = height - padding - ((lat - minLat) / (maxLat - minLat)) * (height - padding * 2);
    return { x, y };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getMarkerColor = (materialStats) => {
    if (materialStats.image > 0) return '#ffd700';
    if (materialStats.video > 0) return '#ff6b6b';
    if (materialStats.audio > 0) return '#4ecdc4';
    if (materialStats.text > 0) return '#a78bfa';
    return '#ffd700';
  };

  const markers = markersData?.markers || [];
  const bounds = markersData?.bounds || { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135, centerLat: 36, centerLng: 104 };
  const stats = markersData?.stats || { locations: 0, materialsTotal: 0, dateRange: null };
  const mapWidth = 900;
  const mapHeight = 600;

  const positionedMarkers = useMemo(() => {
    return markers.map(m => ({
      ...m,
      ...latLngToXY(m.location.lat, m.location.lng, bounds, mapWidth, mapHeight)
    }));
  }, [markers, bounds]);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedMarker(null);
  };

  const clearFilters = () => {
    setSearchParams({ keyword: '', startDate: '', endDate: '', materialType: '' });
  };

  const hasFilters = searchParams.keyword || searchParams.startDate || searchParams.endDate || searchParams.materialType;

  if (loading) {
    return (
      <div className="memory-map loading">
        <div className="loading-spinner"></div>
        <p>加载回忆地图中...</p>
      </div>
    );
  }

  return (
    <div className="memory-map">
      <div className="map-header">
        <div className="map-title-section">
          <h2 className="map-title">🗺️ 回忆地图</h2>
          <p className="map-subtitle">在地图上回溯每一段珍贵记忆</p>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            地图视图
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            列表视图
          </button>
          <button
            className={`view-btn ${viewMode === 'aggregate' ? 'active' : ''}`}
            onClick={() => setViewMode('aggregate')}
          >
            聚合视图
          </button>
        </div>
      </div>

      <div className="map-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.locations}</span>
          <span className="stat-label">记忆地点</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{markers.length}</span>
          <span className="stat-label">时间节点</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.materialsTotal}</span>
          <span className="stat-label">关联素材</span>
        </div>
        {stats.dateRange && (
          <div className="stat-card">
            <span className="stat-value-small">
              {formatDate(stats.dateRange.start)} - {formatDate(stats.dateRange.end)}
            </span>
            <span className="stat-label">时间跨度</span>
          </div>
        )}
      </div>

      <div className="search-bar">
        <div className="search-inputs">
          <div className="search-item">
            <input
              type="text"
              placeholder="搜索标题、地点、描述..."
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              className="search-input"
            />
          </div>
          <div className="search-item">
            <input
              type="date"
              value={searchParams.startDate}
              onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })}
              className="search-input date-input"
            />
            <span className="search-label">起</span>
          </div>
          <div className="search-item">
            <input
              type="date"
              value={searchParams.endDate}
              onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })}
              className="search-input date-input"
            />
            <span className="search-label">止</span>
          </div>
          <div className="search-item">
            <select
              value={searchParams.materialType}
              onChange={(e) => setSearchParams({ ...searchParams, materialType: e.target.value })}
              className="search-input select-input"
            >
              <option value="">全部素材</option>
              <option value="image">含图片</option>
              <option value="audio">含语音</option>
              <option value="video">含视频</option>
              <option value="text">含文字</option>
            </select>
          </div>
          {hasFilters && (
            <button className="clear-btn" onClick={clearFilters}>清除筛选</button>
          )}
        </div>
      </div>

      {viewMode === 'map' && (
        <div className="map-container">
          {markers.length === 0 ? (
            <div className="empty-map">
              <div className="empty-icon">🗺️</div>
              <h3>地图上还没有记忆标记</h3>
              <p>在时间线编辑器中为时间节点绑定地点信息，它们就会出现在这里</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="map-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="mapBg" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="rgba(255, 215, 0, 0.03)" />
                  <stop offset="100%" stopColor="rgba(0, 0, 0, 0.2)" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="gridLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 0.05)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="url(#mapBg)" rx="16" />

              {[0, 1, 2, 3, 4, 5].map(i => (
                <line
                  key={`h-${i}`}
                  x1="50" y1={50 + (i * (mapHeight - 100) / 5)}
                  x2={mapWidth - 50} y2={50 + (i * (mapHeight - 100) / 5)}
                  stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray="4 8"
                />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <line
                  key={`v-${i}`}
                  x1={50 + (i * (mapWidth - 100) / 7)} y1="50"
                  x2={50 + (i * (mapWidth - 100) / 7)} y2={mapHeight - 50}
                  stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray="4 8"
                />
              ))}

              <text x="60" y="65" fill="rgba(255,255,255,0.3)" fontSize="11">
                {`${bounds.maxLat.toFixed(1)}°N`}
              </text>
              <text x="60" y={mapHeight - 55} fill="rgba(255,255,255,0.3)" fontSize="11">
                {`${bounds.minLat.toFixed(1)}°N`}
              </text>
              <text x="60" y={mapHeight / 2} fill="rgba(255,255,255,0.3)" fontSize="11">
                {`${bounds.minLng.toFixed(1)}°E`}
              </text>
              <text x={mapWidth - 100} y={mapHeight / 2} fill="rgba(255,255,255,0.3)" fontSize="11">
                {`${bounds.maxLng.toFixed(1)}°E`}
              </text>

              {positionedMarkers.length > 1 && (
                <g>
                  {positionedMarkers.slice(0, -1).map((m, i) => {
                    const next = positionedMarkers[i + 1];
                    return (
                      <line
                        key={`path-${i}`}
                        x1={m.x} y1={m.y}
                        x2={next.x} y2={next.y}
                        stroke="rgba(255, 215, 0, 0.3)"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                      />
                    );
                  })}
                </g>
              )}

              {positionedMarkers.map((marker, i) => {
                const color = getMarkerColor(marker.materialStats);
                const isSelected = selectedMarker?.id === marker.id;
                const size = Math.min(12 + marker.materialStats.total * 1.5, 24);
                return (
                  <g
                    key={marker.id}
                    className={`map-marker ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleMarkerClick(marker)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={size + 8}
                      fill={color}
                      opacity="0.15"
                    />
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={size}
                      fill={color}
                      stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                      strokeWidth={isSelected ? 3 : 2}
                      filter="url(#glow)"
                    />
                    <text
                      x={marker.x}
                      y={marker.y + 4}
                      textAnchor="middle"
                      fill="#1a1a2e"
                      fontSize={size > 16 ? '12' : '10'}
                      fontWeight="bold"
                    >
                      {i + 1}
                    </text>
                    <text
                      x={marker.x + size + 6}
                      y={marker.y + 5}
                      fill="rgba(255,255,255,0.8)"
                      fontSize="12"
                    >
                      {marker.location.name || marker.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          <div className="map-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ffd700' }}></span>含图片</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ff6b6b' }}></span>含视频</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#4ecdc4' }}></span>含语音</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#a78bfa' }}></span>仅文字</span>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="list-container">
          {markers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>暂无符合条件的记忆节点</p>
            </div>
          ) : (
            <div className="marker-list">
              {positionedMarkers.map((marker, i) => (
                <div
                  key={marker.id}
                  className="marker-card"
                  onClick={() => handleMarkerClick(marker)}
                >
                  <div className="marker-index" style={{ background: getMarkerColor(marker.materialStats) }}>
                    {i + 1}
                  </div>
                  <div className="marker-info">
                    <div className="marker-header">
                      <h4 className="marker-title">{marker.title}</h4>
                      <span className="marker-date">{formatDate(marker.eventDate)}</span>
                    </div>
                    {marker.location && (
                      <div className="marker-location">
                        📍 {marker.location.name || ''} {marker.location.city ? `(${marker.location.city})` : ''}
                        <span className="marker-coords">
                          [{marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}]
                        </span>
                      </div>
                    )}
                    {marker.description && (
                      <p className="marker-desc">{marker.description}</p>
                    )}
                    <div className="marker-material-tags">
                      {marker.materialStats.image > 0 && <span className="tag image">🖼️ 图片 {marker.materialStats.image}</span>}
                      {marker.materialStats.video > 0 && <span className="tag video">🎬 视频 {marker.materialStats.video}</span>}
                      {marker.materialStats.audio > 0 && <span className="tag audio">🎵 语音 {marker.materialStats.audio}</span>}
                      {marker.materialStats.text > 0 && <span className="tag text">✎ 文字 {marker.materialStats.text}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'aggregate' && aggregate && (
        <div className="aggregate-container">
          <div className="agg-overview">
            <h3 className="agg-title">📊 数据总览</h3>
            <div className="agg-stats">
              <div className="agg-stat">
                <span className="agg-num">{aggregate.overview.totalTimelines}</span>
                <span className="agg-label">总时间节点</span>
              </div>
              <div className="agg-stat good">
                <span className="agg-num">{aggregate.overview.withLocation}</span>
                <span className="agg-label">已绑定地点</span>
              </div>
              <div className="agg-stat warn">
                <span className="agg-num">{aggregate.overview.withoutLocation}</span>
                <span className="agg-label">未绑定地点</span>
              </div>
              <div className="agg-stat">
                <span className="agg-num">{aggregate.overview.totalLocations}</span>
                <span className="agg-label">不同地点</span>
              </div>
              <div className="agg-stat">
                <span className="agg-num">{aggregate.overview.totalMaterials}</span>
                <span className="agg-label">素材总数</span>
              </div>
            </div>
          </div>

          <div className="agg-sections">
            {aggregate.locationGroups.length > 0 && (
              <div className="agg-section">
                <h4 className="agg-section-title">🏙️ 按地点聚合</h4>
                <div className="location-groups">
                  {aggregate.locationGroups.map((group, i) => (
                    <div key={i} className="location-group-card">
                      <div className="group-header">
                        <span className="group-name">{group.location.name || `${group.location.lat.toFixed(3)}, ${group.location.lng.toFixed(3)}`}</span>
                        <span className="group-count">{group.timelineCount} 个回忆</span>
                      </div>
                      {group.location.city && <div className="group-city">{group.location.city}</div>}
                      {group.dateRange && (
                        <div className="group-dates">
                          {formatDate(group.dateRange.start)} ~ {formatDate(group.dateRange.end)}
                        </div>
                      )}
                      <div className="group-timelines">
                        {group.timelines.slice(0, 3).map(t => (
                          <div key={t.id} className="group-timeline-item">
                            <span className="gt-date">{formatDate(t.eventDate)}</span>
                            <span className="gt-title">{t.title}</span>
                          </div>
                        ))}
                        {group.timelines.length > 3 && (
                          <div className="group-more">还有 {group.timelines.length - 3} 个...</div>
                        )}
                      </div>
                      <div className="group-mat-count">{group.materialCount} 个素材</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aggregate.orphanTimelines.length > 0 && (
              <div className="agg-section warn-section">
                <h4 className="agg-section-title">⚠️ 未绑定地点的节点</h4>
                <div className="orphan-list">
                  {aggregate.orphanTimelines.map(t => (
                    <div key={t.id} className="orphan-item">
                      <span className="orphan-date">{formatDate(t.eventDate)}</span>
                      <span className="orphan-title">{t.title}</span>
                    </div>
                  ))}
                </div>
                <p className="agg-hint">建议为这些节点添加地点信息，让它们出现在回忆地图上</p>
              </div>
            )}

            {aggregate.unboundMaterials.length > 0 && (
              <div className="agg-section warn-section">
                <h4 className="agg-section-title">📦 未关联节点的素材</h4>
                <div className="unbound-grid">
                  {aggregate.unboundMaterials.slice(0, 12).map(m => (
                    <div key={m.id} className="unbound-item">
                      <div className="unbound-type">
                        {m.type === 'image' && '🖼️'}
                        {m.type === 'video' && '🎬'}
                        {m.type === 'audio' && '🎵'}
                        {m.type === 'text' && '✎'}
                      </div>
                      <span className="unbound-title">{m.title || '未命名素材'}</span>
                    </div>
                  ))}
                </div>
                {aggregate.unboundMaterials.length > 12 && (
                  <p className="agg-hint">还有 {aggregate.unboundMaterials.length - 12} 个素材未关联</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showDetail && selectedMarker && (
        <div className="detail-overlay" onClick={handleCloseDetail}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <button className="detail-close" onClick={handleCloseDetail}>×</button>
            <div className="detail-header">
              <div className="detail-date-badge">{formatDate(selectedMarker.eventDate)}</div>
              <h3 className="detail-title">{selectedMarker.title}</h3>
            </div>

            {selectedMarker.location && (
              <div className="detail-location">
                <div className="detail-location-icon">📍</div>
                <div className="detail-location-info">
                  {selectedMarker.location.name && <div className="detail-location-name">{selectedMarker.location.name}</div>}
                  {selectedMarker.location.city && <div className="detail-location-city">{selectedMarker.location.city}</div>}
                  {selectedMarker.location.address && <div className="detail-location-address">{selectedMarker.location.address}</div>}
                  <div className="detail-coords">
                    坐标: {selectedMarker.location.lat.toFixed(6)}, {selectedMarker.location.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            )}

            {selectedMarker.description && (
              <div className="detail-section">
                <h4 className="detail-section-title">描述</h4>
                <p className="detail-desc">{selectedMarker.description}</p>
              </div>
            )}

            <div className="detail-section">
              <h4 className="detail-section-title">
                关联素材 ({selectedMarker.materialStats.total})
              </h4>
              {selectedMarker.materials.length === 0 ? (
                <p className="detail-empty">暂无关联素材</p>
              ) : (
                <div className="detail-materials">
                  {selectedMarker.materials.map(mat => (
                    <div key={mat.id} className="detail-material">
                      <div className="dm-thumb">
                        {mat.type === 'image' && mat.url && <img src={mat.url} alt={mat.title} />}
                        {mat.type === 'audio' && <span className="dm-icon">🎵</span>}
                        {mat.type === 'video' && <span className="dm-icon">🎬</span>}
                        {mat.type === 'text' && <span className="dm-icon">✎</span>}
                      </div>
                      <div className="dm-info">
                        <div className="dm-title">{mat.title || '未命名素材'}</div>
                        {mat.description && <div className="dm-desc">{mat.description}</div>}
                        {mat.type === 'audio' && mat.url && (
                          <audio controls src={mat.url} className="dm-audio" />
                        )}
                        {mat.type === 'video' && mat.url && (
                          <video controls src={mat.url} className="dm-video" />
                        )}
                        {mat.type === 'text' && mat.metadata?.content && (
                          <div className="dm-text-content">{mat.metadata.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryMap;
