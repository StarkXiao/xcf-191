import React, { useState, useEffect } from 'react';
import { messageApi } from '../services/api.js';
import './MessageBoard.scss';

function MessageBoard({ exhibitionId }) {
  const [messages, setMessages] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [exhibitionId]);

  const loadMessages = async () => {
    try {
      const data = await messageApi.list(exhibitionId);
      setMessages(data);
    } catch (err) {
      console.error('加载留言失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('请输入留言内容');
      return;
    }
    setSubmitting(true);
    try {
      await messageApi.create({
        exhibitionId,
        author: author.trim() || '匿名访客',
        content: content.trim()
      });
      setAuthor('');
      setContent('');
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

  const avatarColors = ['#F4A460', '#87CEEB', '#DDA0DD', '#98FB98', '#F0E68C', '#B0C4DE'];
  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  return (
    <div className="message-board">
      <div className="board-header">
        <p className="board-hint">留下你的话语，让思念被看见</p>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            className="author-input"
            placeholder="你的名字（可选，匿名访客）"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={20}
          />
        </div>
        <div className="form-row">
          <textarea
            className="content-textarea"
            placeholder="写下你想说的话..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={4}
          />
        </div>
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
          messages.map(msg => (
            <div key={msg.id} className="message-item">
              <div
                className="msg-avatar"
                style={{ backgroundColor: getAvatarColor(msg.author) }}
              >
                {msg.author.charAt(0)}
              </div>
              <div className="msg-content">
                <div className="msg-header">
                  <span className="msg-author">{msg.author}</span>
                  <span className="msg-time">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="msg-text">{msg.content}</p>
              </div>
              <button className="msg-delete" onClick={() => handleDelete(msg.id)} title="删除">×</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MessageBoard;
