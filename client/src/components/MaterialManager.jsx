import React, { useState } from 'react';
import './MaterialManager.scss';

function MaterialManager({ exhibitionId, materials, onMaterialsChange, fileApi, materialApi }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textModal, setTextModal] = useState(false);
  const [textForm, setTextForm] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

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
      setTextModal(false);
      setTextForm({ title: '', content: '' });
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个素材吗？')) return;
    try {
      await materialApi.remove(id);
      const updated = await materialApi.list(exhibitionId);
      onMaterialsChange(updated);
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
      setEditingId(null);
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const renderMaterialItem = (m) => {
    const isEditing = editingId === m.id;

    return (
      <div key={m.id} className="material-card">
        <div className="material-preview">
          {m.type === 'image' && <img src={m.url} alt={m.title} />}
          {m.type === 'audio' && (
            <div className="audio-preview">
              <span className="audio-icon">♪</span>
              <audio src={m.url} controls />
            </div>
          )}
          {m.type === 'video' && (
            <video src={m.url} controls className="video-preview" />
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
    all: materials,
    image: materials.filter(m => m.type === 'image'),
    audio: materials.filter(m => m.type === 'audio'),
    text: materials.filter(m => m.type === 'text'),
    video: materials.filter(m => m.type === 'video')
  };

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
          <button className="upload-btn" onClick={() => setTextModal(true)}>
            ✎ 添加文字
          </button>
        </div>
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span className="progress-text">上传中 {uploadProgress}%</span>
          </div>
        )}
      </div>

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

      {materials.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">❋</div>
          <p>还没有素材，上传照片、语音或添加文字来开始</p>
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
