import React, { useState, useEffect } from 'react';
import { messageApi, exhibitionApi } from '../services/api.js';
import './MessageBoard.scss';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', desc: '所有人可见' },
  { value: 'groups', label: '指定分组', desc: '仅选定分组可见' },
  { value: 'private', label: '私密', desc: '仅自己和管理员可见' }
];

const getVisitorSessionId = (exhibitionId) => {
  const key = `visitor_session_${exhibitionId}`;
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

const getStoredVisitorGroup = (exhibitionId) => {
  const key = `visitor_group_${exhibitionId}`;
  return localStorage.getItem(key) || '';
};

const setStoredVisitorGroup = (exhibitionId, groupId) => {
  const key = `visitor_group_${exhibitionId}`;
  if (groupId) {
    localStorage.setItem(key, groupId);
  } else {
    localStorage.removeItem(key);
  }
};

function MessageBoard({ exhibitionId, isAdmin = false }) {
  const [messages, setMessages] = useState([]);
  const [visitorGroups, setVisitorGroups] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [visitorGroupId, setVisitorGroupId] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [visibleGroupIds, setVisibleGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const visitorSessionId = getVisitorSessionId(exhibitionId);

  useEffect(() => {
    loadAll();
  }, [exhibitionId]);

  useEffect(() => {
    const stored = getStoredVisitorGroup(exhibitionId);
    setVisitorGroupId(stored);
  }, [exhibitionId]);

  const loadAll = async () => {
    try {
      const [groups, msgs] = await Promise.all([
        exhibitionApi.getVisitorGroups(exhibitionId),
        loadMessagesData()
      ]);
      setVisitorGroups(groups);
      setMessages(msgs);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesData = async () => {
    const currentGroupId = getStoredVisitorGroup(exhibitionId);
    const data = await messageApi.list(exhibitionId, currentGroupId || undefined, isAdmin);
    return data;
  };

  const loadMessages = async () => {
    try {
      const data = await loadMessagesData();
      setMessages(data);
    } catch (err) {
      console.error('加载留言失败:', err);
    }
  };

  const handleVisitorGroupChange = (groupId) => {
    setVisitorGroupId(groupId);
    setStoredVisitorGroup(exhibitionId, groupId);
    loadMessages();
  };

  const handleVisibilityChange = (value) => {
    setVisibility(value);
    if (value !== 'groups') {
      setVisibleGroupIds([]);
    }
  };

  const toggleVisibleGroup = (groupId) => {
    setVisibleGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      }
      return [...prev, groupId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('请输入留言内容');
      return;
    }
    if (visibility === 'groups' && visibleGroupIds.length === 0) {
      alert('请选择至少一个可见分组');
      return;
    }
    setSubmitting(true);
    try {
      await messageApi.create({
        exhibitionId,
        author: author.trim() || '匿名访客',
        content: content.trim(),
        visibility,
        visibleGroupIds: visibility === 'groups' ? visibleGroupIds : [],
        visitorGroupId: visitorGroupId || null,
        visitorSessionId
      });
      setAuthor('');
      setContent('');
      setVisibility('public');
      setVisibleGroupIds([]);
      loadMessages();
    } catch (err) {
      console.error('留言失败:', err);
      alert('留言失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    try {
      await messageApi.remove(id);
      loadMessages();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getVisitorGroupById = (groupId) => {
    return visitorGroups.find(g => g.id === groupId);
  };

  const getAvatarColor = (name, groupColor) => {
    if (groupColor) return groupColor;
    const avatarColors = ['#F4A460', '#87CEEB', '#DDA0DD', '#98FB98', '#F0E68C', '#B0C4DE'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const getVisibilityLabel = (msg) => {
    const v = msg.visibility || 'public';
    if (v === 'public') return '公开';
    if (v === 'private') return '私密';
    if (v === 'groups') return '分组可见';
    return '公开';
  };

  return (
    <div className="message-board">
      <div className="board-header">
        <p className="board-hint">留下你的话语，让思念被看见</p>
      </div>

      <div className="visitor-identity-bar">
        <span className="identity-label">我的身份：</span>
        <select
          className="identity-select"
          value={visitorGroupId}
          onChange={(e) => handleVisitorGroupChange(e.target.value)}
        >
          <option value="">选择身份分组</option>
          {visitorGroups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="form-row form-row-inline">
          <div className="form-field">
            <label className="field-label-sm">你的名字</label>
            <input
              type="text"
              className="author-input"
              placeholder="可选，匿名访客"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="form-field">
            <label className="field-label-sm">访客身份</label>
            <select
              className="group-select"
              value={visitorGroupId}
              onChange={(e) => setVisitorGroupId(e.target.value)}
            >
              <option value="">未选择</option>
              {visitorGroups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label className="field-label-sm">留言内容</label>
          <textarea
            className="content-textarea"
            placeholder="写下你想说的话..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={4}
          />
        </div>

        <div className="form-row">
          <label className="field-label-sm">可见范围</label>
          <div className="visibility-options">
            {VISIBILITY_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`visibility-option ${visibility === opt.value ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => handleVisibilityChange(opt.value)}
                />
                <div className="visibility-info">
                  <span className="visibility-name">{opt.label}</span>
                  <span className="visibility-desc">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {visibility === 'groups' && (
          <div className="form-row">
            <label className="field-label-sm">选择可见分组</label>
            <div className="group-checkboxes">
              {visitorGroups.map(group => (
                <label
                  key={group.id}
                  className={`group-checkbox ${visibleGroupIds.includes(group.id) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleGroupIds.includes(group.id)}
                    onChange={() => toggleVisibleGroup(group.id)}
                  />
                  <span
                    className="group-color-dot"
                    style={{ backgroundColor: group.color }}
                  ></span>
                  <span className="group-name">{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <span className="char-count">{content.length}/500</span>
          <button type="submit" className="submit-btn" disabled={submitting || !content.trim()}>
            {submitting ? '发送中...' : '发送留言'}
          </button>
        </div>
      </form>

      <div className="messages-list">
        <div className="list-header">
          <span>全部留言</span>
          <span className="list-count">{messages.length}</span>
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="loading-spinner"></div>
            <span className="loading-text">加载中...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✉</div>
            <p>还没有留言，留下第一条吧</p>
          </div>
        ) : (
          messages.map(msg => {
            const group = getVisitorGroupById(msg.visitorGroupId);
            return (
              <div key={msg.id} className="message-item">
                <div
                  className="msg-avatar"
                  style={{ backgroundColor: getAvatarColor(msg.author, group?.color) }}
                >
                  {msg.author.charAt(0)}
                </div>
                <div className="msg-content">
                  <div className="msg-header">
                    <span className="msg-author">{msg.author}</span>
                    {group && (
                      <span
                        className="msg-group-tag"
                        style={{ backgroundColor: group.color + '30', color: group.color }}
                      >
                        {group.name}
                      </span>
                    )}
                    <span className="msg-visibility-tag">{getVisibilityLabel(msg)}</span>
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="msg-text">{msg.content}</p>
                </div>
                <button className="msg-delete" onClick={() => handleDelete(msg.id)} title="删除">×</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MessageBoard;
