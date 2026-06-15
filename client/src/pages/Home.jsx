import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { exhibitionApi, appointmentApi } from '../services/api.js';
import './Home.scss';

function Home() {
  const [exhibitions, setExhibitions] = useState([]);
  const [apptStats, setApptStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [exs, stats] = await Promise.all([
        exhibitionApi.list(),
        appointmentApi.getStats().catch(() => null)
      ]);
      setExhibitions(exs);
      setApptStats(stats);
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
      loadExhibitions();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

      <section className="quick-actions">
        <div className="action-cards">
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
