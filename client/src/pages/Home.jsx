import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exhibitionApi, appointmentApi } from '../services/api.js';
import './Home.scss';

function Home() {
  const [exhibitions, setExhibitions] = useState([]);
  const [apptStats, setApptStats] = useState(null);
  const [anniversaries, setAnniversaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exs, stats, annivs] = await Promise.all([
        exhibitionApi.list(),
        appointmentApi.getStats().catch(() => null),
        exhibitionApi.getUpcomingAnniversaries(30).catch(() => [])
      ]);
      setExhibitions(exs);
      setApptStats(stats);
      setAnniversaries(annivs);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个展厅吗？相关的素材、时间轴和留言都将被删除。')) return;
    try {
      await exhibitionApi.remove(id);
      loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleRemind = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await exhibitionApi.sendAnniversaryRemind(id);
      loadData();
    } catch (err) {
      console.error('提醒失败:', err);
    }
  };

  const handleRevisit = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await exhibitionApi.revisit(id);
      navigate(`/appointment/book/${id}`);
    } catch (err) {
      console.error('回访失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatAnniversaryDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getDaysLabel = (daysUntil) => {
    if (daysUntil === 0) return '今天';
    if (daysUntil === 1) return '明天';
    return `${daysUntil}天后`;
  };

  const getUrgencyClass = (daysUntil) => {
    if (daysUntil <= 3) return 'urgent';
    if (daysUntil <= 7) return 'soon';
    return 'normal';
  };

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">
          <span className="title-line">每一段回忆</span>
          <span className="title-line">都是夜空中的星屑</span>
        </h1>
        <p className="hero-subtitle">在这里，珍藏那些值得被永远铭记的时光</p>
        <Link to="/create" className="hero-btn">
          <span className="hero-btn-icon">✦</span>
          创建我的纪念馆
        </Link>
      </section>

      {anniversaries.length > 0 && (
        <section className="anniversary-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="title-icon">🔔</span>
              纪念日提醒
            </h2>
            <span className="section-count">{anniversaries.length} 个即将到来</span>
          </div>
          <div className="anniversary-cards">
            {anniversaries.map(ann => (
              <div
                key={ann.exhibitionId}
                className={`anniversary-card ${getUrgencyClass(ann.daysUntil)}`}
                onClick={() => navigate(`/exhibition/${ann.exhibitionId}`)}
              >
                <div className="anniversary-cover">
                  {ann.exhibitionCover ? (
                    <img src={ann.exhibitionCover} alt={ann.exhibitionTitle} />
                  ) : (
                    <div className="anniversary-cover-placeholder">✦</div>
                  )}
                </div>
                <div className="anniversary-content">
                  <div className="anniversary-header">
                    <h3 className="anniversary-title">{ann.exhibitionTitle}</h3>
                    <span className={`anniversary-badge ${getUrgencyClass(ann.daysUntil)}`}>
                      {getDaysLabel(ann.daysUntil)}
                    </span>
                  </div>
                  <div className="anniversary-info">
                    <span className="anniversary-date">
                      {formatAnniversaryDate(ann.memorialDate)} · 第{ann.yearsSince}年
                    </span>
                    {ann.revisitCount > 0 && (
                      <span className="anniversary-revisit">已回访 {ann.revisitCount} 次</span>
                    )}
                  </div>
                  <div className="anniversary-actions">
                    <button
                      className="anniversary-btn revisit-btn"
                      onClick={(e) => handleRevisit(ann.exhibitionId, e)}
                    >
                      🕊️ 回访追思
                    </button>
                    <button
                      className="anniversary-btn remind-btn"
                      onClick={(e) => handleRemind(ann.exhibitionId, e)}
                    >
                      🔔 提醒
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="quick-actions">
        <div className="action-cards">
          <Link to="/memorial-rituals" className="action-card ritual-card">
            <div className="action-icon">🕯️</div>
            <div className="action-info">
              <h3>纪念仪式</h3>
              <p>配置专属仪式流程，播放温馨追忆</p>
            </div>
          </Link>
          <Link to="/appointment/book" className="action-card appointment-card">
            <div className="action-icon">✿</div>
            <div className="action-info">
              <h3>访客预约</h3>
              <p>预约追思时段，静享温馨时光</p>
            </div>
            {apptStats && (
              <div className="action-stats">
                <span>{apptStats.total} 次预约</span>
              </div>
            )}
          </Link>
          <Link to="/appointments" className="action-card admin-card">
            <div className="action-icon">📋</div>
            <div className="action-info">
              <h3>预约管理</h3>
              <p>管理时段、签到和访客记录</p>
            </div>
            {apptStats && (
              <div className="action-stats">
                <span className="pending">{apptStats.pending} 待确认</span>
                <span className="confirmed">{apptStats.confirmed} 已确认</span>
              </div>
            )}
          </Link>
        </div>
      </section>

      <section className="exhibition-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">❋</span>
            全部展厅
          </h2>
          <span className="section-count">{exhibitions.length} 个展厅</span>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="loading-spinner"></div>
            <span className="loading-text">加载中...</span>
          </div>
        ) : exhibitions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✧</div>
            <p className="empty-text">还没有展厅，创建第一个来珍藏回忆吧</p>
            <Link to="/create" className="empty-btn">开始创建</Link>
          </div>
        ) : (
          <div className="exhibition-grid">
            {exhibitions.map(ex => (
              <Link to={`/exhibition/${ex.id}`} key={ex.id} className="exhibition-card">
                <div className="card-cover">
                  {ex.coverImage ? (
                    <img src={ex.coverImage} alt={ex.title} />
                  ) : (
                    <div className="card-cover-placeholder">
                      <span>✦</span>
                    </div>
                  )}
                  <div className="card-overlay">
                    <button className="card-delete" onClick={(e) => handleDelete(ex.id, e)}>
                      删除
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <h3 className="card-title">{ex.title}</h3>
                  <p className="card-desc">{ex.description || '暂无描述'}</p>
                  <div className="card-meta">
                    <span className="card-date">创建于 {formatDate(ex.createdAt)}</span>
                    {ex.memorialDate && (
                      <span className="card-memorial">纪念日 {formatDate(ex.memorialDate)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
