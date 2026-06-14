import React, { useState } from 'react';
import './TimelineEditor.scss';

function TimelineEditor({ exhibitionId, materials, timelines, onTimelinesChange, timelineApi }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    materialIds: []
  });

  const openModal = (item = null) => {
    if (item) {
      setEditing(item);
      setForm({
        title: item.title,
        description: item.description,
        eventDate: item.eventDate.split('T')[0],
        materialIds: [...(item.materialIds || [])]
      });
    } else {
      setEditing(null);
      setForm({
        title: '',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
        materialIds: []
      });
    }
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
  };

  const toggleMaterial = (id) => {
    setForm(prev => ({
      ...prev,
      materialIds: prev.materialIds.includes(id)
        ? prev.materialIds.filter(m => m !== id)
        : [...prev.materialIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('请输入标题');
      return;
    }
    try {
      if (editing) {
        await timelineApi.update(editing.id, {
          ...form,
          eventDate: new Date(form.eventDate).toISOString()
        });
      } else {
        await timelineApi.create({
          exhibitionId,
          ...form,
          eventDate: new Date(form.eventDate).toISOString()
        });
      }
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
      closeModal();
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个时间节点吗？')) return;
    try {
      await timelineApi.remove(id);
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const getMaterialById = (id) => materials.find(m => m.id === id);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const renderMaterialThumb = (mat) => {
    if (!mat) return null;
    if (mat.type === 'image') {
      return <img src={mat.url} alt={mat.title} />;
    }
    if (mat.type === 'audio') {
      return <span className="mat-thumb-icon">🎵</span>;
    }
    if (mat.type === 'text') {
      return <span className="mat-thumb-icon">✎</span>;
    }
    if (mat.type === 'video') {
      return <span className="mat-thumb-icon">🎬</span>;
    }
    return null;
  };

  return (
    <div className="timeline-editor">
      <div className="editor-header">
        <p className="editor-hint">按时间顺序整理你的回忆，创建属于你的故事线</p>
        <button className="add-btn" onClick={() => openModal()}>
          <span>+</span> 添加时间节点
        </button>
      </div>

      {timelines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⌛</div>
          <p>还没有时间节点，点击上方按钮添加第一个回忆瞬间</p>
        </div>
      ) : (
        <div className="timeline">
          <div className="timeline-line"></div>
          {timelines.map((node, idx) => {
            const nodeMats = (node.materialIds || []).map(getMaterialById).filter(Boolean);
            return (
              <div key={node.id} className={`timeline-node ${idx % 2 === 0 ? 'left' : 'right'}`}>
                <div className="node-dot"></div>
                <div className="node-card">
                  <div className="node-date">{formatDate(node.eventDate)}</div>
                  <h3 className="node-title">{node.title}</h3>
                  {node.description && <p className="node-desc">{node.description}</p>}
                  {nodeMats.length > 0 && (
                    <div className="node-materials">
                      {nodeMats.map(mat => (
                        <div key={mat.id} className="node-mat-thumb">
                          {renderMaterialThumb(mat)}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="node-actions">
                    <button onClick={() => openModal(node)}>编辑</button>
                    <button className="danger" onClick={() => handleDelete(node.id)}>删除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editing ? '编辑时间节点' : '添加时间节点'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>事件日期</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <label>标题 *</label>
                <input
                  type="text"
                  placeholder="这个时刻的标题"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-row">
                <label>描述</label>
                <textarea
                  placeholder="描述这个特别的时刻..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <div className="form-row">
                <label>关联素材</label>
                {materials.length === 0 ? (
                  <p className="hint-text">暂无素材，先去素材管理添加一些吧</p>
                ) : (
                  <div className="material-selector">
                    {materials.map(mat => (
                      <div
                        key={mat.id}
                        className={`mat-select-item ${form.materialIds.includes(mat.id) ? 'selected' : ''}`}
                        onClick={() => toggleMaterial(mat.id)}
                      >
                        <div className="mat-select-thumb">{renderMaterialThumb(mat)}</div>
                        <div className="mat-select-info">
                          <div className="mat-select-title">{mat.title || '未命名'}</div>
                          <div className="mat-select-type">
                            {mat.type === 'image' && '图片'}
                            {mat.type === 'audio' && '语音'}
                            {mat.type === 'text' && '文字'}
                            {mat.type === 'video' && '视频'}
                          </div>
                        </div>
                        <div className="mat-check">{form.materialIds.includes(mat.id) ? '✓' : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>取消</button>
                <button type="submit" className="primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimelineEditor;
