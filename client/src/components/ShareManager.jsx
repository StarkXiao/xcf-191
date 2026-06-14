import React, { useState, useEffect } from 'react';
import { shareApi } from '../services/api.js';
import './ShareManager.scss';

function ShareManager({ exhibitionId, exhibitionTitle }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShare, setEditingShare] = useState(null);
  const [statsShare, setStatsShare] = useState(null);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    password: '',
    expiresAt: '',
    maxViews: '',
    allowDownload: false,
    allowTimeline: true,
    allowMessages: false,
    watermark: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (exhibitionId) {
      loadShares();
    }
  }, [exhibitionId]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await shareApi.list(exhibitionId);
      setShares(data);
    } catch (err) {
      console.error('加载分享列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: exhibitionTitle || '',
      password: '',
      expiresAt: '',
      maxViews: '',
      allowDownload: false,
      allowTimeline: true,
      allowMessages: false,
      watermark: ''
    });
    setFormErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setEditingShare(null);
    setShowCreateModal(true);
  };

  const openEditModal = (share) => {
    setEditingShare(share);
    setFormData({
      title: share.title,
      password: '',
      expiresAt: share.expiresAt ? share.expiresAt.substring(0, 16) : '',
      maxViews: share.maxViews || '',
      allowDownload: share.allowDownload,
      allowTimeline: share.allowTimeline,
      allowMessages: share.allowMessages,
      watermark: share.watermark || ''
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = '请输入分享标题';
    }
    if (formData.password && formData.password.length < 4) {
      errors.password = '口令至少4位字符';
    }
    if (formData.maxViews && (!Number.isInteger(Number(formData.maxViews)) || Number(formData.maxViews) < 1)) {
      errors.maxViews = '请输入有效的正整数';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        ...formData,
        maxViews: formData.maxViews ? Number(formData.maxViews) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        password: formData.password || null
      };

      if (editingShare) {
        const updatePayload = { ...payload };
        if (!formData.password) {
          delete updatePayload.password;
        }
        await shareApi.update(editingShare.id, updatePayload);
      } else {
        await shareApi.create({
          ...payload,
          exhibitionId
        });
      }

      setShowCreateModal(false);
      loadShares();
    } catch (err) {
      console.error('保存失败:', err);
      if (err.response?.data?.error) {
        setFormErrors({ submit: err.response.data.error });
      }
    }
  };

  const handleToggleStatus = async (share) => {
    try {
      if (share.status === 'active') {
        await shareApi.disable(share.id);
      } else {
        await shareApi.enable(share.id);
      }
      loadShares();
    } catch (err) {
      console.error('切换状态失败:', err);
    }
  };

  const handleDelete = async (share) => {
    if (!confirm(`确定要删除分享"${share.title}"吗？相关统计数据将被清除。`)) return;
    try {
      await shareApi.remove(share.id);
      loadShares();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleShowStats = async (share) => {
    try {
      setStatsShare(share);
      setStats(null);
      const data = await shareApi.getStats(share.id);
      setStats(data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const copyShareLink = async (share) => {
    const link = `${window.location.origin}/share/${share.shortCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(share.id);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isExpired = (share) => {
    if (!share.expiresAt) return false;
    return new Date(share.expiresAt) < new Date();
  };

  const getStatusBadge = (share) => {
    if (share.status === 'disabled') {
      return <span className="status-badge status-disabled">已禁用</span>;
    }
    if (isExpired(share)) {
      return <span className="status-badge status-expired">已过期</span>;
    }
    if (share.maxViews && share.viewCount >= share.maxViews) {
      return <span className="status-badge status-maxed">次数用尽</span>;
    }
    return <span className="status-badge status-active">有效</span>;
  };

  const renderStatsChart = () => {
    if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) {
      return <div className="stats-empty">暂无浏览数据</div>;
    }
    const maxCount = Math.max(...stats.dailyStats.map(d => d.count));
    return (
      <div className="stats-chart">
        <div className="chart-bars">
          {stats.dailyStats.map((d) => (
            <div key={d.date} className="chart-bar-item">
              <div
                className="chart-bar"
                style={{ height: `${(d.count / maxCount) * 100}%` }}
                title={`${d.date}: ${d.count}次`}
              >
                <span className="bar-value">{d.count}</span>
              </div>
              <span className="bar-date">{d.date.substring(5)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="share-manager">
      <div className="manager-header">
        <div className="header-info">
          <h3 className="manager-title">
            <span className="title-icon">✉</span>
            公开分享
          </h3>
          <p className="manager-desc">创建分享链接，安全地与他人共享您的展厅</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <span className="btn-icon">+</span>
          创建分享
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="loading-spinner"></div>
          <span className="loading-text">加载中...</span>
        </div>
      ) : shares.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✧</div>
          <p className="empty-text">还没有创建任何分享链接</p>
          <button className="empty-btn" onClick={openCreateModal}>创建第一个分享</button>
        </div>
      ) : (
        <div className="shares-list">
          {shares.map((share) => (
            <div key={share.id} className="share-card">
              <div className="share-card-header">
                <div className="share-title-wrap">
                  <h4 className="share-title">{share.title}</h4>
                  {getStatusBadge(share)}
                </div>
                <div className="share-actions">
                  <button
                    className="action-icon"
                    title="查看统计"
                    onClick={() => handleShowStats(share)}
                  >
                    📊
                  </button>
                  <button
                    className="action-icon"
                    title="编辑"
                    onClick={() => openEditModal(share)}
                  >
                    ✏️
                  </button>
                  <button
                    className="action-icon"
                    title={share.status === 'active' ? '禁用' : '启用'}
                    onClick={() => handleToggleStatus(share)}
                  >
                    {share.status === 'active' ? '🔒' : '🔓'}
                  </button>
                  <button
                    className="action-icon action-danger"
                    title="删除"
                    onClick={() => handleDelete(share)}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="share-card-body">
                <div className="share-link-row">
                  <div className="link-preview">
                    <span className="link-label">分享链接:</span>
                    <code className="link-code">/share/{share.shortCode}</code>
                  </div>
                  <button
                    className={`btn btn-copy ${copySuccess === share.id ? 'copied' : ''}`}
                    onClick={() => copyShareLink(share)}
                  >
                    {copySuccess === share.id ? '✓ 已复制' : '复制链接'}
                  </button>
                </div>

                <div className="share-meta">
                  <div className="meta-item">
                    <span className="meta-icon">👁</span>
                    <span className="meta-label">浏览:</span>
                    <b>{share.viewCount || 0}</b>
                    {share.maxViews && <span className="meta-sub">/ {share.maxViews}</span>}
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">🔑</span>
                    <span className="meta-label">口令:</span>
                    <b>{share.passwordHash ? '已设置' : '无'}</b>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">⏰</span>
                    <span className="meta-label">有效期至:</span>
                    <b>{share.expiresAt ? formatDate(share.expiresAt) : '永久'}</b>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span className="meta-label">创建:</span>
                    <b>{formatDate(share.createdAt)}</b>
                  </div>
                </div>

                <div className="share-permissions">
                  <span className={`perm-tag ${share.allowTimeline ? 'perm-on' : 'perm-off'}`}>
                    {share.allowTimeline ? '✓' : '✗'} 时间轴
                  </span>
                  <span className={`perm-tag ${share.allowMessages ? 'perm-on' : 'perm-off'}`}>
                    {share.allowMessages ? '✓' : '✗'} 留言
                  </span>
                  <span className={`perm-tag ${share.allowDownload ? 'perm-on' : 'perm-off'}`}>
                    {share.allowDownload ? '✓' : '✗'} 下载
                  </span>
                  {share.watermark && <span className="perm-tag perm-on">水印: {share.watermark}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingShare ? '编辑分享' : '创建新分享'}
              </h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">分享标题 *</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.title ? 'has-error' : ''}`}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="为这个分享取一个名字"
                />
                {formErrors.title && <div className="form-error">{formErrors.title}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    访问口令
                    <span className="label-hint">{editingShare ? '留空表示不修改' : '留空表示无口令'}</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${formErrors.password ? 'has-error' : ''}`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="设置4位以上访问口令"
                  />
                  {formErrors.password && <div className="form-error">{formErrors.password}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    最大浏览次数
                    <span className="label-hint">留空表示不限制</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={`form-input ${formErrors.maxViews ? 'has-error' : ''}`}
                    value={formData.maxViews}
                    onChange={(e) => setFormData({ ...formData, maxViews: e.target.value })}
                    placeholder="例如: 100"
                  />
                  {formErrors.maxViews && <div className="form-error">{formErrors.maxViews}</div>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  过期时间
                  <span className="label-hint">留空表示永不过期</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">分享权限</label>
                <div className="checkbox-group">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.allowTimeline}
                      onChange={(e) => setFormData({ ...formData, allowTimeline: e.target.checked })}
                    />
                    <span>允许查看时间轴</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.allowMessages}
                      onChange={(e) => setFormData({ ...formData, allowMessages: e.target.checked })}
                    />
                    <span>允许访客留言</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.allowDownload}
                      onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                    />
                    <span>允许下载素材</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  图片水印文字
                  <span className="label-hint">留空表示不添加水印</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.watermark}
                  onChange={(e) => setFormData({ ...formData, watermark: e.target.value })}
                  placeholder="例如: 星屑纪念馆 专属"
                />
              </div>

              {formErrors.submit && (
                <div className="form-error form-error-big">{formErrors.submit}</div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingShare ? '保存修改' : '创建分享'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statsShare && (
        <div className="modal-overlay" onClick={() => { setStatsShare(null); setStats(null); }}>
          <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                📊 浏览统计 - {statsShare.title}
              </h3>
              <button className="modal-close" onClick={() => { setStatsShare(null); setStats(null); }}>×</button>
            </div>

            <div className="modal-body">
              {!stats ? (
                <div className="loading-wrap">
                  <div className="loading-spinner"></div>
                  <span className="loading-text">加载中...</span>
                </div>
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stats-card">
                      <div className="stats-icon">👁</div>
                      <div className="stats-value">{stats.totalViews}</div>
                      <div className="stats-label">总浏览次数</div>
                    </div>
                    <div className="stats-card">
                      <div className="stats-icon">✅</div>
                      <div className="stats-value">{stats.successViews}</div>
                      <div className="stats-label">成功访问</div>
                    </div>
                    <div className="stats-card">
                      <div className="stats-icon">❌</div>
                      <div className="stats-value">{stats.failedViews}</div>
                      <div className="stats-label">失败访问</div>
                    </div>
                    <div className="stats-card">
                      <div className="stats-icon">👤</div>
                      <div className="stats-value">{stats.uniqueVisitors}</div>
                      <div className="stats-label">独立访客</div>
                    </div>
                  </div>

                  <div className="stats-section">
                    <h4 className="stats-section-title">访问趋势（按日期）</h4>
                    {renderStatsChart()}
                  </div>

                  <div className="stats-info-list">
                    <div className="stats-info-item">
                      <span className="info-label">创建时间</span>
                      <span className="info-value">{formatDate(stats.createdAt)}</span>
                    </div>
                    <div className="stats-info-item">
                      <span className="info-label">最近访问</span>
                      <span className="info-value">{formatDate(stats.lastViewedAt)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareManager;
