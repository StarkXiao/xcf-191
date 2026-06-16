import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { exhibitionApi, materialApi, timelineApi, fileApi, memoryMapApi } from '../services/api.js';
import MaterialManager from '../components/MaterialManager.jsx';
import TimelineEditor from '../components/TimelineEditor.jsx';
import MemoryMap from '../components/MemoryMap.jsx';
import MessageBoard from '../components/MessageBoard.jsx';
import ShareManager from '../components/ShareManager.jsx';
import AppointmentForm from '../components/AppointmentForm.jsx';
import VisitorGroupManager from '../components/VisitorGroupManager.jsx';
import './ExhibitionDetail.scss';

function ExhibitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [activeTab, setActiveTab] = useState('materials');
  const [loading, setLoading] = useState(true);
  const [editingMemorial, setEditingMemorial] = useState(false);
  const [memorialDateInput, setMemorialDateInput] = useState('');

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const [ex, mats, tims] = await Promise.all([
        exhibitionApi.get(id),
        materialApi.list(id),
        timelineApi.list(id)
      ]);
      setExhibition(ex);
      setMaterials(mats);
      setTimelines(tims);
      setMemorialDateInput(ex.memorialDate || '');
    } catch (err) {
      console.error('加载失败:', err);
      if (err.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemorial = async () => {
    try {
      const updated = await exhibitionApi.update(id, { memorialDate: memorialDateInput });
      setExhibition(updated);
      setEditingMemorial(false);
    } catch (err) {
      console.error('保存纪念日失败:', err);
    }
  };

  const handleRevisit = async () => {
    try {
      await exhibitionApi.revisit(id);
      navigate(`/appointment/book/${id}`);
    } catch (err) {
      console.error('回访失败:', err);
    }
  };

  const formatMemorialDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getNextAnniversary = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    let next = new Date(currentYear, d.getMonth(), d.getDate());
    if (next < now) {
      next.setFullYear(currentYear + 1);
    }
    const diffMs = next - now;
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const yearsSince = next.getFullYear() - d.getFullYear();
    return { date: next, daysUntil, yearsSince };
  };

  const tabs = [
    { key: 'materials', name: '素材管理', icon: '❋' },
    { key: 'timeline', name: '时间轴', icon: '⌛' },
    { key: 'memorymap', name: '回忆地图', icon: '🗺️' },
    { key: 'messages', name: '访客留言', icon: '✉' },
    { key: 'visitorgroups', name: '访客分组', icon: '👥' },
    { key: 'appointment', name: '访客预约', icon: '✿' },
    { key: 'share', name: '公开分享', icon: '✦' }
  ];

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  if (!exhibition) return null;

  return (
    <div className={`exhibition-detail theme-${exhibition.theme}`}>
      <div className="detail-hero">
        <div className="hero-cover">
          {exhibition.coverImage ? (
            <img src={exhibition.coverImage} alt={exhibition.title} />
          ) : (
            <div className="hero-cover-placeholder"><span>✦</span></div>
          )}
          <div className="hero-mask"></div>
        </div>
        <div className="hero-content">
          <button className="back-btn" onClick={() => navigate('/')}>
            <span>←</span> 返回
          </button>
          <h1 className="hero-title">{exhibition.title}</h1>
          <p className="hero-desc">{exhibition.description || '暂无描述'}</p>
          <div className="hero-memorial">
            {exhibition.memorialDate ? (
              <div className="memorial-info">
                <span className="memorial-label">🕯️ 纪念日</span>
                <span className="memorial-date">{formatMemorialDate(exhibition.memorialDate)}</span>
                {(() => {
                  const ann = getNextAnniversary(exhibition.memorialDate);
                  if (!ann) return null;
                  return (
                    <span className={`memorial-countdown ${ann.daysUntil <= 7 ? 'soon' : ''}`}>
                      {ann.daysUntil === 0 ? '就是今天'
                        : ann.daysUntil === 1 ? '明天'
                        : `${ann.daysUntil}天后`}
                      · 第{ann.yearsSince}年
                    </span>
                  );
                })()}
                <button
                  className="memorial-edit-btn"
                  onClick={() => setEditingMemorial(true)}
                >
                  编辑
                </button>
              </div>
            ) : (
              <button
                className="memorial-add-btn"
                onClick={() => setEditingMemorial(true)}
              >
                + 设置纪念日
              </button>
            )}
            {editingMemorial && (
              <div className="memorial-edit-form">
                <input
                  type="date"
                  value={memorialDateInput}
                  onChange={(e) => setMemorialDateInput(e.target.value)}
                  className="memorial-date-input"
                />
                <button className="memorial-save-btn" onClick={handleSaveMemorial}>保存</button>
                <button className="memorial-cancel-btn" onClick={() => setEditingMemorial(false)}>取消</button>
              </div>
            )}
          </div>
          <div className="hero-actions">
            {timelines.length > 0 && (
              <Link to={`/exhibition/${id}/player`} className="action-btn play-btn">
                <span className="btn-icon">▶</span>
                播放回忆
              </Link>
            )}
            <button className="action-btn revisit-action-btn" onClick={handleRevisit}>
              <span className="btn-icon">🕊️</span>
              回访追思
            </button>
            <div className="hero-stats">
              <span className="stat"><b>{materials.length}</b> 素材</span>
              <span className="stat"><b>{timelines.length}</b> 时间节点</span>
              {exhibition.revisitCount > 0 && (
                <span className="stat revisit-stat"><b>{exhibition.revisitCount}</b> 次回访</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'materials' && (
          <MaterialManager
            exhibitionId={id}
            materials={materials}
            timelines={timelines}
            onMaterialsChange={setMaterials}
            fileApi={fileApi}
            materialApi={materialApi}
          />
        )}
        {activeTab === 'timeline' && (
          <TimelineEditor
            exhibitionId={id}
            materials={materials}
            timelines={timelines}
            onTimelinesChange={setTimelines}
            timelineApi={timelineApi}
          />
        )}
        {activeTab === 'memorymap' && (
          <MemoryMap
            exhibitionId={id}
            memoryMapApi={memoryMapApi}
            timelineApi={timelineApi}
            materialApi={materialApi}
          />
        )}
        {activeTab === 'messages' && (
          <MessageBoard exhibitionId={id} isAdmin={true} />
        )}
        {activeTab === 'visitorgroups' && (
          <VisitorGroupManager exhibitionId={id} />
        )}
        {activeTab === 'appointment' && (
          <AppointmentForm exhibitionId={id} />
        )}
        {activeTab === 'share' && (
          <ShareManager
            exhibitionId={id}
            exhibitionTitle={exhibition?.title}
          />
        )}
      </div>
    </div>
  );
}

export default ExhibitionDetail;
