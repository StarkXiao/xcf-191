import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { familyAlbumApi, exhibitionApi, familyMemberApi } from '../services/api.js';
import './CreateFamilyAlbum.scss';

const THEME_OPTIONS = [
  { value: 'warm', label: '温暖暖色', color: 'linear-gradient(135deg, rgba(255, 165, 100, 0.3), rgba(255, 200, 150, 0.3))' },
  { value: 'cool', label: '清新冷色', color: 'linear-gradient(135deg, rgba(100, 180, 255, 0.3), rgba(150, 200, 255, 0.3))' },
  { value: 'forest', label: '森林绿意', color: 'linear-gradient(135deg, rgba(100, 200, 150, 0.3), rgba(150, 220, 180, 0.3))' },
  { value: 'sunset', label: '夕阳余晖', color: 'linear-gradient(135deg, rgba(255, 150, 150, 0.3), rgba(255, 200, 180, 0.3))' }
];

function CreateFamilyAlbum() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
    theme: 'warm',
    exhibitionIds: [],
    memberIds: []
  });
  const [allExhibitions, setAllExhibitions] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [exhibitions, members] = await Promise.all([
        exhibitionApi.list(),
        familyMemberApi.list()
      ]);
      setAllExhibitions(exhibitions);
      setAllMembers(members);

      if (isEditing) {
        const album = await familyAlbumApi.get(id);
        setFormData({
          name: album.name,
          description: album.description || '',
          coverImage: album.coverImage || '',
          theme: album.theme || 'warm',
          exhibitionIds: album.exhibitionIds || [],
          memberIds: album.memberIds || []
        });
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await familyAlbumApi.update(id, formData);
      } else {
        const newAlbum = await familyAlbumApi.create(formData);
        navigate(`/family-albums/${newAlbum.id}`);
        return;
      }
      navigate(`/family-albums/${id}`);
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExhibition = (exhibitionId) => {
    setFormData(prev => ({
      ...prev,
      exhibitionIds: prev.exhibitionIds.includes(exhibitionId)
        ? prev.exhibitionIds.filter(id => id !== exhibitionId)
        : [...prev.exhibitionIds, exhibitionId]
    }));
  };

  const toggleMember = (memberId) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId]
    }));
  };

  if (loading) {
    return (
      <div className="create-family-album loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  return (
    <div className="create-family-album">
      <div className="form-header">
        <Link to="/family-albums" className="back-link">
          <span>←</span> 返回纪念册列表
        </Link>
        <h1 className="form-title">
          <span className="title-icon">❦</span>
          {isEditing ? '编辑家庭纪念册' : '创建家庭纪念册'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="album-form">
        <section className="form-section">
          <h2 className="section-heading">基本信息</h2>

          <div className="form-item">
            <label>纪念册名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：我们的家、王家家族史、爷爷奶奶的故事"
              required
            />
          </div>

          <div className="form-item">
            <label>封面图片URL</label>
            <input
              type="text"
              value={formData.coverImage}
              onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="可选，用于展示的封面图片地址"
            />
            {formData.coverImage && (
              <div className="cover-preview">
                <img src={formData.coverImage} alt="封面预览" />
              </div>
            )}
          </div>

          <div className="form-item">
            <label>主题描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="记录这个家庭纪念册的故事背景、创建目的等..."
              rows={3}
            />
          </div>

          <div className="form-item">
            <label>选择主题风格</label>
            <div className="theme-options">
              {THEME_OPTIONS.map(theme => (
                <button
                  key={theme.value}
                  type="button"
                  className={`theme-option ${formData.theme === theme.value ? 'selected' : ''}`}
                  style={{ background: theme.color }}
                  onClick={() => setFormData({ ...formData, theme: theme.value })}
                >
                  <span className="theme-label">{theme.label}</span>
                  {formData.theme === theme.value && <span className="theme-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading-row">
            <h2 className="section-heading">
              <span className="heading-icon">✦</span>
              关联展厅
            </h2>
            <span className="section-count">{formData.exhibitionIds.length} / {allExhibitions.length} 已选</span>
          </div>

          {allExhibitions.length === 0 ? (
            <div className="empty-section">
              <p>还没有创建任何展厅</p>
              <Link to="/create" className="link-btn">去创建展厅</Link>
            </div>
          ) : (
            <div className="select-grid">
              {allExhibitions.map(ex => {
                const selected = formData.exhibitionIds.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    className={`select-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleExhibition(ex.id)}
                  >
                    <div className="select-card-cover">
                      {ex.coverImage ? (
                        <img src={ex.coverImage} alt={ex.title} />
                      ) : (
                        <div className="card-cover-placeholder"><span>✦</span></div>
                      )}
                      {selected && <div className="select-overlay"><span>✓</span></div>}
                    </div>
                    <div className="select-card-info">
                      <h4 className="card-name">{ex.title}</h4>
                      <p className="card-desc">{ex.description || '暂无描述'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="section-heading-row">
            <h2 className="section-heading">
              <span className="heading-icon">❋</span>
              关联家庭成员
            </h2>
            <span className="section-count">{formData.memberIds.length} / {allMembers.length} 已选</span>
          </div>

          {allMembers.length === 0 ? (
            <div className="empty-section">
              <p>还没有添加任何家庭成员</p>
              <Link to="/family-members" className="link-btn">去添加成员</Link>
            </div>
          ) : (
            <div className="members-select-grid">
              {allMembers.map(member => {
                const selected = formData.memberIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    className={`member-select-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleMember(member.id)}
                  >
                    <div className="member-select-avatar">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} />
                      ) : (
                        <span>{member.name.charAt(0)}</span>
                      )}
                      {selected && <div className="select-check">✓</div>}
                    </div>
                    <div className="member-select-info">
                      <h4 className="member-name">{member.name}</h4>
                      {member.role && <span className="member-role">{member.role}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="form-actions">
          <Link to="/family-albums" className="btn-cancel">取消</Link>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? '保存中...' : (isEditing ? '保存修改' : '创建纪念册')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateFamilyAlbum;
