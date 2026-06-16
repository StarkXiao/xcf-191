import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi } from '../services/api.js';
import './OpsDashboard.scss';

function OpsDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await opsApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="ops-dashboard"><div className="loading">加载中...</div></div>;
  }

  if (!dashboard) {
    return <div className="ops-dashboard"><div className="loading">加载失败</div></div>;
  }

  const { summary, materialTypeDistribution, exhibitionStats } = dashboard;

  const typeLabels = {
    text: '文本',
    image: '图片',
    audio: '音频',
    video: '视频',
    unknown: '未知'
  };

  const typeColors = {
    text: '#87ceeb',
    image: '#ffd700',
    audio: '#dda0dd',
    video: '#98fb98',
    unknown: '#8080a0'
  };

  return (
    <div className="ops-dashboard">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span>←</span> 返回首页
        </button>
        <div className="header-content">
          <h1>展厅运营中心</h1>
          <button className="btn-primary" onClick={loadDashboard}>刷新数据</button>
        </div>
      </div>

      <div className="nav-cards">
        <div className="nav-card" onClick={() => navigate('/ops/messages')}>
          <div className="nav-icon">💬</div>
          <div className="nav-info">
            <h3>留言处理</h3>
            <p>今日 {summary.todayMessageCount + (summary.todayRitualMessageCount || 0)} 条新留言</p>
          </div>
          <div className="nav-badge">{summary.todayMessageCount + (summary.todayRitualMessageCount || 0)}</div>
        </div>
        <div className="nav-card" onClick={() => navigate('/ops/material-inspect')}>
          <div className="nav-icon">🔍</div>
          <div className="nav-info">
            <h3>素材巡检</h3>
            <p>{summary.materialCount} 个素材待检</p>
          </div>
        </div>
        <div className="nav-card" onClick={() => navigate('/ops/file-repair')}>
          <div className="nav-icon">🔧</div>
          <div className="nav-info">
            <h3>异常修复</h3>
            <p>文件健康检查</p>
          </div>
        </div>
        <div className="nav-card" onClick={() => navigate('/ops/reviews')}>
          <div className="nav-icon">✅</div>
          <div className="nav-info">
            <h3>内容审核</h3>
            <p>{summary.pendingReviewCount} 条待审核</p>
          </div>
          {summary.pendingReviewCount > 0 && (
            <div className="nav-badge warning">{summary.pendingReviewCount}</div>
          )}
        </div>
        <div className="nav-card" onClick={() => navigate('/ops/sensitive-words')}>
          <div className="nav-icon">🛡️</div>
          <div className="nav-info">
            <h3>敏感词管理</h3>
            <p>词库配置与维护</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h2>数据概览</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🏛️</span>
            <span className="stat-value">{summary.exhibitionCount}</span>
            <span className="stat-label">展厅总数</span>
          </div>
          <div className="stat-card gold">
            <span className="stat-icon">📦</span>
            <span className="stat-value">{summary.materialCount}</span>
            <span className="stat-label">素材总数</span>
          </div>
          <div className="stat-card blue">
            <span className="stat-icon">💬</span>
            <span className="stat-value">{summary.messageCount}</span>
            <span className="stat-label">展厅留言</span>
          </div>
          <div className="stat-card purple">
            <span className="stat-icon">🕯️</span>
            <span className="stat-value">{summary.ritualMessageCount || 0}</span>
            <span className="stat-label">仪式留言</span>
          </div>
          <div className="stat-card green">
            <span className="stat-icon">📅</span>
            <span className="stat-value">{summary.appointmentCount}</span>
            <span className="stat-label">预约总数</span>
          </div>
          <div className="stat-card purple">
            <span className="stat-icon">🔗</span>
            <span className="stat-value">{summary.shareCount}</span>
            <span className="stat-label">分享链接</span>
          </div>
          <div className="stat-card warm">
            <span className="stat-icon">👀</span>
            <span className="stat-value">{summary.shareViewCount}</span>
            <span className="stat-label">分享浏览</span>
          </div>
          <div className="stat-card info">
            <span className="stat-icon">🚪</span>
            <span className="stat-value">{summary.visitRecordCount}</span>
            <span className="stat-label">到访记录</span>
          </div>
          <div className="stat-card today">
            <span className="stat-icon">✨</span>
            <span className="stat-value">{summary.todayMessageCount}</span>
            <span className="stat-label">今日留言</span>
          </div>
          <div className="stat-card week">
            <span className="stat-icon">📊</span>
            <span className="stat-value">{summary.weekMessageCount}</span>
            <span className="stat-label">本周留言</span>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="distribution-section">
          <h2>素材类型分布</h2>
          <div className="distribution-list">
            {Object.entries(materialTypeDistribution).length === 0 ? (
              <div className="empty">暂无素材数据</div>
            ) : (
              Object.entries(materialTypeDistribution).map(([type, count]) => {
                const total = summary.materialCount || 1;
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={type} className="dist-item">
                    <div className="dist-header">
                      <span className="dist-type" style={{ color: typeColors[type] || '#8080a0' }}>
                        {typeLabels[type] || type}
                      </span>
                      <span className="dist-count">{count} 个 ({percent}%)</span>
                    </div>
                    <div className="dist-bar">
                      <div className="dist-fill" style={{
                        width: `${percent}%`,
                        background: typeColors[type] || '#8080a0'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="review-section">
          <h2>审核统计</h2>
          <div className="review-stats">
            <div className="review-stat pending">
              <span className="review-value">{summary.pendingReviewCount}</span>
              <span className="review-label">待审核</span>
            </div>
            <div className="review-stat approved">
              <span className="review-value">{summary.approvedReviewCount}</span>
              <span className="review-label">已通过</span>
            </div>
            <div className="review-stat rejected">
              <span className="review-value">{summary.rejectedReviewCount}</span>
              <span className="review-label">已拒绝</span>
            </div>
          </div>
          {summary.pendingRitualMessageCount > 0 && (
            <div className="ritual-pending-notice">
              🕯️ 其中仪式留言待审核 {summary.pendingRitualMessageCount} 条
            </div>
          )}
        </div>
      </div>

      <div className="exhibition-section">
        <h2>展厅运营状况</h2>
        {exhibitionStats.length === 0 ? (
          <div className="empty">暂无展厅数据</div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>展厅名称</th>
                  <th>素材数</th>
                  <th>留言数</th>
                  <th>待审核</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {exhibitionStats.map(ex => (
                  <tr key={ex.id}>
                    <td className="exhibition-name">{ex.title}</td>
                    <td>{ex.materialCount}</td>
                    <td>{ex.messageCount}</td>
                    <td>
                      {ex.pendingReviewCount > 0 ? (
                        <span className="status-badge warning">{ex.pendingReviewCount}</span>
                      ) : (
                        <span className="status-badge clean">0</span>
                      )}
                    </td>
                    <td>{new Date(ex.createdAt).toLocaleDateString('zh-CN')}</td>
                    <td className="actions-cell">
                      <button className="btn-link" onClick={() => navigate(`/exhibition/${ex.id}`)}>查看</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OpsDashboard;
