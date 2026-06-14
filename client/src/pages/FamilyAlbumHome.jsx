import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { familyAlbumApi } from '../services/api.js';
import './FamilyAlbumHome.scss';

function FamilyAlbumHome() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      const data = await familyAlbumApi.list();
      setAlbums(data);
    } catch (err) {
      console.error('加载家庭纪念册失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个家庭纪念册吗？关联的展厅和成员不会被删除。')) return;
    try {
      await familyAlbumApi.remove(id);
      loadAlbums();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getThemeColor = (theme) => {
    const colors = {
      warm: 'linear-gradient(135deg, rgba(255, 165, 100, 0.2), rgba(255, 200, 150, 0.2))',
      cool: 'linear-gradient(135deg, rgba(100, 180, 255, 0.2), rgba(150, 200, 255, 0.2))',
      forest: 'linear-gradient(135deg, rgba(100, 200, 150, 0.2), rgba(150, 220, 180, 0.2))',
      sunset: 'linear-gradient(135deg, rgba(255, 150, 150, 0.2), rgba(255, 200, 180, 0.2))'
    };
    return colors[theme] || colors.warm;
  };

  return (
    <div className="family-album-home">
      <section className="family-hero">
        <h1 className="family-hero-title">
          <span className="family-title-line">家的记忆</span>
          <span className="family-title-line">永远珍藏于心</span>
        </h1>
        <p className="family-hero-subtitle">记录家庭的每一个温暖瞬间，让爱世代传承</p>
        <div className="family-hero-actions">
          <Link to="/family-albums/create" className="family-hero-btn primary">
            <span className="btn-icon">❤</span>
            创建家庭纪念册
          </Link>
          <Link to="/family-members" className="family-hero-btn secondary">
            <span className="btn-icon">❋</span>
            管理家庭成员
          </Link>
        </div>
      </section>

      <section className="nav-quick-links">
        <Link to="/family-members" className="quick-link-card">
          <div className="quick-link-icon">❋</div>
          <div className="quick-link-info">
            <h3>家庭成员</h3>
            <p>管理家族成员信息与关系</p>
          </div>
        </Link>
        <Link to="/" className="quick-link-card">
          <div className="quick-link-icon">✦</div>
          <div className="quick-link-info">
            <h3>全部展厅</h3>
            <p>浏览所有独立回忆展厅</p>
          </div>
        </Link>
      </section>

      <section className="album-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">❦</span>
            我的家庭纪念册
          </h2>
          <span className="section-count">{albums.length} 本纪念册</span>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="loading-spinner"></div>
            <span className="loading-text">加载中...</span>
          </div>
        ) : albums.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❧</div>
            <p className="empty-text">还没有家庭纪念册，创建第一本来珍藏家族回忆吧</p>
            <Link to="/family-albums/create" className="empty-btn">开始创建</Link>
          </div>
        ) : (
          <div className="album-grid">
            {albums.map(album => (
              <Link to={`/family-albums/${album.id}`} key={album.id} className="album-card">
                <div className="album-cover" style={{ background: getThemeColor(album.theme) }}>
                  {album.coverImage ? (
                    <img src={album.coverImage} alt={album.name} />
                  ) : (
                    <div className="album-cover-placeholder">
                      <span>❦</span>
                    </div>
                  )}
                  <div className="album-overlay">
                    <button className="album-delete" onClick={(e) => handleDelete(album.id, e)}>
                      删除
                    </button>
                  </div>
                </div>
                <div className="album-content">
                  <h3 className="album-title">{album.name}</h3>
                  <p className="album-desc">{album.description || '暂无描述'}</p>
                  <div className="album-stats">
                    <span className="stat-item">
                      <span className="stat-icon">✦</span>
                      {(album.exhibitionIds || []).length} 个展厅
                    </span>
                    <span className="stat-item">
                      <span className="stat-icon">❋</span>
                      {(album.memberIds || []).length} 位成员
                    </span>
                  </div>
                  <div className="album-meta">
                    <span className="album-date">创建于 {formatDate(album.createdAt)}</span>
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

export default FamilyAlbumHome;
