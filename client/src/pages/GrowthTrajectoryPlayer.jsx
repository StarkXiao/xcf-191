import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { growthTrajectoryApi } from '../services/api.js';
import { saveProgress, getProgress, removeProgress, savePageState, getPageState, getMediaProgressList } from '../services/playbackProgress.js';
import ResumePrompt from '../components/ResumePrompt.jsx';
import './GrowthTrajectoryPlayer.scss';

const PROGRESS_SOURCE = 'growth';

function GrowthTrajectoryPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [playData, setPlayData] = useState(null);
  const [stageCovers, setStageCovers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [waitingMedia, setWaitingMedia] = useState(false);
  const [resumeItems, setResumeItems] = useState([]);
  const audioRefs = useRef({});
  const videoRefs = useRef({});
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const mediaEndedCountRef = useRef(0);
  const totalMediaRef = useRef(0);
  const mediaTimeoutRef = useRef(null);
  const saveTimerRef = useRef(null);
  const resumedRef = useRef(false);

  useEffect(() => {
    loadPlaylist();
    return () => {
      clearAllTimers();
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (playData && !resumedRef.current) {
      const pageState = getPageState(PROGRESS_SOURCE, id);
      if (pageState?.currentIdx != null && pageState.currentIdx < playData.playlist.length) {
        setCurrentIdx(pageState.currentIdx);
      }
      const allMatIds = Object.keys(playData.materials || {});
      const mediaMatIds = allMatIds.filter(mid => {
        const m = playData.materials[mid];
        return m && (m.type === 'audio' || m.type === 'video');
      });
      const mediaProgress = getMediaProgressList(PROGRESS_SOURCE, mediaMatIds);
      const itemsWithProgress = mediaMatIds
        .filter(mid => mediaProgress[mid])
        .map(mid => ({
          materialId: mid,
          currentTime: mediaProgress[mid].currentTime,
          duration: mediaProgress[mid].duration,
          title: playData.materials[mid].title
        }));
      if (itemsWithProgress.length > 0) {
        setResumeItems(itemsWithProgress);
      }
      resumedRef.current = true;
    }
  }, [playData, id]);

  useEffect(() => {
    stopAllMedia();
    resetProgress();
    clearAllTimers();
    setWaitingMedia(false);
    mediaEndedCountRef.current = 0;
    totalMediaRef.current = 0;

    if (isPlaying && playData) {
      handleAutoplayForCurrent();
    }
  }, [currentIdx, isPlaying, playData]);

  useEffect(() => {
    if (isPlaying && playData) {
      startProgressTracker();
    }
  }, [currentIdx, isPlaying, playData, waitingMedia]);

  useEffect(() => {
    if (isPlaying) {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      saveTimerRef.current = setInterval(() => {
        saveCurrentMediaProgress();
        savePageState(PROGRESS_SOURCE, id, { currentIdx });
      }, 3000);
    } else {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isPlaying, currentIdx, id]);

  const clearAllTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    if (mediaTimeoutRef.current) {
      clearTimeout(mediaTimeoutRef.current);
      mediaTimeoutRef.current = null;
    }
  };

  const loadPlaylist = async () => {
    try {
      const [data, covers] = await Promise.all([
        growthTrajectoryApi.getPlaylist(id),
        growthTrajectoryApi.getCovers(id)
      ]);
      setPlayData(data);
      setStageCovers(covers || {});
    } catch (err) {
      console.error('加载播放列表失败:', err);
      if (err.response?.status === 404) navigate('/growth-trajectory');
    } finally {
      setLoading(false);
    }
  };

  const stopAllMedia = () => {
    Object.values(audioRefs.current).forEach(a => {
      if (a) {
        try { a.pause(); a.currentTime = 0; } catch (e) {}
      }
    });
    Object.values(videoRefs.current).forEach(v => {
      if (v) {
        try { v.pause(); v.currentTime = 0; } catch (e) {}
      }
    });
    audioRefs.current = {};
    videoRefs.current = {};
  };

  const saveCurrentMediaProgress = useCallback(() => {
    Object.entries(audioRefs.current).forEach(([matId, el]) => {
      if (el && el.currentTime > 0) {
        saveProgress(PROGRESS_SOURCE, matId, el.currentTime, el.duration || 0);
      }
    });
    Object.entries(videoRefs.current).forEach(([matId, el]) => {
      if (el && el.currentTime > 0) {
        saveProgress(PROGRESS_SOURCE, matId, el.currentTime, el.duration || 0);
      }
    });
  }, []);

  const handleMediaTimeUpdate = useCallback((matId) => (e) => {
    const el = e.target;
    if (el.currentTime > 0 && el.duration > 0) {
      saveProgress(PROGRESS_SOURCE, matId, el.currentTime, el.duration);
    }
  }, []);

  const handleMediaEnded = useCallback((matId) => () => {
    removeProgress(PROGRESS_SOURCE, matId);
  }, []);

  const handleResume = () => {
    for (const item of resumeItems) {
      const el = audioRefs.current[item.materialId] || videoRefs.current[item.materialId];
      if (el && item.currentTime > 0) {
        el.currentTime = item.currentTime;
      }
    }
    setResumeItems([]);
  };

  const handleDismissResume = () => {
    for (const item of resumeItems) {
      removeProgress(PROGRESS_SOURCE, item.materialId);
    }
    setResumeItems([]);
  };

  const handleLeavePage = useCallback(() => {
    saveCurrentMediaProgress();
    savePageState(PROGRESS_SOURCE, id, { currentIdx });
  }, [saveCurrentMediaProgress, id, currentIdx]);

  const getDurationForItem = (item) => {
    const settings = playData?.settings || {};
    const base = {
      chapter_cover: settings.chapterDuration || 6000,
      timeline_node: settings.nodeDuration || 10000,
      material_review: settings.reviewDuration || 8000
    };
    return base[item.type] / playSpeed;
  };

  const resetProgress = () => {
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const startProgressTracker = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (!playData) return;

    const currentItem = playData.playlist[currentIdx];
    if (!currentItem) {
      setProgress(100);
      return;
    }

    if (currentItem.type === 'timeline_node' && waitingMedia) {
      setProgress(100);
      return;
    }

    const duration = getDurationForItem(currentItem);
    const interval = 50;
    const step = (interval / duration) * 100;
    let currentProgress = 0;

    progressRef.current = setInterval(() => {
      currentProgress += step;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressRef.current);
      }
      setProgress(currentProgress);
    }, interval);
  };

  const goNext = useCallback(() => {
    if (!playData) return;
    saveCurrentMediaProgress();
    if (currentIdx < playData.playlist.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsPlaying(false);
      clearAllTimers();
    }
  }, [playData, currentIdx]);

  const goPrev = () => {
    if (!playData) return;
    saveCurrentMediaProgress();
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const jumpToItem = (idx) => {
    if (!playData) return;
    saveCurrentMediaProgress();
    if (idx >= 0 && idx < playData.playlist.length) {
      setCurrentIdx(idx);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearAllTimers();
      saveCurrentMediaProgress();
      Object.values(audioRefs.current).forEach(a => { if (a) a.pause(); });
      Object.values(videoRefs.current).forEach(v => { if (v) v.pause(); });
    } else {
      setIsPlaying(true);
      if (!playData) return;
      if (currentIdx === playData.playlist.length - 1) {
        setCurrentIdx(0);
      }
    }
  };

  const handleAutoplayForCurrent = useCallback(() => {
    if (!playData) return;
    const currentItem = playData.playlist[currentIdx];
    if (!currentItem) return;

    if (currentItem.type === 'timeline_node') {
      const matIds = currentItem.materialIds || [];
      if (matIds.length > 0) {
        const materials = matIds.map(mid => playData.materials[mid]).filter(Boolean);
        const mediaMats = materials.filter(m => m.type === 'video' || m.type === 'audio');
        if (mediaMats.length > 0) {
          totalMediaRef.current = mediaMats.length;
          mediaEndedCountRef.current = 0;
          setWaitingMedia(true);

          const mediaTimeoutMs = 600000 / playSpeed;
          mediaTimeoutRef.current = setTimeout(() => {
            proceedToNext();
          }, mediaTimeoutMs);
          return;
        }
      }
    }

    const duration = getDurationForItem(currentItem);
    timerRef.current = setTimeout(() => {
      proceedToNext();
    }, duration);
  }, [playData, currentIdx, playSpeed]);

  const proceedToNext = useCallback(() => {
    clearAllTimers();
    setWaitingMedia(false);
    setCurrentIdx(prev => {
      if (!playData) return prev;
      if (prev >= playData.playlist.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [playData]);

  const onOriginalMediaEnded = useCallback(() => {
    mediaEndedCountRef.current += 1;
    if (mediaEndedCountRef.current >= totalMediaRef.current) {
      setTimeout(() => {
        if (isPlaying) proceedToNext();
      }, 1500);
    }
  }, [isPlaying, proceedToNext]);

  const getMaterialById = (mid) => playData?.materials?.[mid];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getEffectiveCover = (item) => {
    const customCover = stageCovers[item.stageKey];
    return customCover || item.coverImage;
  };

  const renderChapterCover = (item) => {
    const effectiveCover = getEffectiveCover(item);
    return (
      <div className="gt-cover" style={{ '--accent-color': item.stageColor }}>
        <div className="cover-bg-pattern" />
        {effectiveCover && (
          <div className="cover-bg-image">
            <img src={effectiveCover} alt="" />
          </div>
        )}
        <div className="cover-content">
          <div className="chapter-number">
            <span className="chapter-prefix">CHAPTER</span>
            <span className="chapter-num">{String(item.stageIdx + 1).padStart(2, '0')}</span>
          </div>
          <div className="chapter-icon">{item.stageIcon}</div>
          <h2 className="chapter-name">{item.stageName}</h2>
          <p className="chapter-description">{item.stageDescription}</p>
          {item.dateRange && (
            <div className="chapter-date-range">
              <span className="date-icon">📅</span>
              <span>{item.dateRange}</span>
            </div>
          )}
          <div className="chapter-stats">
            <div className="chapter-stat">
              <span className="stat-num">{item.nodeCount}</span>
              <span className="stat-label">珍贵瞬间</span>
            </div>
            <div className="stat-divider">·</div>
            <div className="chapter-stat">
              <span className="stat-num">{item.materialCount}</span>
              <span className="stat-label">回忆素材</span>
            </div>
          </div>
          {item.summary && (
            <p className="chapter-summary">「{item.summary}」</p>
          )}
          {stageCovers[item.stageKey] && (
            <div className="custom-cover-badge">✨ 自定义封面</div>
          )}
        </div>
      </div>
    );
  };

  const renderTimelineNode = (item) => {
    const materials = (item.materialIds || [])
      .map(getMaterialById)
      .filter(Boolean);

    const attachMediaListeners = (element, matId) => {
      if (!element) return;
      if (element._listenersAttached) return;
      element._listenersAttached = true;
      element.addEventListener('ended', () => {
        onOriginalMediaEnded();
        removeProgress(PROGRESS_SOURCE, matId);
      });
      element.addEventListener('timeupdate', handleMediaTimeUpdate(matId));
      element.addEventListener('play', () => {
        if (mediaTimeoutRef.current) {
          clearTimeout(mediaTimeoutRef.current);
          mediaTimeoutRef.current = null;
        }
      });
    };

    return (
      <div className="gt-node">
        <div className="node-header">
          <div className="node-badge">
            <span className="badge-icon">⏰</span>
            <span className="badge-age">{item.age}岁</span>
          </div>
          <div className="node-stage-tag">
            <span className="tag-icon">📖</span>
            <span>{item.stageName}</span>
          </div>
          {waitingMedia && isPlaying && (
            <div className="waiting-media-hint">
              <span className="hint-icon">🎵</span>
              等待音视频播放完毕后自动继续
            </div>
          )}
        </div>

        <div className="node-date">{item.displayDate}</div>
        <h2 className="node-title">{item.nodeTitle}</h2>

        {item.location && (
          <div className="node-location">
            <span className="loc-icon">📍</span>
            <span className="loc-text">
              {item.location.name || item.location.address ||
                `${item.location.lat?.toFixed(4)}, ${item.location.lng?.toFixed(4)}`}
              {item.location.city && ` (${item.location.city})`}
            </span>
          </div>
        )}

        {materials.length > 0 && (
          <div className="node-materials">
            {materials.map((mat) => {
              if (mat.type === 'image') {
                return (
                  <div key={mat.id} className="mat-item mat-image">
                    <img src={mat.url} alt={mat.title} />
                    {mat.title && <div className="mat-caption">{mat.title}</div>}
                  </div>
                );
              }
              if (mat.type === 'audio') {
                return (
                  <div key={mat.id} className="mat-item mat-audio">
                    <div className="audio-visualizer">
                      <span>♪</span><span>♫</span><span>♪</span><span>♫</span>
                    </div>
                    {mat.title && <h4 className="mat-title">{mat.title}</h4>}
                    <audio
                      ref={(el) => {
                        audioRefs.current[mat.id] = el;
                        attachMediaListeners(el, mat.id);
                      }}
                      src={mat.url}
                      controls
                    />
                  </div>
                );
              }
              if (mat.type === 'video') {
                return (
                  <div key={mat.id} className="mat-item mat-video">
                    <video
                      ref={(el) => {
                        videoRefs.current[mat.id] = el;
                        attachMediaListeners(el, mat.id);
                      }}
                      src={mat.url}
                      controls
                    />
                  </div>
                );
              }
              if (mat.type === 'text') {
                return (
                  <div key={mat.id} className="mat-item mat-text">
                    {mat.title && <h4 className="text-title">{mat.title}</h4>}
                    <p className="text-body">{mat.description}</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {item.nodeDescription && (
          <p className="node-description">
            <span className="quote-mark">「</span>
            {item.nodeDescription}
            <span className="quote-mark">」</span>
          </p>
        )}
      </div>
    );
  };

  const renderMaterialReview = (item) => {
    const allMaterials = [];
    item.nodes?.forEach(node => {
      (node.materialIds || []).forEach(mid => {
        const mat = getMaterialById(mid);
        if (mat) allMaterials.push({ ...mat, nodeTitle: node.title, nodeAge: node.age });
      });
    });

    const images = allMaterials.filter(m => m.type === 'image');
    const texts = allMaterials.filter(m => m.type === 'text');

    return (
      <div className="gt-review">
        <div className="review-header">
          <div className="review-icon">{item.stageIcon}</div>
          <div className="review-meta">
            <span className="review-type-label">素材回顾</span>
            <h2 className="review-stage-name">{item.stageName}</h2>
          </div>
          <div className="review-count">
            <span className="count-num">{item.materialCount}</span>
            <span className="count-label">份素材</span>
          </div>
        </div>

        {images.length > 0 && (
          <div className="review-section">
            <h3 className="section-heading">
              <span>📷</span> 影像记忆
            </h3>
            <div className="review-photos-grid">
              {images.map((img, idx) => (
                <div key={idx} className="photo-cell">
                  <img src={img.url} alt={img.title || ''} />
                  <div className="photo-overlay">
                    {img.nodeAge !== undefined && (
                      <span className="photo-age">{img.nodeAge}岁</span>
                    )}
                    {img.title && <span className="photo-title">{img.title}</span>}
                    {img.nodeTitle && !img.title && <span className="photo-title">{img.nodeTitle}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {texts.length > 0 && (
          <div className="review-section">
            <h3 className="section-heading">
              <span>✍️</span> 文字回忆
            </h3>
            <div className="review-texts">
              {texts.map((text, idx) => (
                <div key={idx} className="text-card">
                  {text.title && <h4 className="text-card-title">{text.title}</h4>}
                  <p className="text-card-body">{text.description}</p>
                  <div className="text-card-meta">
                    {text.nodeAge !== undefined && <span>{text.nodeAge}岁</span>}
                    {text.nodeTitle && <span>· {text.nodeTitle}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.nodes && item.nodes.length > 0 && (
          <div className="review-section review-timeline">
            <h3 className="section-heading">
              <span>📜</span> 阶段足迹
            </h3>
            <div className="review-timeline-list">
              {item.nodes.map((node, idx) => (
                <div key={idx} className="timeline-footprint">
                  <div className="footprint-dot" />
                  <div className="footprint-content">
                    <span className="footprint-age">{node.age}岁</span>
                    <span className="footprint-title">{node.title}</span>
                  </div>
                  <span className="footprint-date">{node.displayDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentItem = () => {
    if (!playData) return null;
    const currentItem = playData.playlist[currentIdx];
    if (!currentItem) return null;

    switch (currentItem.type) {
      case 'chapter_cover':
        return renderChapterCover(currentItem);
      case 'timeline_node':
        return renderTimelineNode(currentItem);
      case 'material_review':
        return renderMaterialReview(currentItem);
      default:
        return null;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'chapter_cover': return '章节封面';
      case 'timeline_node': return '时间节点';
      case 'material_review': return '素材回顾';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="gt-loading-screen">
        <div className="loading-wrapper">
          <div className="loading-spinner-large" />
          <p className="loading-text">正在整理成长轨迹...</p>
          <p className="loading-subtext">让回忆慢慢展开</p>
        </div>
      </div>
    );
  }

  if (!playData || playData.playlist.length === 0) {
    return (
      <div className="gt-empty-player">
        <button className="back-btn" onClick={() => navigate('/growth-trajectory')}>
          ← 返回成长轨迹馆
        </button>
        <div className="empty-content">
          <div className="empty-icon-large">🌱</div>
          <h2>暂无成长内容</h2>
          <p>请先为展厅添加时间节点</p>
        </div>
      </div>
    );
  }

  const currentItem = playData.playlist[currentIdx];
  const totalItems = playData.playlist.length;
  const shouldShowProgress = isPlaying &&
    !(currentItem?.type === 'timeline_node' && waitingMedia);

  return (
    <div className={`growth-trajectory-player ${showSidebar ? 'sidebar-open' : ''}`}>
      <div className="player-topbar">
        <button
          className="topbar-btn"
          onClick={() => { stopAllMedia(); handleLeavePage(); navigate(`/exhibition/${id}`); }}
          title="返回展厅"
        >
          ← 返回展厅
        </button>

        <div className="topbar-title">
          <span className="title-emoji">🌱</span>
          <span className="title-text">{playData.exhibition?.title}</span>
        </div>

        <button
          className={`topbar-btn sidebar-toggle`}
          onClick={() => setShowSidebar(!showSidebar)}
          title="章节列表"
        >
          {showSidebar ? '✕ 关闭' : '☰ 章节'}
        </button>
      </div>

      {resumeItems.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <ResumePrompt
            items={resumeItems}
            onResume={handleResume}
            onDismiss={handleDismissResume}
          />
        </div>
      )}

      <div className="player-main-area">
        <div className={`player-stage ${currentItem?.type || ''}`}>
          {renderCurrentItem()}
        </div>
      </div>

      <div className="player-controls-area">
        {shouldShowProgress && (
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {currentItem?.type === 'timeline_node' && waitingMedia && isPlaying && (
          <div className="media-progress-hint">
            <span className="media-dot" />
            正在播放音视频，请耐心聆听...
            <span className="media-count">
              ({mediaEndedCountRef.current}/{totalMediaRef.current} 已完成)
            </span>
          </div>
        )}

        <div className="controls-info">
          <div className="current-type-badge">
            {getTypeLabel(currentItem?.type)}
          </div>
          <div className="progress-count">
            <span className="current">{currentIdx + 1}</span>
            <span className="sep">/</span>
            <span className="total">{totalItems}</span>
          </div>
        </div>

        <div className="controls-main">
          <button
            className="ctrl-btn ctrl-prev"
            onClick={goPrev}
            disabled={currentIdx === 0}
            title="上一项"
          >
            ‹
          </button>

          <button
            className="ctrl-btn ctrl-play-large"
            onClick={togglePlay}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
            )}
          </button>

          <button
            className="ctrl-btn ctrl-next"
            onClick={goNext}
            disabled={currentIdx === totalItems - 1}
            title="下一项"
          >
            ›
          </button>
        </div>

        <div className="controls-extra">
          <button
            className={`speed-btn ${playSpeed === 1 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(1)}
          >
            1x
          </button>
          <button
            className={`speed-btn ${playSpeed === 1.5 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(1.5)}
          >
            1.5x
          </button>
          <button
            className={`speed-btn ${playSpeed === 2 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(2)}
          >
            2x
          </button>
        </div>

        <div className="player-dots">
          {playData.playlist.map((p, idx) => (
            <button
              key={idx}
              className={`player-dot ${idx === currentIdx ? 'active' : ''} type-${p.type}`}
              onClick={() => jumpToItem(idx)}
              title={`${getTypeLabel(p.type)} ${idx + 1}`}
            >
              {p.type === 'chapter_cover' && '📖'}
              {p.type === 'timeline_node' && '•'}
              {p.type === 'material_review' && '🎞️'}
            </button>
          ))}
        </div>
      </div>

      <div className="player-sidebar">
        <div className="sidebar-header">
          <h3>📚 播放列表</h3>
          <span className="sidebar-count">{totalItems} 项</span>
        </div>
        <div className="sidebar-list">
          {playData.playlist.map((p, idx) => (
            <button
              key={idx}
              className={`sidebar-item ${idx === currentIdx ? 'active' : ''} item-${p.type}`}
              onClick={() => { jumpToItem(idx); setShowSidebar(false); }}
            >
              <span className="item-idx">{String(idx + 1).padStart(2, '0')}</span>
              <div className="item-info">
                <span className="item-type-tag">{getTypeLabel(p.type)}</span>
                <span className="item-name">
                  {p.type === 'chapter_cover' && `${p.stageIcon} ${p.stageName}`}
                  {p.type === 'timeline_node' && `[${p.age}岁] ${p.nodeTitle}`}
                  {p.type === 'material_review' && `${p.stageIcon} ${p.stageName} 回顾`}
                </span>
              </div>
              {stageCovers[p.stageKey] && p.type === 'chapter_cover' && (
                <span className="item-badge">✨</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GrowthTrajectoryPlayer;
