import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { memorialRitualApi } from '../services/api.js';
import './MemorialRitualList.scss';

function MemorialRitualList() {
  const navigate = useNavigate();
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRituals();
  }, []);

  const loadRituals = async () => {
    try {
      const data = await memorialRitualApi.list();
      setRituals(data);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个纪念仪式吗？相关的留言和播放状态都将被删除。')) return;
    try {
      await memorialRitualApi.remove(id);
      loadRituals();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="memorial-ritual-list">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">
            <span className="title-icon">🕯️</span>
            纪念仪式管理
          </h1>
          <p className="page-desc">创建和管理专属的纪念仪式流程</p>
        </div>
        <button className="btn btn-primary btn-create" onClick={() => navigate('/memorial-rituals/create')}>
          <span className="btn-icon">+</span>
          创建新仪式
        </button>
      </div>

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : rituals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✧</div>
          <h3>还没有纪念仪式</h3>
          <p>创建第一个专属纪念仪式，开启温馨追忆之旅</p>
          <Link to="/memorial-rituals/create" className="btn btn-primary btn-lg">
            开始创建
          </Link>
        </div>
      ) : (
        <div className="rituals-grid">
          {rituals.map(ritual => (
            <div key={ritual.id} className="ritual-card">
              <Link to={`/memorial-rituals/${ritual.id}/player`} className="card-link">
                <div className="card-cover">
                  <div className="cover-gradient"></div>
                  <div className="cover-content">
                    <div className="cover-icon">🕯️</div>
                    <div className="cover-stats">
                      <span className="stat">
                        <i>📋</i>
                        {ritual.steps?.length || 0} 环节
                      </span>
                      <span className="stat">
                        <i>🎵</i>
                        {ritual.backgroundMusic?.length || 0} 音乐
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{ritual.title}</h3>
                  <p className="card-desc">{ritual.description || '暂无描述'}</p>
                  <div className="card-meta">
                    <span>更新于 {formatDate(ritual.updatedAt)}</span>
                  </div>
                </div>
              </Link>
              <div className="card-actions">
                <button className="action-btn play" onClick={() => navigate(`/memorial-rituals/${ritual.id}/player`)}>
                  ▶️ 播放
                </button>
                <button className="action-btn edit" onClick={() => navigate(`/memorial-rituals/${ritual.id}/edit`)}>
                  ✏️ 编辑
                </button>
                <button className="action-btn delete" onClick={(e) => handleDelete(ritual.id, e)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemorialRitualList;
