import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exhibitionApi, materialApi, timelineApi } from '../services/api.js';
import './TimelinePlayer.scss';

function TimelinePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRefs = useRef({});
  const videoRefs = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    stopAllMedia();
  }, [currentIdx]);

  const loadData = async () => {
    try {
      const [ex, tims, mats] = await Promise.all([
        exhibitionApi.get(id),
        timelineApi.list(id),
        materialApi.list(id)
      ]);
      setExhibition(ex);
      setTimelines(tims);
      setMaterials(mats);
    } catch (err) {
      console.error('加载失败:', err);
      if (err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const stopAllMedia = () => {
    Object.values(audioRefs.current).forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
    Object.values(videoRefs.current).forEach(v => { if (v) { v.pause(); v.currentTime = 0; } });
  };

  const goNext = () => {
    if (currentIdx < timelines.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setIsPlaying(true);
      if (currentIdx === timelines.length - 1) setCurrentIdx(0);
      timerRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= timelines.length - 1) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 8000);
    }
  };

  const getMaterialById = (mid) => materials.find(m => m.id === mid);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (loading) {
    return (
      <div className="player-loading">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  if (!exhibition || timelines.length === 0) {
    return (
      <div className="player-empty">
        <button className="back-btn" onClick={() => navigate(`/exhibition/${id}`)}>← 返回展厅</button>
        <p>暂无时间轴内容</p>
      </div>
    );
  }

  const currentNode = timelines[currentIdx];
  const nodeMaterials = (currentNode.materialIds || []).map(getMaterialById).filter(Boolean);

  return (
    <div className={`timeline-player theme-${exhibition.theme}`}>
      <button className="player-back" onClick={() => { stopAllMedia(); navigate(`/exhibition/${id}`); }}>
        ← 返回展厅
      </button>

      <div className="player-title-bar">
        <h1 className="player-title">{exhibition.title}</h1>
        <div className="player-progress">
          <span className="progress-current">{currentIdx + 1}</span>
          <span className="progress-sep">/</span>
          <span className="progress-total">{timelines.length}</span>
        </div>
      </div>

      <div className="player-main">
        <div className="node-date">{formatDate(currentNode.eventDate)}</div>
        <h2 className="node-title">{currentNode.title}</h2>

        {nodeMaterials.length > 0 && (
          <div className="node-materials-area">
            {nodeMaterials.map(mat => {
              if (mat.type === 'image') {
                return (
                  <div key={mat.id} className="mat-display image-display">
                    <img src={mat.url} alt={mat.title} />
                    {mat.title && <div className="mat-caption">{mat.title}</div>}
                  </div>
                );
              }
              if (mat.type === 'audio') {
                return (
                  <div key={mat.id} className="mat-display audio-display">
                    <div className="audio-icon-wrap">
                      <span className="audio-note">♪</span>
                      <span className="audio-note delay">♫</span>
                    </div>
                    {mat.title && <div className="mat-caption">{mat.title}</div>}
                    <audio
                      ref={el => audioRefs.current[mat.id] = el}
                      src={mat.url}
                      controls
                    />
                  </div>
                );
              }
              if (mat.type === 'video') {
                return (
                  <div key={mat.id} className="mat-display video-display">
                    <video
                      ref={el => videoRefs.current[mat.id] = el}
                      src={mat.url}
                      controls
                    />
                  </div>
                );
              }
              if (mat.type === 'text') {
                return (
                  <div key={mat.id} className="mat-display text-display">
                    {mat.title && <h4 className="text-title">{mat.title}</h4>}
                    <p className="text-content">{mat.description}</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {currentNode.description && (
          <p className="node-description">{currentNode.description}</p>
        )}
      </div>

      <div className="player-controls">
        <button
          className="ctrl-btn"
          onClick={goPrev}
          disabled={currentIdx === 0}
          title="上一个"
        >
          ‹
        </button>
        <button
          className="ctrl-btn ctrl-play"
          onClick={togglePlay}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button
          className="ctrl-btn"
          onClick={goNext}
          disabled={currentIdx === timelines.length - 1}
          title="下一个"
        >
          ›
        </button>
      </div>

      <div className="player-dots">
        {timelines.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${idx === currentIdx ? 'active' : ''}`}
            onClick={() => setCurrentIdx(idx)}
          />
        ))}
      </div>
    </div>
  );
}

export default TimelinePlayer;
