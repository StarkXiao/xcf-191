import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveProgress, removeProgress, getProgress } from '../services/playbackProgress.js';
import './MaterialManager.scss';

const PROGRESS_SOURCE = 'material';

function MaterialManager({ exhibitionId, materials, timelines, onMaterialsChange, fileApi, materialApi }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textModal, setTextModal] = useState(false);
  const [textForm, setTextForm] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const mediaRefs = useRef({});

  const [filters, setFilters] = useState({
    type: [],
    timelineNodeId: '',
    startDate: '',
    endDate: '',
    keyword: ''
  });
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setFilteredMaterials(materials);
  }, [materials]);

  useEffect(() => {
    fetchFilteredMaterials();
  }, [filters, exhibitionId]);

  useEffect(() => {
    return () => {
      Object.entries(mediaRefs.current).forEach(([matId, el]) => {
        if (el && el.currentTime > 0 && el.duration > 0) {
          saveProgress(PROGRESS_SOURCE, matId, el.currentTime, el.duration);
        }
      });
    };
  }, []);

  const fetchFilteredMaterials = async () => {
    try {
      const params = {};
      if (filters.type.length > 0) {
        params.type = filters.type.join(',');
      }
      if (filters.timelineNodeId) {
        params.timelineNodeId = filters.timelineNodeId;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }
      if (filters.keyword) {
        params.keyword = filters.keyword;
      }
      const data = await materialApi.list(exhibitionId, params);
      setFilteredMaterials(data);
    } catch (err) {
      console.error('筛选素材失败:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeToggle = (type) => {
    setFilters(prev => {
      const newTypes = prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type];
      return { ...prev, type: newTypes };
    });
  };

  const resetFilters = () => {
    setFilters({
      type: [],
      timelineNodeId: '',
      startDate: '',
      endDate: '',
      keyword: ''
    });
  };

  const hasActiveFilters = filters.type.length > 0 ||
    filters.timelineNodeId ||
    filters.startDate ||
    filters.endDate ||
    filters.keyword;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await fileApi.upload(files, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      for (const file of res.files) {
        const typeMap = { images: 'image', audios: 'audio', videos: 'video' };
        await materialApi.create({
          exhibitionId,
          type: typeMap[file.type] || 'other',
          url: file.url,
          title: file.filename
        });
      }
      const updated = await materialApi.list(exhibitionId);
      onMaterialsChange(updated);
      fetchFilteredMaterials();
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
    e.target.value = '';
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textForm.content.trim()) return;
    try {
      await materialApi.create({
        exhibitionId,
        type: 'text',
        title: textForm.title || '文字回忆',
        description: textForm.content
      });
      const updated = await materialApi.list(exhibitionId);
      onMaterialsChange(updated);
      fetchFilteredMaterials();
      setTextModal(false);
      setTextForm({ title: '', content: '' });
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个素材吗？')) return;
    try {
      const el = mediaRefs.current[id];
      if (el && el.currentTime > 0) {
        removeProgress(PROGRESS_SOURCE, id);
      }
      delete mediaRefs.current[id];
      await materialApi.remove(id);
      const updated = await materialApi.list(exhibitionId);
      onMaterialsChange(updated);
      fetchFilteredMaterials();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({ title: m.title || '', description: m.description || '' });
  };

  const saveEdit = async (id) => {
    try {
      await materialApi.update(id, editForm);
      const updated = await materialApi.list(exhibitionId);
      onMaterialsChange(updated);
      fetchFilteredMaterials();
      setEditingId(null);
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const getLinkedNodes = (matId) => {
    if (!timelines) return [];
    return timelines.filter(t => (t.materialIds || []).includes(matId));
  };

  const handleMediaTimeUpdate = useCallback((matId) => (e) => {
    const el = e.target;
    if (el.currentTime > 0 && el.duration > 0) {
      saveProgress(PROGRESS_SOURCE, matId, el.currentTime, el.duration);
    }
  }, []);

  const handleMediaEnded = useCallback((matId) => () => {
    removeProgress(PROGRESS_SOURCE, matId);
  }, []);

  const handleMediaRef = useCallback((matId) => (el) => {
    if (el) {
      mediaRefs.current[matId] = el;
      const saved = getProgress(PROGRESS_SOURCE, matId);
      if (saved && saved.currentTime > 0) {
        el.currentTime = saved.currentTime;
      }
    }
  }, []);

  const renderMaterialItem = (m) => {
    const isEditing = editingId === m.id;
    const linkedNodes = getLinkedNodes(m.id);

    return (
      <div key={m.id} className="material-card">
        <div className="material-preview">
          {m.type === 'image' && <img src={m.url} alt={m.title} />}
          {m.type === 'audio' && (
            <div className="audio-preview">
              <span className="audio-icon">♪</span>
              <audio
                ref={handleMediaRef(m.id)}
                src={m.url}
                controls
                onTimeUpdate={handleMediaTimeUpdate(m.id)}
                onEnded={handleMediaEnded(m.id)}
              />
            </div>
          )}
          {m.type === 'video' && (
            <video
              ref={handleMediaRef(m.id)}
              src={m.url}
              controls
              className="video-preview"
              onTimeUpdate={handleMediaTimeUpdate(m.id)}
              onEnded={handleMediaEnded(m.id)}
            />
          )}
          {m.type === 'text' && (
            <div className="text-preview">
              <span className="text-icon">✎</span>
              <p>{m.description?.substring(0, 60) || '文字回忆'}</p>
            </div>
          )}
        </div>

        <div className="material-body">
          {isEditing ? (
            <div className="edit-form">
              <input
                type="text"
                placeholder="标题"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <textarea
                placeholder="描述/内容"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <div className="edit-actions">
                <button onClick={() => saveEdit(m.id)}>保存</button>
                <button onClick={() => setEditingId(null)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="material-title">{m.title || '未命名素材'}</h4>
              {m.type === 'text' && m.description && (
                <p className="material-desc">{m.description}</p>
              )}
              {linkedNodes.length > 0 && (
                <div className="material-linked-nodes">
                  {linkedNodes.map(node => (
                    <span key={node.id} className="linked-node-tag">
                      ⌛ {node.title}
                    </span>
                  ))}
                </div>
              )}
              <div className="material-meta">
                <span className="material-date">
                  {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="material-actions">
                <button onClick={() => startEdit(m)}>编辑</button>
                <button className="danger" onClick={() => handleDelete(m.id)}>删除</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const filtered = {
    all: filteredMaterials,
    image: filteredMaterials.filter(m => m.type === 'image'),
    audio: filteredMaterials.filter(m => m.type === 'audio'),
    text: filteredMaterials.filter(m => m.type === 'text'),
    video: filteredMaterials.filter(m => m.type === 'video')
  };

  const typeOptions = [
    { value: 'image', label: '📷 照片' },
    { value: 'audio', label: '🎵 语音' },
    { value: 'video', label: '🎬 视频' },
    { value: 'text', label: '✎ 文字' }
  ];

  return (
    <div className="material-manager">
      <div className="manager-header">
        <div className="upload-group">
          <label className="upload-btn">
            <input type="file" accept="image/*" multiple onChange={handleFileUpload} hidden />
            <span>📷 上传照片</span>
          </label>
          <label className="upload-btn">
            <input type="file" accept="audio/*" multiple onChange={handleFileUpload} hidden />
            <span>🎵 上传语音</span>
          </label>
          <label className="upload-btn">
            <input type="file" accept="video/*" multiple onChange={handleFileUpload} hidden />
            <span>🎬 上传视频</span>
          </label>
          <button className="upload-btn" onClick={() => setTextModal(true)}>
            ✎ 添加文字
          </button>
        </div>
        <div className="header-actions">
          <button
            className={`filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 筛选 {hasActiveFilters && <span className="filter-badge">{filters.type.length + (filters.timelineNodeId ? 1 : 0) + (filters.startDate || filters.endDate ? 1 : 0) + (filters.keyword ? 1 : 0)}</span>}
          </button>
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <span className="progress-text">上传中 {uploadProgress}%</span>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-section">
            <label className="filter-label">类型</label>
            <div className="filter-options">
              {typeOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`filter-chip ${filters.type.includes(opt.value) ? 'active' : ''}`}
                  onClick={() => handleTypeToggle(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">时间节点</label>
            <select
              className="filter-select"
              value={filters.timelineNodeId}
              onChange={(e) => handleFilterChange('timelineNodeId', e.target.value)}
            >
              <option value="">全部时间节点</option>
              {timelines && timelines.map(node => (
                <option key={node.id} value={node.id}>
                {node.title}
              </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">上传时间</label>
            <div className="date-range">
              <input
                type="date"
                className="filter-input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="开始日期"
              />
              <span className="date-separator">至</span>
              <input
                type="date"
                className="filter-input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="结束日期"
              />
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">关键词</label>
            <input
              type="text"
              className="filter-input"
              placeholder="搜索标题或描述..."
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <button className="reset-btn" onClick={resetFilters}>
              重置筛选
            </button>
            <span className="filter-result-count">
              共 {filteredMaterials.length} 个素材
            </span>
          </div>
        </div>
      )}

      {['image', 'audio', 'text', 'video'].map(type => (
        filtered[type].length > 0 && (
          <div key={type} className="material-group">
            <h3 className="group-title">
              {type === 'image' && '📷 照片'}
              {type === 'audio' && '🎵 语音'}
              {type === 'text' && '✎ 文字'}
              {type === 'video' && '🎬 视频'}
              <span className="group-count">{filtered[type].length}</span>
            </h3>
            <div className="material-grid">{filtered[type].map(renderMaterialItem)}</div>
          </div>
        )
      ))}

      {filteredMaterials.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">❋</div>
          {hasActiveFilters ? (
            <p>没有找到符合条件的素材，试试调整筛选条件</p>
          ) : (
            <p>还没有素材，上传照片、语音或添加文字来开始</p>
          )}
          {hasActiveFilters && (
            <button className="reset-btn" onClick={resetFilters}>清除筛选</button>
          )}
        </div>
      )}

      {textModal && (
        <div className="modal-overlay" onClick={() => setTextModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">添加文字回忆</h3>
            <form onSubmit={handleTextSubmit}>
              <input
                type="text"
                placeholder="标题（可选）"
                value={textForm.title}
                onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                maxLength={50}
              />
              <textarea
                placeholder="写下你想珍藏的文字..."
                value={textForm.content}
                onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                maxLength={2000}
                rows={6}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setTextModal(false)}>取消</button>
                <button type="submit" className="primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialManager;
