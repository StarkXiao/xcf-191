import React, { useState, useEffect } from 'react';
import { exhibitionApi } from '../services/api.js';
import './VisitorGroupManager.scss';

const DEFAULT_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#95A5A6'
];

function VisitorGroupManager({ exhibitionId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [exhibitionId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await exhibitionApi.getVisitorGroups(exhibitionId);
      setGroups(data);
    } catch (err) {
      console.error('加载访客分组失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormName('');
    setFormColor(DEFAULT_COLORS[groups.length % DEFAULT_COLORS.length]);
    setShowAddForm(true);
    setEditingId(null);
  };

  const handleEdit = (group) => {
    setFormName(group.name);
    setFormColor(group.color);
    setEditingId(group.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('请输入分组名称');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await exhibitionApi.updateVisitorGroup(exhibitionId, editingId, {
          name: formName.trim(),
          color: formColor
        });
      } else {
        await exhibitionApi.addVisitorGroup(exhibitionId, {
          name: formName.trim(),
          color: formColor
        });
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormName('');
      loadGroups();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (groupId) => {
    if (!confirm('确定要删除这个分组吗？相关留言中的分组信息将被清除。')) return;
    try {
      await exhibitionApi.removeVisitorGroup(exhibitionId, groupId);
      loadGroups();
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="visitor-group-manager">
        <div className="loading-wrap">
          <div className="loading-spinner"></div>
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-group-manager">
      <div className="manager-header">
        <h3 className="manager-title">访客身份分组</h3>
        <p className="manager-desc">管理展厅的访客身份分组，用于留言可见范围控制</p>
        <button className="add-group-btn" onClick={handleAdd}>
          <span className="btn-icon">+</span>
          添加分组
        </button>
      </div>

      {showAddForm && (
        <form className="group-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="field-label">
              {editingId ? '编辑分组' : '新建分组'}
            </label>
            <div className="form-fields-inline">
              <input
                type="text"
                className="name-input"
                placeholder="分组名称"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <div className="color-picker">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
              <div
                className="color-preview"
                style={{ backgroundColor: formColor }}
              >
                {formName.charAt(0) || '?'}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !formName.trim()}>
              {submitting ? '保存中...' : (editingId ? '保存修改' : '创建分组')}
            </button>
          </div>
        </form>
      )}

      <div className="groups-list">
        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>还没有访客分组，点击上方按钮添加</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="group-item">
              <div
                className="group-avatar"
                style={{ backgroundColor: group.color }}
              >
                {group.name.charAt(0)}
              </div>
              <div className="group-info">
                <span className="group-name">{group.name}</span>
                <span className="group-color-label" style={{ color: group.color }}>
                  ● {group.color}
                </span>
              </div>
              <div className="group-actions">
                <button className="action-btn edit-btn" onClick={() => handleEdit(group)} title="编辑">
                  ✎
                </button>
                <button className="action-btn delete-btn" onClick={() => handleDelete(group.id)} title="删除">
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="tips-section">
        <h4 className="tips-title">💡 使用提示</h4>
        <ul className="tips-list">
          <li>访客可以在留言时选择自己的身份分组</li>
          <li>留言可以设置可见范围：公开、指定分组可见、私密</li>
          <li>私密留言仅留言者和管理员可见</li>
          <li>删除分组会清除相关留言中的分组标记</li>
        </ul>
      </div>
    </div>
  );
}

export default VisitorGroupManager;
