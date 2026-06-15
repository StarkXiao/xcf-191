import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collectionApi } from '../services/api.js';
import './CollectionHome.scss';

function CollectionHome() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadCollections();
  }, [activeTab, searchKeyword]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }
      const data = await collectionApi.list(params);
      setCollections(data);
    } catch (err) {
      console.error('加载专题列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个专题吗？关联的展厅和素材不会被删除。')) return;
    try {
      await collectionApi.remove(id);
      loadCollections();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTypeLabel = (type) => {
    return type === 'person' ? '人物专题' : '事件专题';
  };

  const getTypeIcon = (type) => {
    return type === 'person' ? '❋' : '✦';
  };

  const getTypeColor = (type) => {
    return type === 'person' 
      ? 'linear-gradient(135deg, rgba(255, 182, 193, 0.2), rgba(255, 215, 0, 0.2))'
      : 'linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(100, 149, 237, 0.2))';
  };

  const tabs = [
    { key: 'all', label: '全部专题' },
    { key: 'person', label: '人物专题' },
    { key: 'event', label: '事件专题' }
  ];

  return (
    <div className="collection-home">
      <section className="collection-hero">
        <h1 className="collection-hero-title">
          <span className="collection-title-line">回忆合集</span>
          <span className="collection-title-line">珍藏每一段故事</span>
        </h1>
        <p className="collection-hero-subtitle">按人物或事件聚合多展厅素材，让回忆更有温度</p>
        <div className="collection-hero-actions">
          <Link to="/collections/create" className="collection-hero-btn primary">
            <span className="btn-icon">✦</span>
            创建专题
          </Link>
        </div>
      </section>

      <section className="collection-toolbar">
        <div className="tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <span className="search-icon">❧</span>
          <input
            type="text"
            placeholder="搜索专题名称、描述或标签..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      </section>

      <section className="collection-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">❦</span>
            {tabs.find(t => t.key === activeTab)?.label || '全部专题'}
          </h2>
          <span className="section-count">{collections.length} 个专题</span>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="loading-spinner"></div>
            <span className="loading-text">加载中...</span>
          </div>
        ) : collections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❧</div>
            <p className="empty-text">
              {searchKeyword ? '没有找到匹配的专题' : '还没有专题，创建第一个来珍藏回忆吧'}
            </p>
            {!searchKeyword && (
              <Link to="/collections/create" className="empty-btn">开始创建</Link>
            )}
          </div>
        ) : (
          <div className="collection-grid">
            {collections.map(col => (
              <Link to={`/collections/${col.id}`} key={col.id} className="collection-card">
                <div className="collection-cover" style={{ background: getTypeColor(col.type) }}>
                  {col.coverImage ? (
                    <img src={col.coverImage} alt={col.title} />
                  ) : (
                    <div className="collection-cover-placeholder">
                      <span>{getTypeIcon(col.type)}</span>
                    </div>
                  )}
                  <div className="collection-type-badge">
                    {getTypeLabel(col.type)}
                  </div>
                  <div className="collection-overlay">
                    <button className="collection-edit" onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/collections/${col.id}/edit`);
                    }}>
                      编辑
                    </button>
                    <button className="collection-delete" onClick={(e) => handleDelete(col.id, e)}>
                      删除
                    </button>
                  </div>
                </div>
                <div className="collection-content">
                  <h3 className="collection-title">{col.title}</h3>
                  <p className="collection-desc">{col.description || '暂无描述'}</p>
                  {col.tags && col.tags.length > 0 && (
                    <div className="collection-tags">
                      {col.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="tag-item">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="collection-stats">
                    <span className="stat-item">
                      <span className="stat-icon">✦</span>
                      {(col.exhibitionIds || []).length} 个展厅
                    </span>
                  </div>
                  <div className="collection-meta">
                    <span className="collection-date">创建于 {formatDate(col.createdAt)}</span>
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

export default CollectionHome;
