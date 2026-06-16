import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi, exhibitionApi } from '../services/api.js';
import './OpsReviewWorkflow.scss';

const STATUS_MAP = {
  pending: { label: '待审核', color: '#ffd700', icon: '⏳' },
  approved: { label: '已通过', color: '#98fb98', icon: '✅' },
  rejected: { label: '已拒绝', color: '#ff8080', icon: '❌' }
};

const TYPE_LABELS = {
  material: '素材',
  message: '展厅留言',
  'ritual-message': '仪式留言',
  exhibition: '展厅'
};

function OpsReviewWorkflow() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ status: 'pending', exhibitionId: '', type: '', page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteAction, setNoteAction] = useState('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    loadReviews();
  }, [filters.status, filters.exhibitionId, filters.type, filters.page]);

  const loadExhibitions = async () => {
    try {
      const data = await exhibitionApi.list();
      setExhibitions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.exhibitionId) params.exhibitionId = filters.exhibitionId;
      if (filters.type) params.type = filters.type;
      params.page = filters.page;
      params.pageSize = filters.pageSize;
      const data = await opsApi.listReviews(params);
      setReviews(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await opsApi.generateReviews();
      alert(`已生成 ${result.generated} 条审核记录`);
      loadReviews();
    } catch (err) {
      alert(err.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await opsApi.approveReview(id, '');
      loadReviews();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleReject = async (id) => {
    try {
      await opsApi.rejectReview(id, '');
      loadReviews();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleWithNote = (id, action) => {
    setNoteTarget(id);
    setNoteAction(action);
    setNoteText('');
    setShowNoteModal(true);
  };

  const confirmNoteAction = async () => {
    try {
      if (noteAction === 'approve') {
        await opsApi.approveReview(noteTarget, noteText);
      } else {
        await opsApi.rejectReview(noteTarget, noteText);
      }
      setShowNoteModal(false);
      setNoteTarget(null);
      setNoteText('');
      loadReviews();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  return (
    <div className="ops-review-workflow">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops')}>
          <span>←</span> 返回运营中心
        </button>
        <div className="header-content">
          <h1>展厅内容审核</h1>
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '扫描中...' : '扫描生成审核项'}
          </button>
        </div>
      </div>

      <div className="pipeline-visual">
        <div className={`pipeline-step ${filters.status === 'pending' ? 'active' : ''}`}>
          <div className="step-icon">⏳</div>
          <div className="step-label">待审核</div>
          <div className="step-arrow">→</div>
        </div>
        <div className={`pipeline-step ${filters.status === 'approved' ? 'active' : ''}`}>
          <div className="step-icon">✅</div>
          <div className="step-label">已通过</div>
          <div className="step-arrow">→</div>
        </div>
        <div className={`pipeline-step ${filters.status === 'rejected' ? 'active' : ''}`}>
          <div className="step-icon">❌</div>
          <div className="step-label">已拒绝</div>
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
        <select
          value={filters.type}
          onChange={(e) => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}
          className="form-input"
        >
          <option value="">全部类型</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="review-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : reviews.length === 0 ? (
          <div className="empty">暂无审核记录</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className={`review-card ${review.status}`}>
              <div className="review-body">
                <div className="review-meta">
                  <span className="review-type">{TYPE_LABELS[review.type] || review.type}</span>
                  {review.type === 'ritual-message' && review.ritualTitle ? (
                    <span className="review-exhibition">{review.ritualTitle}</span>
                  ) : (
                    <span className="review-exhibition">{review.exhibitionTitle}</span>
                  )}
                  <span className="review-time">{new Date(review.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="review-content">{review.content}</div>
                {review.reason && (
                  <div className="review-reason">原因：{review.reason}</div>
                )}
                {review.reviewNote && (
                  <div className="review-note">审核备注：{review.reviewNote}</div>
                )}
                {review.reviewedAt && (
                  <div className="review-reviewed">
                    审核于 {new Date(review.reviewedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
              {review.status === 'pending' && (
                <div className="review-actions">
                  <button className="btn-approve" onClick={() => handleApprove(review.id)}>通过</button>
                  <button className="btn-approve-note" onClick={() => handleWithNote(review.id, 'approve')}>通过(备注)</button>
                  <button className="btn-reject" onClick={() => handleReject(review.id)}>拒绝</button>
                  <button className="btn-reject-note" onClick={() => handleWithNote(review.id, 'reject')}>拒绝(备注)</button>
                </div>
              )}
              {review.status !== 'pending' && (
                <div className="review-status-badge">
                  {STATUS_MAP[review.status]?.icon} {STATUS_MAP[review.status]?.label}
                </div>
              )}
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

      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{noteAction === 'approve' ? '通过审核' : '拒绝审核'}</h3>
            <div className="form-group">
              <label>审核备注</label>
              <textarea
                className="form-textarea"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="请输入审核备注（可选）"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowNoteModal(false)}>取消</button>
              <button
                className={noteAction === 'approve' ? 'btn-approve' : 'btn-reject'}
                onClick={confirmNoteAction}
              >
                确认{noteAction === 'approve' ? '通过' : '拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsReviewWorkflow;
