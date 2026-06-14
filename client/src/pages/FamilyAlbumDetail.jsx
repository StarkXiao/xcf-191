import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { familyAlbumApi, exhibitionApi } from '../services/api.js';
import './FamilyAlbumDetail.scss';

function FamilyAlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [allExhibitions, setAllExhibitions] = useState([]);
  const [showAddExhibition, setShowAddExhibition] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [albumData, exhibitionsData] = await Promise.all([
        familyAlbumApi.get(id),
        exhibitionApi.list()
      ]);
      setAlbum(albumData);
      setAllExhibitions(exhibitionsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExhibition = async (exhibitionId) => {
    try {
      await familyAlbumApi.addExhibition(id, exhibitionId);
      loadData();
      setShowAddExhibition(false);
    } catch (err) {
      console.error('添加展厅失败:', err);
    }
  };

  const handleRemoveExhibition = async (exhibitionId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要从纪念册中移除此展厅吗？')) return;
    try {
      await familyAlbumApi.removeExhibition(id, exhibitionId);
      loadData();
    } catch (err) {
      console.error('移除展厅失败:', err);
    }
  };

  const handleRemoveMember = async (memberId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要从纪念册中移除此成员吗？成员信息不会被删除。')) return;
    try {
      await familyAlbumApi.removeMember(id, memberId);
      loadData();
    } catch (err) {
      console.error('移除成员失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getRelationLabel = (type) => {
    const labels = {
      father: '父亲',
      mother: '母亲',
      child: '子女',
      parent: '父母',
      spouse: '配偶',
      sibling: '兄弟姐妹',
      grandparent: '祖父母',
      grandchild: '孙子女',
      uncle_aunt: '叔伯/姨姑',
      nephew_niece: '侄子/侄女',
      cousin: '堂/表兄弟姐妹'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="family-album-detail loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="family-album-detail not-found">
        <p>家庭纪念册不存在</p>
        <Link to="/family-albums" className="back-btn">返回列表</Link>
      </div>
    );
  }

  const availableExhibitions = allExhibitions.filter(
    e => !(album.exhibitionIds || []).includes(e.id)
  );

  return (
    <div className="family-album-detail">
      <div className="album-header">
        <div className="album-header-cover">
          {album.coverImage ? (
            <img src={album.coverImage} alt={album.name} />
          ) : (
            <div className="header-cover-placeholder">
              <span>❦</span>
            </div>
          )}
        </div>
        <div className="album-header-content">
          <Link to="/family-albums" className="back-link">
            <span>←</span> 返回纪念册列表
          </Link>
          <h1 className="album-name">{album.name}</h1>
          <p className="album-description">{album.description || '暂无描述'}</p>
          <div className="album-actions">
            <Link to={`/family-albums/${id}/timeline`} className="action-btn timeline">
              <span className="action-icon">⌛</span>
              跨展厅时间轴
            </Link>
            <Link to={`/family-albums/${id}/edit`} className="action-btn edit">
              <span className="action-icon">✎</span>
              编辑纪念册
            </Link>
            <button className="action-btn members" onClick={() => navigate('/family-members')}>
              <span className="action-icon">❋</span>
              管理成员
            </button>
          </div>
        </div>
      </div>

      <section className="detail-section members-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">❋</span>
            家庭成员
          </h2>
          <Link to="/family-members" className="section-link">管理全部成员 →</Link>
        </div>
        {(album.members || []).length === 0 ? (
          <div className="empty-inline">
            <p>还没有添加家庭成员</p>
            <Link to="/family-members" className="link-btn">去添加成员</Link>
          </div>
        ) : (
          <div className="members-grid">
            {(album.members || []).map(member => (
              <div key={member.id} className="member-card">
                <div className="member-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} />
                  ) : (
                    <span className="avatar-placeholder">{member.name.charAt(0)}</span>
                  )}
                </div>
                <div className="member-info">
                  <h4 className="member-name">{member.name}</h4>
                  {member.role && <span className="member-role">{member.role}</span>}
                  {member.birthDate && (
                    <span className="member-date">生于 {formatDate(member.birthDate)}</span>
                  )}
                </div>
                <button
                  className="member-remove"
                  onClick={(e) => handleRemoveMember(member.id, e)}
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section exhibitions-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">✦</span>
            展厅归档
          </h2>
          <button className="section-link-btn" onClick={() => setShowAddExhibition(true)}>
            + 添加展厅
          </button>
        </div>

        {showAddExhibition && (
          <div className="add-exhibition-modal" onClick={() => setShowAddExhibition(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>选择展厅添加</h3>
                <button className="modal-close" onClick={() => setShowAddExhibition(false)}>×</button>
              </div>
              <div className="modal-body">
                {availableExhibitions.length === 0 ? (
                  <p className="empty-inline">没有可添加的展厅</p>
                ) : (
                  <div className="exhibition-select-list">
                    {availableExhibitions.map(ex => (
                      <div key={ex.id} className="exhibition-select-item">
                        <div className="select-cover">
                          {ex.coverImage ? (
                            <img src={ex.coverImage} alt={ex.title} />
                          ) : <span>✦</span>}
                        </div>
                        <div className="select-info">
                          <h4>{ex.title}</h4>
                          <p>{ex.description || '暂无描述'}</p>
                        </div>
                        <button
                          className="add-btn"
                          onClick={() => handleAddExhibition(ex.id)}
                        >
                          添加
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(album.exhibitions || []).length === 0 ? (
          <div className="empty-inline">
            <p>还没有添加展厅</p>
            <button className="link-btn" onClick={() => setShowAddExhibition(true)}>添加展厅</button>
          </div>
        ) : (
          <div className="exhibition-archive-grid">
            {(album.exhibitions || []).map(ex => (
              <Link to={`/exhibition/${ex.id}`} key={ex.id} className="exhibition-archive-card">
                <div className="archive-cover">
                  {ex.coverImage ? (
                    <img src={ex.coverImage} alt={ex.title} />
                  ) : (
                    <div className="archive-cover-placeholder">
                      <span>✦</span>
                    </div>
                  )}
                  <button
                    className="archive-remove"
                    onClick={(e) => handleRemoveExhibition(ex.id, e)}
                  >
                    移除
                  </button>
                </div>
                <div className="archive-content">
                  <h3 className="archive-title">{ex.title}</h3>
                  <p className="archive-desc">{ex.description || '暂无描述'}</p>
                  <span className="archive-date">创建于 {formatDate(ex.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default FamilyAlbumDetail;
