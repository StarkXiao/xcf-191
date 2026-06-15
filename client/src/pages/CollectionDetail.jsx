import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collectionApi } from '../services/api.js';
import './CollectionDetail.scss';

function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exhibitions');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [materialType, setMaterialType] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCollection();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'materials' && collection) {
      searchMaterials();
    }
  }, [searchKeyword, materialType, activeTab]);

  const loadCollection = async () => {
    setLoading(true);
    try {
      const data = await collectionApi.getDetail(id);
      setCollection(data);
    } catch (err) {
      console.error('加载专题详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMaterials = async () => {
    if (!collection) return;
    
    setSearching(true);
    try {
      const params = { collectionId: id };
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }
      if (materialType !== 'all') {
        params.type = materialType;
      }
      const results = await collectionApi.searchMaterials(params);
      setSearchResults(results);
    } catch (err) {
      console.error('搜索素材失败:', err);
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTypeLabel = (type) => {
    return type === 'person' ? '人物专题' : '事件专题';
  };

  const getMaterialTypeLabel = (type) => {
    const labels = {
      image: '图片',
      video: '视频',
      audio: '音频',
      text: '文字'
    };
    return labels[type] || type;
  };

  const getMaterialTypeIcon = (type) => {
    const icons = {
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
      text: '📝'
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="collection-detail loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="collection-detail not-found">
        <p>专题不存在</p>
        <Link to="/collections" className="back-btn">返回列表</Link>
      </div>
    );
  }

  const tabs = [
    { key: 'exhibitions', label: '展厅', count: collection.stats?.exhibitionCount || 0 },
    { key: 'materials', label: '全部素材', count: collection.stats?.materialCount || 0 },
    { key: 'timeline', label: '时间线', count: collection.stats?.timelineCount || 0 }
  ];

  const materialTypes = [
    { value: 'all', label: '全部' },
    { value: 'image', label: '图片' },
    { value: 'video', label: '视频' },
    { value: 'audio', label: '音频' },
    { value: 'text', label: '文字' }
  ];

  return (
    <div className="collection-detail">
      <div className="collection-header">
        <div className="collection-header-cover">
          {collection.coverImage ? (
            <img src={collection.coverImage} alt={collection.title} />
          ) : (
            <div className="header-cover-placeholder">
              <span>❦</span>
            </div>
          )}
          <div className="header-overlay"></div>
        </div>
        <div className="collection-header-content">
          <Link to="/collections" className="back-link">
            <span>←</span> 返回专题列表
          </Link>
          <div className="collection-type-badge">{getTypeLabel(collection.type)}</div>
          <h1 className="collection-title">{collection.title}</h1>
          <p className="collection-description">{collection.description || '暂无描述'}</p>
          
          {collection.tags && collection.tags.length > 0 && (
            <div className="collection-tags">
              {collection.tags.map((tag, idx) => (
                <span key={idx} className="tag-item">{tag}</span>
              ))}
            </div>
          )}

          <div className="collection-stats">
            <div className="stat-box">
              <span className="stat-number">{collection.stats?.exhibitionCount || 0}</span>
              <span className="stat-label">个展厅</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-number">{collection.stats?.materialCount || 0}</span>
              <span className="stat-label">份素材</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-box">
              <span className="stat-number">{collection.stats?.timelineCount || 0}</span>
              <span className="stat-label">条时间线</span>
            </div>
          </div>

          <div className="collection-actions">
            <Link to={`/collections/${id}/edit`} className="action-btn edit">
              <span className="action-icon">✎</span>
              编辑专题
            </Link>
          </div>
        </div>
      </div>

      {collection.type === 'person' && collection.personInfo && (
        <section className="detail-section info-section">
          <h2 className="section-title">
            <span className="title-icon">❋</span>
            人物信息
          </h2>
          <div className="info-card person-info-card">
            <div className="info-avatar">
              <span>{collection.personInfo.name?.charAt(0) || '?'}</span>
            </div>
            <div className="info-content">
              <h3 className="info-name">{collection.personInfo.name || '未知'}</h3>
              <div className="info-dates">
                {collection.personInfo.birthDate && (
                  <span className="date-item">
                    生于 {formatDate(collection.personInfo.birthDate)}
                  </span>
                )}
                {collection.personInfo.deathDate && (
                  <span className="date-item">
                    纪念 {formatDate(collection.personInfo.deathDate)}
                  </span>
                )}
              </div>
              {collection.personInfo.biography && (
                <p className="info-bio">{collection.personInfo.biography}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {collection.type === 'event' && collection.eventInfo && (
        <section className="detail-section info-section">
          <h2 className="section-title">
            <span className="title-icon">✦</span>
            事件信息
          </h2>
          <div className="info-card event-info-card">
            <div className="event-icon">
              <span>📅</span>
            </div>
            <div className="info-content">
              <h3 className="info-name">{collection.eventInfo.name || '未知事件'}</h3>
              <div className="event-meta">
                {collection.eventInfo.date && (
                  <span className="meta-item">
                    📍 {formatDate(collection.eventInfo.date)}
                  </span>
                )}
                {collection.eventInfo.location && (
                  <span className="meta-item">
                    🏠 {collection.eventInfo.location}
                  </span>
                )}
              </div>
              {collection.eventInfo.summary && (
                <p className="info-bio">{collection.eventInfo.summary}</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="detail-section">
        <div className="tabs-bar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === 'exhibitions' && (
          <div className="tab-content">
            {(collection.exhibitions || []).length === 0 ? (
              <div className="empty-inline">
                <p>还没有关联的展厅</p>
                <Link to={`/collections/${id}/edit`} className="link-btn">去添加展厅</Link>
              </div>
            ) : (
              <div className="exhibition-grid">
                {collection.exhibitions.map(ex => (
                  <Link to={`/exhibition/${ex.id}`} key={ex.id} className="exhibition-card">
                    <div className="card-cover">
                      {ex.coverImage ? (
                        <img src={ex.coverImage} alt={ex.title} />
                      ) : (
                        <div className="card-cover-placeholder">
                          <span>✦</span>
                        </div>
                      )}
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{ex.title}</h3>
                      <p className="card-desc">{ex.description || '暂无描述'}</p>
                      <span className="card-date">创建于 {formatDate(ex.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="tab-content">
            <div className="materials-toolbar">
              <div className="search-box">
                <span className="search-icon">❧</span>
                <input
                  type="text"
                  placeholder="搜索素材标题或描述..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              <div className="type-filter">
                {materialTypes.map(type => (
                  <button
                    key={type.value}
                    className={`type-btn ${materialType === type.value ? 'active' : ''}`}
                    onClick={() => setMaterialType(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {searching ? (
              <div className="loading-inline">
                <div className="loading-spinner small"></div>
                <span>搜索中...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-inline">
                <p>{searchKeyword ? '没有找到匹配的素材' : '暂无素材'}</p>
              </div>
            ) : (
              <div className="materials-grid">
                {searchResults.map(mat => (
                  <div key={mat.id} className="material-card">
                    <div className="material-cover">
                      {mat.type === 'image' && mat.url ? (
                        <img src={mat.url} alt={mat.title} />
                      ) : (
                        <div className="material-icon-wrap">
                          <span className="material-type-icon">
                            {getMaterialTypeIcon(mat.type)}
                          </span>
                        </div>
                      )}
                      <div className="material-type-badge">
                        {getMaterialTypeLabel(mat.type)}
                      </div>
                    </div>
                    <div className="material-info">
                      <h4 className="material-title">{mat.title || '无标题'}</h4>
                      <p className="material-desc">{mat.description || '暂无描述'}</p>
                      {mat.exhibition && (
                        <span className="material-from">
                          来自：{mat.exhibition.title}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="tab-content">
            {(collection.timelines || []).length === 0 ? (
              <div className="empty-inline">
                <p>暂无时间线内容</p>
              </div>
            ) : (
              <div className="timeline-list">
                {collection.timelines.map(tl => (
                  <div key={tl.id} className="timeline-item-card">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h4 className="timeline-title">{tl.title || '时间线事件'}</h4>
                      {tl.eventDate && <span className="timeline-date">{formatDate(tl.eventDate)}</span>}
                      {tl.description && (
                        <p className="timeline-desc">{tl.description}</p>
                      )}
                      {tl.exhibitionTitle && (
                        <span className="timeline-from">来自：{tl.exhibitionTitle}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CollectionDetail;
