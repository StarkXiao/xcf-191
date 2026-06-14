import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { timelineApi, familyAlbumApi } from '../services/api.js';
import './FamilyTimeline.scss';

function FamilyTimeline() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeline, setSelectedTimeline] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [albumData, timelineData] = await Promise.all([
        familyAlbumApi.get(id),
        timelineApi.list(null, id)
      ]);
      setAlbum(albumData);
      setTimelines(timelineData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return {
      year: d.getFullYear(),
      month: `${d.getMonth() + 1}月`,
      day: `${d.getDate()}日`,
      full: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    };
  };

  const groupTimelinesByYear = () => {
    const groups = {};
    timelines.forEach(t => {
      const year = new Date(t.eventDate).getFullYear();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(t);
    });
    return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]));
  };

  if (loading) {
    return (
      <div className="family-timeline loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  const groupedTimelines = groupTimelinesByYear();

  return (
    <div className="family-timeline">
      <div className="timeline-header">
        <Link to={`/family-albums/${id}`} className="back-link">
          <span>←</span> 返回纪念册
        </Link>
        <h1 className="timeline-title">
          <span className="title-icon">⌛</span>
          {album?.name || '家庭'} · 跨展厅时间轴
        </h1>
        <p className="timeline-subtitle">
          汇聚所有展厅的珍贵记忆，按时间顺序呈现家族故事
        </p>
        <div className="timeline-stats">
          <span className="stat-badge">
            <span className="stat-icon">✦</span>
            {(album?.exhibitionIds || []).length} 个展厅
          </span>
          <span className="stat-badge">
            <span className="stat-icon">❋</span>
            {(album?.memberIds || []).length} 位成员
          </span>
          <span className="stat-badge">
            <span className="stat-icon">⏳</span>
            {timelines.length} 个时间节点
          </span>
        </div>
      </div>

      {timelines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⌛</div>
          <p className="empty-text">该纪念册还没有时间节点</p>
          <p className="empty-hint">去各个展厅中添加时间轴事件，它们会自动汇总到这里</p>
          {(album?.exhibitions || []).length > 0 && (
            <div className="empty-links">
              {(album.exhibitions || []).slice(0, 3).map(ex => (
                <Link key={ex.id} to={`/exhibition/${ex.id}`} className="empty-link-btn">
                  去「{ex.title}」添加
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="timeline-container">
          {groupedTimelines.map(([year, items]) => (
            <div key={year} className="year-group">
              <div className="year-marker">
                <span className="year-text">{year}</span>
                <span className="year-count">{items.length} 件事</span>
              </div>
              <div className="year-timeline">
                {items.map((t, idx) => {
                  const date = formatEventDate(t.eventDate);
                  return (
                    <div
                      key={t.id}
                      className={`timeline-item ${idx % 2 === 0 ? 'left' : 'right'}`}
                      onClick={() => setSelectedTimeline(t)}
                    >
                      <div className="timeline-dot"></div>
                      <div className="timeline-card">
                        <div className="card-date">
                          <span className="date-month">{date.month}</span>
                          <span className="date-day">{date.day}</span>
                        </div>
                        {t.exhibitionTitle && (
                          <div className="card-exhibition-tag">
                            <span className="tag-icon">✦</span>
                            {t.exhibitionTitle}
                          </div>
                        )}
                        <h3 className="card-title">{t.title || '未命名事件'}</h3>
                        {t.description && (
                          <p className="card-desc">{t.description}</p>
                        )}
                        {t.location && (
                          <div className="card-location">
                            <span className="location-icon">📍</span>
                            {t.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTimeline && (
        <div className="modal-overlay" onClick={() => setSelectedTimeline(null)}>
          <div className="timeline-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setSelectedTimeline(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-date">
                {formatEventDate(selectedTimeline.eventDate).full}
              </div>
              {selectedTimeline.exhibitionTitle && (
                <div className="detail-exhibition">
                  <span className="detail-tag-icon">✦</span>
                  来自展厅：{selectedTimeline.exhibitionTitle}
                </div>
              )}
              <h2 className="detail-title">{selectedTimeline.title || '未命名事件'}</h2>
              {selectedTimeline.description && (
                <p className="detail-desc">{selectedTimeline.description}</p>
              )}
              {selectedTimeline.location && (
                <div className="detail-location">
                  <span>📍</span> {selectedTimeline.location}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyTimeline;
