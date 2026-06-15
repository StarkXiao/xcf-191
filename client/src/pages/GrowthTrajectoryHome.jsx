import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionApi, timelineApi, growthTrajectoryApi } from '../services/api.js';
import './GrowthTrajectoryHome.scss';

function GrowthTrajectoryHome() {
  const navigate = useNavigate();
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExhibition, setSelectedExhibition] = useState(null);
  const [stagesData, setStagesData] = useState(null);
  const [stageCovers, setStageCovers] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const exhs = await exhibitionApi.list();
      const exhibitionsWithCount = await Promise.all(
        exhs.map(async (ex) => {
          const timelines = await timelineApi.list(ex.id);
          return { ...ex, timelineCount: timelines.length };
        })
      );
      setExhibitions(exhibitionsWithCount.filter(e => e.timelineCount > 0));
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectExhibition = async (exhibition) => {
    setSelectedExhibition(exhibition);
    setStagesData(null);
    try {
      const [stages, covers] = await Promise.all([
        growthTrajectoryApi.getStages(exhibition.id),
        growthTrajectoryApi.getCovers(exhibition.id)
      ]);
      setStagesData(stages);
      setStageCovers(covers);
    } catch (err) {
      console.error('加载阶段数据失败:', err);
    }
  };

  const handleStartPlayer = () => {
    if (selectedExhibition) {
      navigate(`/growth-trajectory/${selectedExhibition.id}/player`);
    }
  };

  if (loading) {
    return (
      <div className="gt-loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="growth-trajectory-home">
      <div className="gt-header">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回首页</button>
        <h1 className="gt-title">
          <span className="title-icon">🌱</span>
          成长轨迹馆
        </h1>
        <p className="gt-subtitle">以时间为笔，书写生命的章节</p>
      </div>

      {exhibitions.length === 0 ? (
        <div className="gt-empty">
          <div className="empty-icon">📚</div>
          <h3>暂无可用展厅</h3>
          <p>成长轨迹馆需要至少包含一个时间节点的展厅</p>
          <button className="primary-btn" onClick={() => navigate('/create')}>
            创建展厅
          </button>
        </div>
      ) : (
        <div className="gt-content">
          <div className="exhibition-list-section">
            <h2 className="section-title">选择展厅</h2>
            <div className="exhibition-grid">
              {exhibitions.map((ex) => (
                <div
                  key={ex.id}
                  className={`exhibition-card ${selectedExhibition?.id === ex.id ? 'selected' : ''}`}
                  onClick={() => selectExhibition(ex)}
                >
                  {ex.coverImage ? (
                    <div className="card-cover">
                      <img src={ex.coverImage} alt={ex.title} />
                    </div>
                  ) : (
                    <div className="card-cover placeholder">
                      <span>🖼️</span>
                    </div>
                  )}
                  <div className="card-info">
                    <h3 className="card-title">{ex.title}</h3>
                    <p className="card-count">
                      <span>📌 {ex.timelineCount} 个时间节点</span>
                    </p>
                    {ex.description && (
                      <p className="card-desc">{ex.description.substring(0, 50)}...</p>
                    )}
                  </div>
                  <div className="card-check">
                    {selectedExhibition?.id === ex.id ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stagesData && (
            <div className="stages-preview-section">
              <div className="stages-header">
                <h2 className="section-title">阶段章节预览</h2>
                <button className="start-player-btn" onClick={handleStartPlayer}>
                  <span>▶</span> 开始播放成长轨迹
                </button>
              </div>

              <div className="stages-stats">
                <div className="stat-item">
                  <span className="stat-icon">📖</span>
                  <span className="stat-value">{stagesData.stages.length}</span>
                  <span className="stat-label">人生阶段</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📌</span>
                  <span className="stat-value">{stagesData.totalNodes}</span>
                  <span className="stat-label">珍贵瞬间</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">🎞️</span>
                  <span className="stat-value">{stagesData.totalMaterials}</span>
                  <span className="stat-label">回忆素材</span>
                </div>
              </div>

              <div className="stages-timeline">
                {stagesData.stages.map((stage, idx) => (
                  <div key={stage.key} className="stage-item" style={{ '--stage-color': stage.color }}>
                    <div className="stage-line" />
                    <div className="stage-node">
                      <span className="stage-icon">{stage.icon}</span>
                    </div>
                    <div className="stage-content">
                      <div className="stage-cover">
                        {stageCovers[stage.key] || stage.coverImage ? (
                          <img src={stageCovers[stage.key] || stage.coverImage} alt={stage.name} />
                        ) : (
                          <div className="cover-placeholder">
                            <span>{stage.icon}</span>
                          </div>
                        )}
                      </div>
                      <div className="stage-info">
                        <div className="stage-header-row">
                          <span className="stage-order">第{idx + 1}章</span>
                          <h3 className="stage-name">{stage.name}</h3>
                        </div>
                        <p className="stage-description">{stage.description}</p>
                        <p className="stage-summary">{stage.summary}</p>
                        {stage.dateRange && (
                          <p className="stage-date-range">📅 {stage.dateRange}</p>
                        )}
                        <div className="stage-tags">
                          <span className="tag">📌 {stage.nodeCount} 个瞬间</span>
                          <span className="tag">🎞️ {stage.materialCount} 份素材</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GrowthTrajectoryHome;
