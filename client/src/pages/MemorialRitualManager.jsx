import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { memorialRitualApi, exhibitionApi, fileApi } from '../services/api.js';
import './MemorialRitualManager.scss';

const STEP_TYPES = [
  { value: 'text', label: '文字致辞', icon: '📝' },
  { value: 'image', label: '图片展示', icon: '🖼️' },
  { value: 'video', label: '视频播放', icon: '🎬' },
  { value: 'audio', label: '音频追忆', icon: '🎵' },
  { value: 'silence', label: '默哀时刻', icon: '🙏' },
  { value: 'custom', label: '自定义环节', icon: '✨' }
];

function MemorialRitualManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exhibitions, setExhibitions] = useState([]);
  const [ritual, setRitual] = useState({
    title: '',
    description: '',
    exhibitionId: null,
    steps: [],
    backgroundMusic: [],
    settings: {
      autoAdvance: true,
      stepDuration: 10,
      loopMusic: true,
      showMessageWall: true,
      transitionEffect: 'fade'
    }
  });

  useEffect(() => {
    initPage();
  }, [id]);

  const initPage = async () => {
    try {
      const exs = await exhibitionApi.list();
      setExhibitions(exs);
      if (isEdit) {
        const data = await memorialRitualApi.get(id);
        setRitual(data);
      } else if (exs.length > 0) {
        setRitual(prev => ({ ...prev, exhibitionId: exs[0].id }));
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ritual.title.trim()) {
      alert('请输入仪式名称');
      return;
    }
    setSaving(true);
    try {
      const data = isEdit
        ? await memorialRitualApi.update(id, ritual)
        : await memorialRitualApi.create(ritual);
      alert('保存成功');
      if (!isEdit) navigate(`/memorial-rituals/${data.id}/edit`);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const updateRitual = (key, value) => {
    setRitual(prev => ({ ...prev, [key]: value }));
  };

  const updateSettings = (key, value) => {
    setRitual(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const addStep = () => {
    const newStep = {
      id: `temp_${Date.now()}`,
      title: `环节 ${ritual.steps.length + 1}`,
      description: '',
      type: 'text',
      duration: ritual.settings.stepDuration,
      mediaUrl: '',
      order: ritual.steps.length
    };
    updateRitual('steps', [...ritual.steps, newStep]);
  };

  const updateStep = (stepId, key, value) => {
    updateRitual('steps', ritual.steps.map(s =>
      s.id === stepId ? { ...s, [key]: value } : s
    ));
  };

  const removeStep = async (stepId) => {
    if (!confirm('确定要删除这个环节吗？')) return;
    if (!stepId.startsWith('temp_')) {
      try {
        await memorialRitualApi.removeStep(id, stepId);
      } catch (err) {
        console.error('删除步骤失败:', err);
      }
    }
    updateRitual('steps', ritual.steps.filter(s => s.id !== stepId));
  };

  const moveStep = (index, direction) => {
    const newSteps = [...ritual.steps];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    newSteps.forEach((s, i) => s.order = i);
    updateRitual('steps', newSteps);
  };

  const addMusic = () => {
    const newMusic = {
      id: `temp_m_${Date.now()}`,
      title: `背景音乐 ${ritual.backgroundMusic.length + 1}`,
      url: '',
      artist: '',
      duration: 0,
      order: ritual.backgroundMusic.length
    };
    updateRitual('backgroundMusic', [...ritual.backgroundMusic, newMusic]);
  };

  const updateMusic = (musicId, key, value) => {
    updateRitual('backgroundMusic', ritual.backgroundMusic.map(m =>
      m.id === musicId ? { ...m, [key]: value } : m
    ));
  };

  const removeMusic = async (musicId) => {
    if (!confirm('确定要删除这首音乐吗？')) return;
    if (!musicId.startsWith('temp_')) {
      try {
        await memorialRitualApi.removeMusic(id, musicId);
      } catch (err) {
        console.error('删除音乐失败:', err);
      }
    }
    updateRitual('backgroundMusic', ritual.backgroundMusic.filter(m => m.id !== musicId));
  };

  const moveMusic = (index, direction) => {
    const newMusic = [...ritual.backgroundMusic];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newMusic.length) return;
    [newMusic[index], newMusic[targetIndex]] = [newMusic[targetIndex], newMusic[index]];
    newMusic.forEach((m, i) => m.order = i);
    updateRitual('backgroundMusic', newMusic);
  };

  const handleMediaUpload = async (files, stepId) => {
    try {
      const uploaded = await fileApi.upload(Array.from(files));
      if (uploaded.length > 0) {
        updateStep(stepId, 'mediaUrl', uploaded[0].url);
      }
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败，请重试');
    }
  };

  const handleMusicUpload = async (files, musicId) => {
    try {
      const uploaded = await fileApi.upload(Array.from(files));
      if (uploaded.length > 0) {
        updateMusic(musicId, 'url', uploaded[0].url);
      }
    } catch (err) {
      console.error('上传失败:', err);
      alert('上传失败，请重试');
    }
  };

  const getStepTypeInfo = (type) => STEP_TYPES.find(t => t.value === type) || STEP_TYPES[0];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="memorial-ritual-manager">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="page-title">
          <span className="title-icon">🕯️</span>
          {isEdit ? '编辑纪念仪式' : '创建纪念仪式'}
        </h1>
        <p className="page-desc">配置仪式流程、背景音乐和播放设置</p>
      </div>

      <div className="manager-layout">
        <div className="main-panel">
          <div className="form-section">
            <label className="section-label">基本信息</label>
            <div className="form-card">
              <div className="form-group">
                <label>仪式名称 *</label>
                <input
                  type="text"
                  value={ritual.title}
                  onChange={(e) => updateRitual('title', e.target.value)}
                  placeholder="例如：清明节纪念仪式"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>关联展厅</label>
                <select
                  value={ritual.exhibitionId || ''}
                  onChange={(e) => updateRitual('exhibitionId', e.target.value || null)}
                  className="form-input"
                >
                  <option value="">不关联</option>
                  {exhibitions.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>仪式简介</label>
                <textarea
                  value={ritual.description}
                  onChange={(e) => updateRitual('description', e.target.value)}
                  placeholder="描述仪式的背景和意义..."
                  rows={4}
                  className="form-input textarea"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <label className="section-label">仪式流程（{ritual.steps.length} 个环节）</label>
              <button className="btn btn-primary btn-sm" onClick={addStep}>
                <span>+</span> 添加环节
              </button>
            </div>
            <div className="steps-container">
              {ritual.steps.length === 0 ? (
                <div className="empty-steps">
                  <div className="empty-icon">📋</div>
                  <p>还没有设置仪式环节</p>
                  <button className="btn btn-outline" onClick={addStep}>添加第一个环节</button>
                </div>
              ) : (
                <div className="steps-list">
                  {ritual.steps.map((step, index) => {
                    const typeInfo = getStepTypeInfo(step.type);
                    return (
                      <div key={step.id} className="step-card" draggable>
                        <div className="step-header">
                          <div className="step-order">
                            <span className="order-badge">{index + 1}</span>
                            <span className="step-type-badge">{typeInfo.icon} {typeInfo.label}</span>
                          </div>
                          <div className="step-actions">
                            <button className="icon-btn" onClick={() => moveStep(index, -1)} disabled={index === 0}>↑</button>
                            <button className="icon-btn" onClick={() => moveStep(index, 1)} disabled={index === ritual.steps.length - 1}>↓</button>
                            <button className="icon-btn danger" onClick={() => removeStep(step.id)}>×</button>
                          </div>
                        </div>
                        <div className="step-body">
                          <div className="form-row">
                            <div className="form-group flex-1">
                              <label>环节标题</label>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>类型</label>
                              <select
                                value={step.type}
                                onChange={(e) => updateStep(step.id, 'type', e.target.value)}
                                className="form-input"
                              >
                                {STEP_TYPES.map(t => (
                                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group" style={{ width: '120px' }}>
                              <label>时长(秒)</label>
                              <input
                                type="number"
                                min="1"
                                value={step.duration}
                                onChange={(e) => updateStep(step.id, 'duration', parseInt(e.target.value) || 10)}
                                className="form-input"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>环节描述 / 致辞内容</label>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                              rows={3}
                              className="form-input textarea"
                              placeholder="输入这个环节的描述文字或致辞内容..."
                            />
                          </div>
                          {['image', 'video', 'audio'].includes(step.type) && (
                            <div className="form-group">
                              <label>媒体文件</label>
                              {step.mediaUrl ? (
                                <div className="media-preview">
                                  {step.type === 'image' && <img src={step.mediaUrl} alt="" />}
                                  {step.type === 'video' && <video src={step.mediaUrl} controls />}
                                  {step.type === 'audio' && <audio src={step.mediaUrl} controls />}
                                  <div className="media-actions">
                                    <button className="btn btn-sm btn-outline" onClick={() => updateStep(step.id, 'mediaUrl', '')}>移除</button>
                                  </div>
                                </div>
                              ) : (
                                <label className="upload-zone">
                                  <input
                                    type="file"
                                    accept={step.type === 'image' ? 'image/*' : step.type === 'video' ? 'video/*' : 'audio/*'}
                                    onChange={(e) => handleMediaUpload(e.target.files, step.id)}
                                    style={{ display: 'none' }}
                                  />
                                  <div className="upload-content">
                                    <span className="upload-icon">📁</span>
                                    <span>点击上传{step.type === 'image' ? '图片' : step.type === 'video' ? '视频' : '音频'}文件</span>
                                  </div>
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <label className="section-label">背景音乐串联（{ritual.backgroundMusic.length} 首）</label>
              <button className="btn btn-primary btn-sm" onClick={addMusic}>
                <span>+</span> 添加音乐
              </button>
            </div>
            <div className="music-container">
              {ritual.backgroundMusic.length === 0 ? (
                <div className="empty-music">
                  <div className="empty-icon">🎵</div>
                  <p>还没有添加背景音乐</p>
                  <button className="btn btn-outline" onClick={addMusic}>添加第一首音乐</button>
                </div>
              ) : (
                <div className="music-list">
                  {ritual.backgroundMusic.map((music, index) => (
                    <div key={music.id} className="music-card">
                      <div className="music-order">
                        <span className="order-badge small">{index + 1}</span>
                      </div>
                      <div className="music-info">
                        <input
                          type="text"
                          value={music.title}
                          onChange={(e) => updateMusic(music.id, 'title', e.target.value)}
                          className="form-input music-title-input"
                          placeholder="歌曲名称"
                        />
                        <input
                          type="text"
                          value={music.artist}
                          onChange={(e) => updateMusic(music.id, 'artist', e.target.value)}
                          className="form-input music-artist-input"
                          placeholder="艺术家（可选）"
                        />
                      </div>
                      <div className="music-source">
                        {music.url ? (
                          <div className="music-player">
                            <audio src={music.url} controls />
                            <button className="btn btn-sm btn-outline" onClick={() => updateMusic(music.id, 'url', '')}>移除</button>
                          </div>
                        ) : (
                          <label className="upload-zone small">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleMusicUpload(e.target.files, music.id)}
                              style={{ display: 'none' }}
                            />
                            <span>🎧 上传音频</span>
                          </label>
                        )}
                      </div>
                      <div className="music-actions">
                        <button className="icon-btn" onClick={() => moveMusic(index, -1)} disabled={index === 0}>↑</button>
                        <button className="icon-btn" onClick={() => moveMusic(index, 1)} disabled={index === ritual.backgroundMusic.length - 1}>↓</button>
                        <button className="icon-btn danger" onClick={() => removeMusic(music.id)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="form-section">
            <label className="section-label">播放设置</label>
            <div className="form-card settings-card">
              <div className="setting-item">
                <label className="toggle-label">
                  <span>自动切换环节</span>
                  <span className="setting-desc">到时后自动进入下一环节</span>
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={ritual.settings.autoAdvance}
                    onChange={(e) => updateSettings('autoAdvance', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <label className="toggle-label">
                  <span>循环播放音乐</span>
                  <span className="setting-desc">音乐列表结束后从头开始</span>
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={ritual.settings.loopMusic}
                    onChange={(e) => updateSettings('loopMusic', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <label className="toggle-label">
                  <span>显示留言祝福墙</span>
                  <span className="setting-desc">仪式中允许观众留言</span>
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={ritual.settings.showMessageWall}
                    onChange={(e) => updateSettings('showMessageWall', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="form-group">
                <label>默认环节时长（秒）</label>
                <input
                  type="number"
                  min="1"
                  value={ritual.settings.stepDuration}
                  onChange={(e) => updateSettings('stepDuration', parseInt(e.target.value) || 10)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>转场效果</label>
                <select
                  value={ritual.settings.transitionEffect}
                  onChange={(e) => updateSettings('transitionEffect', e.target.value)}
                  className="form-input"
                >
                  <option value="fade">淡入淡出</option>
                  <option value="slide">滑动</option>
                  <option value="zoom">缩放</option>
                  <option value="none">无效果</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">操作</label>
            <div className="action-card">
              <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '💾 保存仪式'}
              </button>
              {isEdit && (
                <Link to={`/memorial-rituals/${id}/player`} className="btn btn-success btn-block">
                  ▶️ 开始播放
                </Link>
              )}
              <Link to="/memorial-rituals" className="btn btn-outline btn-block">
                📜 仪式列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemorialRitualManager;
