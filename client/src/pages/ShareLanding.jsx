import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shareApi, messageApi } from '../services/api.js';
import './ShareLanding.scss';

function ShareLanding() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [verified, setVerified] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [code]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shareApi.getByCode(code);
      setPreview(data);

      if (!data.requirePassword && data.isValid) {
        await doVerify('');
      }
    } catch (err) {
      console.error('加载失败:', err);
      if (err.response?.status === 404) {
        setError({
          type: 'notfound',
          message: err.response.data.error || '分享链接不存在'
        });
      } else {
        setError({
          type: 'unknown',
          message: '加载失败，请稍后重试'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const doVerify = async (pwd) => {
    try {
      setPasswordError('');
      const result = await shareApi.verifyCode(code, pwd || undefined);
      if (result.success) {
        setShareData(result);
        setVerified(true);
      }
    } catch (err) {
      console.error('验证失败:', err);
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 404) {
        setError({ type: 'notfound', message: data?.error || '分享链接不存在' });
      } else if (status === 403) {
        setError({
          type: data?.expired ? 'expired' : (data?.disabled ? 'disabled' : 'forbidden'),
          message: data?.error || '无法访问此分享'
        });
      } else if (status === 401) {
        setPasswordError(data?.error || '口令错误');
      }
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('请输入访问口令');
      return;
    }
    doVerify(password);
  };

  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!shareData?.data?.exhibition?.id) return;

    try {
      setSubmitting(true);
      await messageApi.create({
        exhibitionId: shareData.data.exhibition.id,
        content: newMessage.trim(),
        author: newAuthor.trim() || '匿名访客'
      });

      const messages = shareData.data.messages || [];
      messages.push({
        id: Date.now(),
        exhibitionId: shareData.data.exhibition.id,
        content: newMessage.trim(),
        author: newAuthor.trim() || '匿名访客',
        createdAt: new Date().toISOString()
      });
      setShareData({
        ...shareData,
        data: { ...shareData.data, messages }
      });

      setNewMessage('');
      setNewAuthor('');
    } catch (err) {
      console.error('留言失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getWatermarkStyle = () => {
    if (!shareData?.share?.watermark) return {};
    return {
      position: 'relative'
    };
  };

  const renderWatermark = () => {
    if (!shareData?.share?.watermark) return null;
    return (
      <div className="watermark-layer">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="watermark-text">
            {shareData.share.watermark}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="share-landing">
        <div className="landing-stars-bg">
          <div className="stars stars-1"></div>
          <div className="stars stars-2"></div>
          <div className="stars stars-3"></div>
        </div>
        <div className="loading-full">
          <div className="loading-spinner"></div>
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-landing">
        <div className="landing-stars-bg">
          <div className="stars stars-1"></div>
          <div className="stars stars-2"></div>
          <div className="stars stars-3"></div>
        </div>
        <div className="error-container">
          <div className="error-icon">
            {error.type === 'notfound' && '🔍'}
            {error.type === 'expired' && '⏰'}
            {error.type === 'disabled' && '🔒'}
            {error.type === 'forbidden' && '🚫'}
            {error.type === 'unknown' && '⚠️'}
          </div>
          <h2 className="error-title">
            {error.type === 'notfound' && '链接不存在'}
            {error.type === 'expired' && '分享已过期'}
            {error.type === 'disabled' && '分享已被禁用'}
            {error.type === 'forbidden' && '无法访问'}
            {error.type === 'unknown' && '出错了'}
          </h2>
          <p className="error-message">{error.message}</p>
          {error.type === 'expired' && (
            <p className="error-hint">此分享链接的有效期已过，请联系分享者获取新的链接。</p>
          )}
          {error.type === 'disabled' && (
            <p className="error-hint">此分享链接已被所有者禁用。</p>
          )}
        </div>
      </div>
    );
  }

  if (!verified && preview?.requirePassword) {
    return (
      <div className="share-landing">
        <div className="landing-stars-bg">
          <div className="stars stars-1"></div>
          <div className="stars stars-2"></div>
          <div className="stars stars-3"></div>
        </div>
        <div className="password-container">
          <div className="password-card">
            <div className="password-icon-wrap">
              <div className="password-icon">🔐</div>
            </div>

            {preview.exhibition?.coverImage && (
              <div className="password-cover">
                <img src={preview.exhibition.coverImage} alt="" />
                <div className="cover-mask"></div>
              </div>
            )}

            <h2 className="password-title">{preview.exhibition?.title || '加密展厅'}</h2>
            {preview.exhibition?.description && (
              <p className="password-desc">{preview.exhibition.description}</p>
            )}

            <form className="password-form" onSubmit={handlePasswordSubmit}>
              <div className="form-field">
                <input
                  type="text"
                  className={`form-input ${passwordError ? 'has-error' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="请输入访问口令"
                  autoFocus
                />
                {passwordError && <div className="field-error">{passwordError}</div>}
              </div>
              <button type="submit" className="submit-btn">
                <span>解锁展厅</span>
                <span className="submit-arrow">→</span>
              </button>
            </form>

            <p className="password-footer">
              <span>✦</span> 此展厅需要口令才能访问，请向分享者获取
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!verified || !shareData) {
    return null;
  }

  const { share, data } = shareData;
  const { exhibition, materials, timelines, messages } = data;

  return (
    <div className={`share-landing theme-${exhibition.theme || 'default'}`} style={getWatermarkStyle()}>
      <div className="landing-stars-bg">
        <div className="stars stars-1"></div>
        <div className="stars stars-2"></div>
        <div className="stars stars-3"></div>
      </div>
      {renderWatermark()}

      <div className="share-badge">
        <span className="badge-icon">✦</span>
        <span>星屑纪念馆 · 分享展厅</span>
      </div>

      <header className="landing-hero">
        <div className="hero-cover">
          {exhibition.coverImage ? (
            <img src={exhibition.coverImage} alt={exhibition.title} />
          ) : (
            <div className="hero-cover-placeholder"><span>✦</span></div>
          )}
          <div className="hero-mask"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">{share.title || exhibition.title}</h1>
          {exhibition.description && (
            <p className="hero-desc">{exhibition.description}</p>
          )}
          <div className="hero-meta">
            <span className="meta-item"><b>{materials.length}</b> 素材</span>
            {share.allowTimeline && <span className="meta-item"><b>{timelines.length}</b> 时间节点</span>}
            {share.allowMessages && <span className="meta-item"><b>{messages.length}</b> 留言</span>}
            <span className="meta-item">创建于 {formatDate(exhibition.createdAt)}</span>
          </div>
        </div>
      </header>

      <main className="landing-content">
        <section className="materials-section">
          <h3 className="section-title">
            <span className="title-icon">❋</span>
            回忆素材
          </h3>
          {materials.length === 0 ? (
            <div className="section-empty">暂无素材</div>
          ) : (
            <div className="materials-grid">
              {materials.map((m) => (
                <div key={m.id} className="material-card">
                  {m.type === 'image' ? (
                    <div className="material-media">
                      <img src={m.url} alt={m.title || ''} />
                    </div>
                  ) : m.type === 'video' ? (
                    <div className="material-media media-video">
                      <video src={m.url} controls preload="metadata" />
                    </div>
                  ) : m.type === 'audio' ? (
                    <div className="material-media media-audio">
                      <div className="audio-icon">🎵</div>
                      <audio src={m.url} controls />
                    </div>
                  ) : m.type === 'text' ? (
                    <div className="material-media media-text">
                      <p>{m.content}</p>
                    </div>
                  ) : null}
                  <div className="material-info">
                    {m.title && <h4 className="material-title">{m.title}</h4>}
                    {m.description && <p className="material-desc">{m.description}</p>}
                    {share.allowDownload && m.url && (
                      <a
                        href={m.url}
                        download
                        className="download-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ⬇ 下载原文件
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {share.allowTimeline && timelines.length > 0 && (
          <section className="timeline-section">
            <h3 className="section-title">
              <span className="title-icon">⌛</span>
              时间轴
            </h3>
            <div className="timeline-list">
              {timelines
                .sort((a, b) => new Date(a.time) - new Date(b.time))
                .map((t) => (
                  <div key={t.id} className="timeline-node">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-time">{formatDate(t.time)}</div>
                      <h4 className="timeline-title">{t.title}</h4>
                      {t.description && <p className="timeline-desc">{t.description}</p>}
                      {t.mediaUrl && (
                        <div className="timeline-media">
                          {t.mediaType === 'image' && <img src={t.mediaUrl} alt="" />}
                          {t.mediaType === 'video' && <video src={t.mediaUrl} controls />}
                          {t.mediaType === 'audio' && <audio src={t.mediaUrl} controls />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {share.allowMessages && (
          <section className="messages-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="title-icon">✉</span>
                访客留言
              </h3>
              <button
                className="toggle-btn"
                onClick={() => setShowMessages(!showMessages)}
              >
                {showMessages ? '收起' : `展开 (${messages.length})`}
              </button>
            </div>

            <div className="message-form-wrap">
              <form className="message-form" onSubmit={handleSubmitMessage}>
                <input
                  type="text"
                  className="form-input small"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="您的名字（选填）"
                />
                <textarea
                  className="form-textarea"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="写下您想说的话..."
                  rows={3}
                />
                <button
                  type="submit"
                  className="submit-btn small"
                  disabled={submitting || !newMessage.trim()}
                >
                  {submitting ? '发送中...' : '发送留言'}
                </button>
              </form>
            </div>

            {showMessages && (
              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="section-empty">还没有留言，来写下第一条吧</div>
                ) : (
                  messages
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((msg) => (
                      <div key={msg.id} className="message-item">
                        <div className="msg-avatar">
                          {(msg.author || '匿')[0]}
                        </div>
                        <div className="msg-body">
                          <div className="msg-header">
                            <span className="msg-author">{msg.author || '匿名'}</span>
                            <span className="msg-time">{formatDate(msg.createdAt)}</span>
                          </div>
                          <p className="msg-content">{msg.content}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="landing-footer">
        <p>
          <span className="footer-icon">✦</span>
          由星屑纪念馆分享 · 用心珍藏每一段回忆
        </p>
      </footer>
    </div>
  );
}

export default ShareLanding;
