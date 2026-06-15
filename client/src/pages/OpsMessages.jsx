import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi, exhibitionApi } from '../services/api.js';
import './OpsMessages.scss';

const STATUS_MAP = {
  pending: { label: '待审核', color: '#ffd700' },
  approved: { label: '已通过', color: '#98fb98' },
  rejected: { label: '已拒绝', color: '#ff8080' }
};

function OpsMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'pending', exhibitionId: '', page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    loadMessages();
  }, [filters.status, filters.exhibitionId, filters.page]);

  const loadExhibitions = async () => {
    try {
      const data = await exhibitionApi.list();
      setExhibitions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.exhibitionId) params.exhibitionId = filters.exhibitionId;
      params.page = filters.page;
      params.pageSize = filters.pageSize;
      const data = await opsApi.listMessages(params);
      setMessages(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await opsApi.reviewMessage(id, { status: 'approved' });
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleRejectClick = (id) => {
    setRejectTarget(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    try {
      await opsApi.reviewMessage(rejectTarget, { status: 'rejected', reason: rejectReason });
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason('');
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await opsApi.batchReviewMessages({ ids: Array.from(selectedIds), status: 'approved' });
      setSelectedIds(new Set());
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    try {
      await opsApi.batchReviewMessages({ ids: Array.from(selectedIds), status: 'rejected', reason: '批量拒绝' });
      setSelectedIds(new Set());
      loadMessages();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  const statusCounts = {
    pending: filters.status === 'pending' ? total : '-',
    approved: filters.status === 'approved' ? total : '-',
    rejected: filters.status === 'rejected' ? total : '-'
  };

  return (
    <div className="ops-messages">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops')}>
          <span>←</span> 返回运营中心
        </button>
        <div className="header-content">
          <h1>留言处理</h1>
        </div>
      </div>

      <div className="status-tabs">
        {Object.entries(STATUS_MAP).map(([key, val]) => (
          <button
            key={key}
            className={`status-tab ${filters.status === key ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, status: key, page: 1 }))}
          >
            <span className="tab-dot" style={{ background: val.color }} />
            {val.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <select
          value={filters.exhibitionId}
          onChange={(e) => setFilters(f => ({ ...f, exhibitionId: e.target.value, page: 1 }))}
          className="form-input"
        >
          <option value="">全部展厅</option>
          {exhibitions.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.title}</option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="batch-bar">
          <span>已选择 {selectedIds.size} 条留言</span>
          <button className="btn-approve" onClick={handleBatchApprove}>批量通过</button>
          <button className="btn-reject" onClick={handleBatchReject}>批量拒绝</button>
        </div>
      )}

      <div className="messages-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="empty">暂无留言</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message-card ${selectedIds.has(msg.id) ? 'selected' : ''}`}>
              <div className="msg-select">
                <input
                  type="checkbox"
                  checked={selectedIds.has(msg.id)}
                  onChange={() => toggleSelect(msg.id)}
                />
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-author">{msg.author || '匿名访客'}</span>
                  <span className="msg-exhibition">{msg.exhibitionTitle}</span>
                  <span className="msg-time">{new Date(msg.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="msg-content">{msg.content}</div>
                {msg.reviewStatus === 'rejected' && msg.reviewReason && (
                  <div className="msg-reject-reason">拒绝原因：{msg.reviewReason}</div>
                )}
                {msg.reviewedAt && (
                  <div className="msg-reviewed">
                    审核于 {new Date(msg.reviewedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
              <div className="msg-actions">
                {(!msg.reviewStatus || msg.reviewStatus === 'pending') && (
                  <>
                    <button className="btn-approve" onClick={() => handleApprove(msg.id)}>通过</button>
                    <button className="btn-reject" onClick={() => handleRejectClick(msg.id)}>拒绝</button>
                  </>
                )}
                {msg.reviewStatus === 'approved' && (
                  <span className="status-approved">已通过</span>
                )}
                {msg.reviewStatus === 'rejected' && (
                  <span className="status-rejected">已拒绝</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
          >上一页</button>
          <span className="page-info">{filters.page} / {totalPages} (共 {total} 条)</span>
          <button
            className="page-btn"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
          >下一页</button>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>拒绝留言</h3>
            <div className="form-group">
              <label>拒绝原因</label>
              <textarea
                className="form-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因（可选）"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>取消</button>
              <button className="btn-reject" onClick={handleRejectConfirm}>确认拒绝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsMessages;
