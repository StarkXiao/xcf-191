import React, { useState, useEffect, useRef } from 'react';
import { memorialRitualApi, opsApi } from '../services/api.js';
import './RitualMessageWall.scss';

const EMOJIS = ['🕯️', '💐', '🙏', '❤️', '✨', '🌸', '🕊️', '⭐', '🌙', '💫'];

const AVATAR_BG = [
  'linear-gradient(135deg, #f4a460, #daa520)',
  'linear-gradient(135deg, #87ceeb, #4682b4)',
  'linear-gradient(135deg, #dda0dd, #9370db)',
  'linear-gradient(135deg, #98fb98, #3cb371)',
  'linear-gradient(135deg, #ffb6c1, #db7093)',
  'linear-gradient(135deg, #f0e68c, #daa520)',
  'linear-gradient(135deg, #b0c4de, #708090)',
  'linear-gradient(135deg, #e6e6fa, #9370db)'
];

function RitualMessageWall({ ritualId }) {
  const [messages, setMessages] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitNotice, setSubmitNotice] = useState(null);
  const listRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [ritualId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMessages = async () => {
    try {
      const data = await memorialRitualApi.listMessages(ritualId);
      setMessages(data);
    } catch (err) {
      console.error('加载留言失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalContent = selectedEmoji ? `${selectedEmoji} ${content.trim()}` : content.trim();
    if (!finalContent) {
      return;
    }
    setSubmitting(true);
    setSubmitNotice(null);
    try {
      const result = await memorialRitualApi.addMessage(ritualId, {
        author: author.trim() || '匿名访客',
        content: finalContent,
        avatar: selectedEmoji
      });
      setAuthor('');
      setContent('');
      setSelectedEmoji('');
      if (result.sensitiveWords && result.sensitiveWords.length > 0) {
        setSubmitNotice({
          type: 'sensitive',
          message: `祝福已提交，但包含敏感词（${result.sensitiveWords.map(s => s.word).join('、')}），需审核通过后才会展示`
        });
      } else {
        setSubmitNotice({
          type: 'pending',
          message: '祝福已提交，需审核通过后才会展示'
        });
      }
      loadMessages();
    } catch (err) {
      console.error('留言失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    try {
      await memorialRitualApi.removeMessage(ritualId, id);
      loadMessages();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const getAvatarBg = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
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
    if (days < 7) return `${days}天前`;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="ritual-message-wall">
      <div className="wall-header">
        <h3 className="wall-title">
          <span className="wall-icon">💐</span>
          留言祝福墙
        </h3>
        <span className="wall-count">{messages.length} 条祝福</span>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="form-row-top">
          <input
            type="text"
            className="author-input"
            placeholder="你的名字"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={16}
          />
          <div className="emoji-wrapper" ref={emojiPickerRef}>
            <button
              type="button"
              className={`emoji-trigger ${selectedEmoji ? 'has-emoji' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {selectedEmoji || '😊'}
            </button>
            {showEmojiPicker && (
              <div className="emoji-picker">
                <div className="emoji-picker-title">选择心情</div>
                <div className="emoji-grid">
                  {EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`emoji-item ${selectedEmoji === emoji ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {selectedEmoji && (
                  <button
                    type="button"
                    className="emoji-clear"
                    onClick={() => setSelectedEmoji('')}
                  >
                    清除选择
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="form-row-content">
          <textarea
            className="content-input"
            placeholder="写下你的祝福或思念..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
            rows={3}
          />
        </div>
        <div className="form-row-bottom">
          <span className="char-count">{content.length}/300</span>
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting || (!content.trim() && !selectedEmoji)}
          >
            {submitting ? '发送中...' : '🕯️ 送上祝福'}
          </button>
        </div>

        {submitNotice && (
          <div className={`ritual-submit-notice ${submitNotice.type}`}>
            {submitNotice.type === 'sensitive' ? '⚠️' : '🕐'} {submitNotice.message}
            <button className="notice-close" onClick={() => setSubmitNotice(null)}>×</button>
          </div>
        )}
      </form>

      <div className="messages-list" ref={listRef}>
        {loading ? (
          <div className="list-loading">
            <div className="mini-spinner"></div>
            <span>加载中...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="list-empty">
            <div className="empty-illustration">
              <span className="empty-flower">🌸</span>
            </div>
            <p>还没有祝福留言</p>
            <p className="empty-hint">留下第一条，传递温暖</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="message-item">
              <div
                className="msg-avatar"
                style={{ background: getAvatarBg(msg.author) }}
              >
                {msg.avatar || msg.author.charAt(0)}
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-author">{msg.author}</span>
                  {msg.reviewStatus === 'pending' && (
                    <span className="msg-review-tag pending">待审核</span>
                  )}
                  {msg.reviewStatus === 'rejected' && (
                    <span className="msg-review-tag rejected">已拒绝</span>
                  )}
                  {msg.sensitiveWords && msg.sensitiveWords.length > 0 && (
                    <span className="msg-sensitive-tag" title={msg.sensitiveWords.map(s => s.word).join(', ')}>⚠️</span>
                  )}
                  <span className="msg-time">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="msg-text">{msg.content}</p>
              </div>
              <button
                className="msg-delete"
                onClick={() => handleDelete(msg.id)}
                title="删除留言"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RitualMessageWall;
