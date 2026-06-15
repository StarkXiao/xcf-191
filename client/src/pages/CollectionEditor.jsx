import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collectionApi, exhibitionApi, fileApi } from '../services/api.js';
import './CollectionEditor.scss';

const TYPE_OPTIONS = [
  { value: 'person', label: '人物专题', icon: '❋', desc: '围绕某个人物聚合回忆' },
  { value: 'event', label: '事件专题', icon: '✦', desc: '围绕某个事件聚合回忆' }
];

function CollectionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
    type: 'person',
    tags: [],
    exhibitionIds: [],
    config: {
      layout: 'grid',
      sortBy: 'date'
    },
    personInfo: {
      name: '',
      birthDate: '',
      deathDate: '',
      biography: ''
    },
    eventInfo: {
      name: '',
      date: '',
      location: '',
      summary: ''
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [allExhibitions, setAllExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const exhibitions = await exhibitionApi.list();
      setAllExhibitions(exhibitions);

      if (isEditing) {
        const collection = await collectionApi.get(id);
        setFormData({
          title: collection.title,
          description: collection.description || '',
          coverImage: collection.coverImage || '',
          type: collection.type || 'person',
          tags: collection.tags || [],
          exhibitionIds: collection.exhibitionIds || [],
          config: collection.config || {
            layout: 'grid',
            sortBy: 'date'
          },
          personInfo: collection.personInfo || {
            name: '',
            birthDate: '',
            deathDate: '',
            biography: ''
          },
          eventInfo: collection.eventInfo || {
            name: '',
            date: '',
            location: '',
            summary: ''
          }
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
    if (!formData.title.trim()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await collectionApi.update(id, formData);
        navigate(`/collections/${id}`);
      } else {
        const newCollection = await collectionApi.create(formData);
        navigate(`/collections/${newCollection.id}`);
      }
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

  const addTag = (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    if (formData.tags.includes(tagInput.trim())) {
      setTagInput('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      const result = await fileApi.upload(files);
      if (result && result.files && result.files.length > 0) {
        const fileUrl = result.files[0].url;
        setFormData(prev => ({ ...prev, coverImage: fileUrl }));
      }
    } catch (err) {
      console.error('上传失败:', err);
    } finally {
      setUploading(false);
    }
  };

  const updatePersonInfo = (field, value) => {
    setFormData(prev => ({
      ...prev,
      personInfo: { ...prev.personInfo, [field]: value }
    }));
  };

  const updateEventInfo = (field, value) => {
    setFormData(prev => ({
      ...prev,
      eventInfo: { ...prev.eventInfo, [field]: value }
    }));
  };

  const updateConfig = (field, value) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [field]: value }
    }));
  };

  if (loading) {
    return (
      <div className="collection-editor loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  return (
    <div className="collection-editor">
      <div className="form-header">
        <Link to="/collections" className="back-link">
          <span>←</span> 返回专题列表
        </Link>
        <h1 className="form-title">
          <span className="title-icon">❦</span>
          {isEditing ? '编辑专题' : '创建专题'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="collection-form">
        <section className="form-section">
          <h2 className="section-heading">基本信息</h2>

          <div className="form-item">
            <label>专题类型</label>
            <div className="type-options">
              {TYPE_OPTIONS.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`type-option ${formData.type === type.value ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                >
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-label">{type.label}</span>
                  <span className="type-desc">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-item">
            <label>专题标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="如：爷爷的一生、2008年北京奥运会、毕业十周年聚会"
              required
            />
          </div>

          <div className="form-item">
            <label>封面图片</label>
            <div className="cover-upload-area">
              {formData.coverImage ? (
                <div className="cover-preview">
                  <img src={formData.coverImage} alt="封面预览" />
                  <button
                    type="button"
                    className="remove-cover"
                    onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                  >
                    移除
                  </button>
                </div>
              ) : (
                <label className="cover-upload-btn">
                  <span className="upload-icon">✦</span>
                  <span className="upload-text">
                    {uploading ? '上传中...' : '点击上传封面图片'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    hidden
                  />
                </label>
              )}
            </div>
          </div>

          <div className="form-item">
            <label>专题描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="记录这个专题的背景、意义、故事等..."
              rows={4}
            />
          </div>

          <div className="form-item">
            <label>标签</label>
            <div className="tags-input-wrapper">
              <div className="tags-list">
                {formData.tags.map((tag, idx) => (
                  <span key={idx} className="tag-item">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => removeTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="tag-input-group">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag(e)}
                  placeholder="输入标签后按回车添加"
                />
                <button type="button" className="add-tag-btn" onClick={addTag}>
                  添加
                </button>
              </div>
            </div>
          </div>

          <div className="form-item">
            <label>展示布局</label>
            <div className="layout-options">
              <button
                type="button"
                className={`layout-option ${formData.config.layout === 'grid' ? 'selected' : ''}`}
                onClick={() => updateConfig('layout', 'grid')}
              >
                <span className="layout-icon">⊞</span>
                <span className="layout-label">网格布局</span>
              </button>
              <button
                type="button"
                className={`layout-option ${formData.config.layout === 'list' ? 'selected' : ''}`}
                onClick={() => updateConfig('layout', 'list')}
              >
                <span className="layout-icon">☰</span>
                <span className="layout-label">列表布局</span>
              </button>
              <button
                type="button"
                className={`layout-option ${formData.config.layout === 'timeline' ? 'selected' : ''}`}
                onClick={() => updateConfig('layout', 'timeline')}
              >
                <span className="layout-icon">⌛</span>
                <span className="layout-label">时间轴</span>
              </button>
            </div>
          </div>

          <div className="form-item">
            <label>排序方式</label>
            <div className="sort-options">
              <button
                type="button"
                className={`sort-option ${formData.config.sortBy === 'date' ? 'selected' : ''}`}
                onClick={() => updateConfig('sortBy', 'date')}
              >
                按时间排序
              </button>
              <button
                type="button"
                className={`sort-option ${formData.config.sortBy === 'name' ? 'selected' : ''}`}
                onClick={() => updateConfig('sortBy', 'name')}
              >
                按名称排序
              </button>
              <button
                type="button"
                className={`sort-option ${formData.config.sortBy === 'custom' ? 'selected' : ''}`}
                onClick={() => updateConfig('sortBy', 'custom')}
              >
                自定义排序
              </button>
            </div>
          </div>
        </section>

        {formData.type === 'person' && (
          <section className="form-section">
            <h2 className="section-heading">
              <span className="heading-icon">❋</span>
              人物信息
            </h2>

            <div className="form-row">
              <div className="form-item">
                <label>姓名</label>
                <input
                  type="text"
                  value={formData.personInfo.name}
                  onChange={e => updatePersonInfo('name', e.target.value)}
                  placeholder="如：张爷爷"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-item">
                <label>出生日期</label>
                <input
                  type="date"
                  value={formData.personInfo.birthDate}
                  onChange={e => updatePersonInfo('birthDate', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>纪念日期</label>
                <input
                  type="date"
                  value={formData.personInfo.deathDate}
                  onChange={e => updatePersonInfo('deathDate', e.target.value)}
                />
              </div>
            </div>

            <div className="form-item">
              <label>生平简介</label>
              <textarea
                value={formData.personInfo.biography}
                onChange={e => updatePersonInfo('biography', e.target.value)}
                placeholder="简要介绍人物生平..."
                rows={3}
              />
            </div>
          </section>
        )}

        {formData.type === 'event' && (
          <section className="form-section">
            <h2 className="section-heading">
              <span className="heading-icon">✦</span>
              事件信息
            </h2>

            <div className="form-row">
              <div className="form-item">
                <label>事件名称</label>
                <input
                  type="text"
                  value={formData.eventInfo.name}
                  onChange={e => updateEventInfo('name', e.target.value)}
                  placeholder="如：2008年北京奥运会"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-item">
                <label>发生日期</label>
                <input
                  type="date"
                  value={formData.eventInfo.date}
                  onChange={e => updateEventInfo('date', e.target.value)}
                />
              </div>
              <div className="form-item">
                <label>发生地点</label>
                <input
                  type="text"
                  value={formData.eventInfo.location}
                  onChange={e => updateEventInfo('location', e.target.value)}
                  placeholder="如：北京"
                />
              </div>
            </div>

            <div className="form-item">
              <label>事件概述</label>
              <textarea
                value={formData.eventInfo.summary}
                onChange={e => updateEventInfo('summary', e.target.value)}
                placeholder="简要描述事件背景和意义..."
                rows={3}
              />
            </div>
          </section>
        )}

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

        <div className="form-actions">
          <Link to="/collections" className="btn-cancel">取消</Link>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? '保存中...' : (isEditing ? '保存修改' : '创建专题')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CollectionEditor;
