import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi } from '../services/api.js';
import './OpsMaterialInspect.scss';

const STATUS_CONFIG = {
  healthy: { label: '健康', color: '#98fb98', icon: '✅' },
  warning: { label: '警告', color: '#ffd700', icon: '⚠️' },
  error: { label: '异常', color: '#ff8080', icon: '❌' }
};

const TYPE_LABELS = {
  text: '文本',
  image: '图片',
  audio: '音频',
  video: '视频',
  unknown: '未知'
};

function OpsMaterialInspect() {
  const navigate = useNavigate();
  const [inspectResult, setInspectResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    runInspect();
  }, []);

  const runInspect = async () => {
    setLoading(true);
    try {
      const data = await opsApi.inspectMaterials();
      setInspectResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="ops-material-inspect"><div className="loading">巡检中...</div></div>;
  }

  if (!inspectResult) {
    return <div className="ops-material-inspect"><div className="loading">加载失败</div></div>;
  }

  const filteredItems = filter === 'all'
    ? inspectResult.items
    : inspectResult.items.filter(item => item.status === filter);

  return (
    <div className="ops-material-inspect">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops')}>
          <span>←</span> 返回运营中心
        </button>
        <div className="header-content">
          <h1>素材巡检</h1>
          <button className="btn-primary" onClick={runInspect}>重新巡检</button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card total">
          <span className="summary-value">{inspectResult.total}</span>
          <span className="summary-label">素材总数</span>
        </div>
        <div className="summary-card healthy" onClick={() => setFilter('healthy')}>
          <span className="summary-value">{inspectResult.healthy}</span>
          <span className="summary-label">健康</span>
        </div>
        <div className="summary-card warning" onClick={() => setFilter('warning')}>
          <span className="summary-value">{inspectResult.warning}</span>
          <span className="summary-label">警告</span>
        </div>
        <div className="summary-card error" onClick={() => setFilter('error')}>
          <span className="summary-value">{inspectResult.error}</span>
          <span className="summary-label">异常</span>
        </div>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          全部 ({inspectResult.total})
        </button>
        <button className={`filter-btn ${filter === 'healthy' ? 'active' : ''}`} onClick={() => setFilter('healthy')}>
          ✅ 健康 ({inspectResult.healthy})
        </button>
        <button className={`filter-btn ${filter === 'warning' ? 'active' : ''}`} onClick={() => setFilter('warning')}>
          ⚠️ 警告 ({inspectResult.warning})
        </button>
        <button className={`filter-btn ${filter === 'error' ? 'active' : ''}`} onClick={() => setFilter('error')}>
          ❌ 异常 ({inspectResult.error})
        </button>
      </div>

      <div className="materials-grid">
        {filteredItems.length === 0 ? (
          <div className="empty">没有符合条件的素材</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className={`material-card ${item.status}`}>
              <div className="card-header">
                <span className="card-status-icon">{STATUS_CONFIG[item.status].icon}</span>
                <span className="card-title">{item.title}</span>
                <span className="card-type">{TYPE_LABELS[item.type] || item.type}</span>
              </div>
              <div className="card-exhibition">{item.exhibitionTitle}</div>
              {item.url && (
                <div className="card-url" title={item.url}>
                  {item.url.length > 60 ? item.url.substring(0, 60) + '...' : item.url}
                </div>
              )}
              {item.issues.length > 0 && (
                <div className="card-issues">
                  {item.issues.map((issue, idx) => (
                    <div key={idx} className="issue-tag">
                      <span className="issue-dot" style={{ background: STATUS_CONFIG[item.status].color }} />
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OpsMaterialInspect;
