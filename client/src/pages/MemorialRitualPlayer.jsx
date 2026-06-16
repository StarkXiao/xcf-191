import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memorialRitualApi } from '../services/api.js';
import { saveProgress, removeProgress, savePageState, getPageState, formatTime } from '../services/playbackProgress.js';
import RitualMessageWall from '../components/RitualMessageWall.jsx';
import ResumePrompt from '../components/ResumePrompt.jsx';
import './MemorialRitualPlayer.scss';

const PROGRESS_SOURCE = 'ritual';

function MemorialRitualPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ritual, setRitual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showMessageWall, setShowMessageWall] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitionClass, setTransitionClass] = useState('');
  const [resumeItems, setResumeItems] = useState([]);

  const audioRef = useRef(null);
  const stepMediaRefs = useRef({});
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const playerContainerRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    loadRitual();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!ritual || ritual.backgroundMusic.length === 0) return;
    const currentMusic = ritual.backgroundMusic[currentMusicIndex];
    if (audioRef.current && currentMusic?.url) {
      audioRef.current.src = currentMusic.url;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.warn('音乐播放失败:', err));
      }
    }
  }, [currentMusicIndex, ritual]);

  useEffect(() => {
    if (isPlaying) {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      saveTimerRef.current = setInterval(() => {
        saveCurrentProgress();
        savePageState(PROGRESS_SOURCE, id, { currentStepIndex, currentMusicIndex });
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
  }, [isPlaying, currentStepIndex, currentMusicIndex, id]);

  const loadRitual = async () => {
    try {
      const data = await memorialRitualApi.get(id);
      setRitual(data);
      setShowMessageWall(data.settings?.showMessageWall !== false);

      const pageState = getPageState(PROGRESS_SOURCE, id);
      if (pageState?.currentStepIndex != null && pageState.currentStepIndex < data.steps.length) {
        setCurrentStepIndex(pageState.currentStepIndex);
      }
      if (pageState?.currentMusicIndex != null) {
        setCurrentMusicIndex(pageState.currentMusicIndex);
      }

      const resumeList = [];
      data.steps.forEach((step) => {
        if ((step.type === 'video' || step.type === 'audio') && step.mediaUrl) {
          const progressKey = `${PROGRESS_SOURCE}_step_${step.id}`;
          try {
            const raw = localStorage.getItem(`stardust_progress_${progressKey}`);
            if (raw) {
              const record = JSON.parse(raw);
              if (record.currentTime > 0 && record.currentTime / record.duration < 0.98) {
                resumeList.push({
                  materialId: progressKey,
                  currentTime: record.currentTime,
                  duration: record.duration,
                  title: step.title
                });
              }
            }
          } catch (e) {}
        }
      });

      try {
        const state = await memorialRitualApi.getPlayState(id);
        if (pageState?.currentStepIndex == null) {
          setCurrentStepIndex(state.currentStepIndex || 0);
        }
        if (pageState?.currentMusicIndex == null) {
          setCurrentMusicIndex(state.currentMusicIndex || 0);
        }
        setVolume(state.volume ?? 0.7);
      } catch (e) {}

      if (resumeList.length > 0) {
        setResumeItems(resumeList);
      }
    } catch (err) {
      console.error('加载失败:', err);
      if (err.response?.status === 404) navigate('/memorial-rituals');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentProgress = useCallback(() => {
    Object.entries(stepMediaRefs.current).forEach(([stepId, el]) => {
      if (el && el.currentTime > 0 && el.duration > 0) {
        const progressKey = `${PROGRESS_SOURCE}_step_${stepId}`;
        saveProgress(progressKey, stepId, el.currentTime, el.duration);
      }
    });
    if (audioRef.current && audioRef.current.currentTime > 0) {
      const musicId = ritual?.backgroundMusic[currentMusicIndex]?.id;
      if (musicId) {
        saveProgress(PROGRESS_SOURCE, `music_${musicId}`, audioRef.current.currentTime, audioRef.current.duration || 0);
      }
    }
  }, [ritual, currentMusicIndex]);

  const handleStepMediaTimeUpdate = useCallback((stepId) => (e) => {
    const el = e.target;
    if (el.currentTime > 0 && el.duration > 0) {
      saveProgress(`${PROGRESS_SOURCE}_step`, stepId, el.currentTime, el.duration);
    }
  }, []);

  const handleStepMediaEnded = useCallback((stepId) => () => {
    removeProgress(`${PROGRESS_SOURCE}_step`, stepId);
  }, []);

  const handleResume = () => {
    for (const item of resumeItems) {
      const el = stepMediaRefs.current[item.materialId];
      if (el && item.currentTime > 0) {
        el.currentTime = item.currentTime;
      }
    }
    setResumeItems([]);
  };

  const handleDismissResume = () => {
    for (const item of resumeItems) {
      removeProgress(`${PROGRESS_SOURCE}_step`, item.materialId);
    }
    setResumeItems([]);
  };

  const savePlayState = useCallback(async (state = {}) => {
    try {
      await memorialRitualApi.updatePlayState(id, {
        isPlaying,
        currentStepIndex,
        currentMusicIndex,
        stepProgress,
        volume,
        ...state
      });
    } catch (e) {}
  }, [id, isPlaying, currentStepIndex, currentMusicIndex, stepProgress, volume]);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startStepTimer = useCallback(() => {
    if (!ritual?.settings?.autoAdvance) return;
    const currentStep = ritual.steps[currentStepIndex];
    if (!currentStep) return;

    const duration = (currentStep.duration || 10) * 1000;
    setStepProgress(0);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setStepProgress(progress);
    }, 50);

    timerRef.current = setTimeout(() => {
      goNext(true);
    }, duration);
  }, [ritual, currentStepIndex]);

  const togglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearTimers();
      saveCurrentProgress();
      if (audioRef.current) audioRef.current.pause();
      savePlayState({ isPlaying: false });
    } else {
      setIsPlaying(true);
      if (ritual?.backgroundMusic.length > 0 && audioRef.current) {
        audioRef.current.play().catch(err => console.warn('音乐播放失败:', err));
      }
      startStepTimer();
      savePlayState({ isPlaying: true });
    }
  };

  const goNext = (fromTimer = false) => {
    if (!ritual) return;
    saveCurrentProgress();
    if (currentStepIndex < ritual.steps.length - 1) {
      triggerTransition('next', () => {
        const newIndex = currentStepIndex + 1;
        setCurrentStepIndex(newIndex);
        setStepProgress(0);
        clearTimers();
        if (isPlaying) startStepTimer();
        savePlayState({ currentStepIndex: newIndex, stepProgress: 0 });
        savePageState(PROGRESS_SOURCE, id, { currentStepIndex: newIndex, currentMusicIndex });
      });
    } else {
      setIsPlaying(false);
      clearTimers();
      if (audioRef.current) audioRef.current.pause();
      savePlayState({ isPlaying: false });
    }
  };

  const goPrev = () => {
    if (!ritual || currentStepIndex === 0) return;
    saveCurrentProgress();
    triggerTransition('prev', () => {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      setStepProgress(0);
      clearTimers();
      if (isPlaying) startStepTimer();
      savePlayState({ currentStepIndex: newIndex, stepProgress: 0 });
      savePageState(PROGRESS_SOURCE, id, { currentStepIndex: newIndex, currentMusicIndex });
    });
  };

  const goToStep = (index) => {
    if (!ritual || index === currentStepIndex || index < 0 || index >= ritual.steps.length) return;
    saveCurrentProgress();
    const direction = index > currentStepIndex ? 'next' : 'prev';
    triggerTransition(direction, () => {
      setCurrentStepIndex(index);
      setStepProgress(0);
      clearTimers();
      if (isPlaying) startStepTimer();
      savePlayState({ currentStepIndex: index, stepProgress: 0 });
      savePageState(PROGRESS_SOURCE, id, { currentStepIndex: index, currentMusicIndex });
    });
  };

  const triggerTransition = (direction, callback) => {
    const effect = ritual?.settings?.transitionEffect || 'fade';
    setTransitionClass(`transition-${effect}-${direction} active`);
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setTransitionClass(`transition-${effect}-${direction}`);
        setTimeout(() => setTransitionClass(''), 50);
      }, 50);
    }, 300);
  };

  const handleMusicEnd = () => {
    if (!ritual) return;
    if (currentMusicIndex < ritual.backgroundMusic.length - 1) {
      setCurrentMusicIndex(currentMusicIndex + 1);
      savePlayState({ currentMusicIndex: currentMusicIndex + 1 });
    } else if (ritual.settings?.loopMusic) {
      setCurrentMusicIndex(0);
      savePlayState({ currentMusicIndex: 0 });
    }
  };

  const nextMusic = () => {
    if (!ritual || ritual.backgroundMusic.length === 0) return;
    const next = currentMusicIndex < ritual.backgroundMusic.length - 1 ? currentMusicIndex + 1 : 0;
    setCurrentMusicIndex(next);
    savePlayState({ currentMusicIndex: next });
    savePageState(PROGRESS_SOURCE, id, { currentStepIndex, currentMusicIndex: next });
    if (isPlaying && audioRef.current) {
      setTimeout(() => audioRef.current.play().catch(() => {}), 100);
    }
  };

  const prevMusic = () => {
    if (!ritual || ritual.backgroundMusic.length === 0) return;
    const prev = currentMusicIndex > 0 ? currentMusicIndex - 1 : ritual.backgroundMusic.length - 1;
    setCurrentMusicIndex(prev);
    savePlayState({ currentMusicIndex: prev });
    savePageState(PROGRESS_SOURCE, id, { currentStepIndex, currentMusicIndex: prev });
    if (isPlaying && audioRef.current) {
      setTimeout(() => audioRef.current.play().catch(() => {}), 100);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await playerContainerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('全屏切换失败:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (loading) {
    return (
      <div className="player-loading">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  if (!ritual || ritual.steps.length === 0) {
    return (
      <div className="player-empty">
        <button className="back-btn" onClick={() => navigate('/memorial-rituals')}>← 返回仪式列表</button>
        <div className="empty-icon">🕯️</div>
        <h2>仪式尚未配置内容</h2>
        <p>请先在编辑页面添加仪式环节</p>
        <button className="btn btn-primary" onClick={() => navigate(`/memorial-rituals/${id}/edit`)}>
          去编辑
        </button>
      </div>
    );
  }

  const currentStep = ritual.steps[currentStepIndex];
  const currentMusic = ritual.backgroundMusic[currentMusicIndex];

  return (
    <div className={`ritual-player ${transitionClass}`} ref={playerContainerRef}>
      <audio
        ref={audioRef}
        onEnded={handleMusicEnd}
        onError={(e) => console.warn('音频错误:', e)}
      />

      <div className="player-header">
        <button className="header-btn back-btn" onClick={() => {
          clearTimers();
          saveCurrentProgress();
          savePageState(PROGRESS_SOURCE, id, { currentStepIndex, currentMusicIndex });
          if (audioRef.current) audioRef.current.pause();
          savePlayState({ isPlaying: false });
          navigate(-1);
        }}>
          ← 返回
        </button>
        <div className="player-title-info">
          <h1 className="player-title">{ritual.title}</h1>
          {ritual.steps.length > 0 && (
            <div className="player-progress-info">
              <span className="progress-current">{currentStepIndex + 1}</span>
              <span className="progress-sep">/</span>
              <span className="progress-total">{ritual.steps.length}</span>
              <span className="progress-label">环节</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button
            className="header-btn"
            onClick={() => setShowMessageWall(!showMessageWall)}
            title={showMessageWall ? '隐藏祝福墙' : '显示祝福墙'}
          >
            {showMessageWall ? '💬' : '💭'}
          </button>
          <button
            className="header-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
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

      {ritual.settings?.autoAdvance && (
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${stepProgress}%` }}
          />
        </div>
      )}

      <div className="player-body">
        <div className={`step-stage ${showMessageWall ? 'with-wall' : ''}`}>
          <div className="step-content-wrapper">
            <div className="step-type-indicator">
              {currentStep.type === 'text' && '📝'}
              {currentStep.type === 'image' && '🖼️'}
              {currentStep.type === 'video' && '🎬'}
              {currentStep.type === 'audio' && '🎵'}
              {currentStep.type === 'silence' && '🙏'}
              {currentStep.type === 'custom' && '✨'}
            </div>
            <h2 className="step-title">{currentStep.title}</h2>

            {currentStep.type === 'silence' ? (
              <div className="silence-moment">
                <div className="silence-icon">
                  <div className="candle">🕯️</div>
                </div>
                <p className="silence-text">默哀时刻</p>
                <p className="silence-hint">请静心追思</p>
              </div>
            ) : (
              <>
                {currentStep.mediaUrl && (
                  <div className="step-media-container">
                    {currentStep.type === 'image' && (
                      <img src={currentStep.mediaUrl} alt={currentStep.title} className="step-media" />
                    )}
                    {currentStep.type === 'video' && (
                      <video
                        ref={el => stepMediaRefs.current[currentStep.id] = el}
                        src={currentStep.mediaUrl}
                        controls
                        autoPlay={isPlaying}
                        className="step-media"
                        onTimeUpdate={handleStepMediaTimeUpdate(currentStep.id)}
                        onEnded={handleStepMediaEnded(currentStep.id)}
                      />
                    )}
                    {currentStep.type === 'audio' && (
                      <div className="step-audio-wrapper">
                        <div className="audio-visualizer">
                          {[...Array(12)].map((_, i) => (
                            <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                          ))}
                        </div>
                        <audio
                          ref={el => stepMediaRefs.current[currentStep.id] = el}
                          src={currentStep.mediaUrl}
                          controls
                          autoPlay={isPlaying}
                          onTimeUpdate={handleStepMediaTimeUpdate(currentStep.id)}
                          onEnded={handleStepMediaEnded(currentStep.id)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {currentStep.description && (
                  <div className="step-description-container">
                    <p className="step-description">{currentStep.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showMessageWall && (
          <div className="message-wall-panel">
            <RitualMessageWall ritualId={id} />
          </div>
        )}
      </div>

      <div className="player-controls">
        <div className="controls-section steps-control">
          <button
            className="ctrl-btn step-nav"
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            title="上一环节"
          >
            <span className="ctrl-icon">⏮</span>
          </button>
          <button
            className={`ctrl-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            title={isPlaying ? '暂停' : '播放'}
          >
            <span className="ctrl-icon">{isPlaying ? '❚❚' : '▶'}</span>
          </button>
          <button
            className="ctrl-btn step-nav"
            onClick={() => goNext(false)}
            disabled={currentStepIndex === ritual.steps.length - 1}
            title="下一环节"
          >
            <span className="ctrl-icon">⏭</span>
          </button>
        </div>

        <div className="controls-section steps-dots">
          {ritual.steps.map((_, idx) => (
            <button
              key={idx}
              className={`step-dot ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}`}
              onClick={() => goToStep(idx)}
              title={`第 ${idx + 1} 环节`}
            >
              <span className="dot-label">{idx + 1}</span>
            </button>
          ))}
        </div>

        <div className="controls-section music-control">
          {ritual.backgroundMusic.length > 0 ? (
            <>
              <button className="ctrl-btn small" onClick={prevMusic} title="上一首">
                <span className="ctrl-icon">⏪</span>
              </button>
              <div className="current-music-info">
                <div className={`music-icon ${isPlaying ? 'animated' : ''}`}>
                  <span>🎵</span>
                </div>
                <div className="music-text">
                  <span className="music-title">{currentMusic?.title || '背景音乐'}</span>
                  {currentMusic?.artist && <span className="music-artist">{currentMusic.artist}</span>}
                </div>
              </div>
              <button className="ctrl-btn small" onClick={nextMusic} title="下一首">
                <span className="ctrl-icon">⏩</span>
              </button>
              <div className="volume-control">
                <button className="ctrl-btn icon-only" onClick={() => setVolume(v => v > 0 ? 0 : 0.7)} title={volume > 0 ? '静音' : '取消静音'}>
                  <span className="ctrl-icon">{volume > 0 ? '🔊' : '🔇'}</span>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>
            </>
          ) : (
            <div className="no-music-hint">
              <span className="ctrl-icon muted">🎵</span>
              <span>暂无背景音乐</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemorialRitualPlayer;
