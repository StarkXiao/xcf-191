import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { characterProfileApi } from '../services/api.js';
import './CharacterProfileHome.scss';

const STATUS_MAP = {
  alive: { name: '存活', icon: '💚', color: '#98fb98' },
  dead: { name: '死亡', icon: '💀', color: '#ff6347' },
  missing: { name: '失踪', icon: '❓', color: '#ffd700' },
  unknown: { name: '未知', icon: '🌫️', color: '#8080a0' }
};

const ROLE_MAP = {
  protagonist: { name: '主角', color: '#ffd700' },
  supporting: { name: '配角', color: '#87ceeb' },
  key_npc: { name: '关键NPC', color: '#dda0dd' }
};

const ENDING_TYPE_MAP = {
  true: { name: '真结局', icon: '👑', color: '#ffd700' },
  good: { name: '好结局', icon: '🌟', color: '#98fb98' },
  normal: { name: '普通结局', icon: '📜', color: '#87ceeb' },
  bad: { name: '坏结局', icon: '💀', color: '#ff6347' },
  hidden: { name: '隐藏结局', icon: '🔮', color: '#dda0dd' }
};

function CharacterProfileHome() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [endings, setEndings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('characters');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dash, profs, ends] = await Promise.all([
        characterProfileApi.getDashboard(),
        characterProfileApi.listProfiles(),
        characterProfileApi.listEndings()
      ]);
      setDashboard(dash);
      setProfiles(profs);
      setEndings(ends);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定要删除此角色吗？相关的关系和结局条件也将被清理。')) return;
    try {
      await characterProfileApi.removeProfile(id);
      loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="cp-loading">
        <div className="loading-spinner"></div>
        <span>雾气散开中...</span>
      </div>
    );
  }

  return (
    <div className="character-profile-home">
      <div className="cp-header">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回首页</button>
        <h1 className="cp-title">
          <span className="title-icon">🌫️</span>
          雾城人物侧写
        </h1>
        <p className="cp-subtitle">拨开迷雾，洞悉每一个灵魂的轨迹</p>
      </div>

      {dashboard && (
        <div className="cp-dashboard">
          <div className="dash-stat">
            <span className="dash-icon">👤</span>
            <span className="dash-value">{dashboard.totalCharacters}</span>
            <span className="dash-label">侧写角色</span>
          </div>
          <div className="dash-stat">
            <span className="dash-icon">🌱</span>
            <span className="dash-value">{dashboard.totalGrowth}</span>
            <span className="dash-label">成长记录</span>
          </div>
          <div className="dash-stat">
            <span className="dash-icon">🤝</span>
            <span className="dash-value">{dashboard.totalRelationships}</span>
            <span className="dash-label">关系纽带</span>
          </div>
          <div className="dash-stat">
            <span className="dash-icon">⚖️</span>
            <span className="dash-value">{dashboard.totalDecisions}</span>
            <span className="dash-label">关键抉择</span>
          </div>
          <div className="dash-stat accent">
            <span className="dash-icon">🎭</span>
            <span className="dash-value">{dashboard.unlockedEndings}/{dashboard.totalEndings}</span>
            <span className="dash-label">结局解锁</span>
          </div>
        </div>
      )}

      <div className="cp-tabs">
        <button className={`cp-tab ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>
          👤 角色档案
        </button>
        <button className={`cp-tab ${activeTab === 'endings' ? 'active' : ''}`} onClick={() => setActiveTab('endings')}>
          🎭 结局追踪
        </button>
      </div>

      {activeTab === 'characters' && (
        <div className="cp-content">
          <div className="section-toolbar">
            <h2 className="section-title">角色档案</h2>
            <button className="create-btn" onClick={() => navigate('/character-profiles/create')}>
              <span>+</span> 新建角色
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="cp-empty">
              <div className="empty-icon">🌫️</div>
              <h3>迷雾中尚无人影</h3>
              <p>创建第一个角色，开始书写雾城的故事</p>
              <button className="primary-btn" onClick={() => navigate('/character-profiles/create')}>
                创建角色
              </button>
            </div>
          ) : (
            <div className="profile-grid">
              {profiles.map(profile => {
                const statusInfo = STATUS_MAP[profile.status] || STATUS_MAP.unknown;
                const roleInfo = ROLE_MAP[profile.role] || ROLE_MAP.supporting;
                return (
                  <div key={profile.id} className="profile-card" onClick={() => navigate(`/character-profiles/${profile.id}`)}>
                    <div className="card-banner">
                      {profile.coverImage ? (
                        <img src={profile.coverImage} alt={profile.name} />
                      ) : (
                        <div className="banner-placeholder">
                          <span>🌫️</span>
                        </div>
                      )}
                      <div className="status-badge" style={{ background: statusInfo.color }}>
                        {statusInfo.icon} {statusInfo.name}
                      </div>
                      <button className="card-delete" onClick={(e) => handleDelete(profile.id, e)}>✕</button>
                    </div>
                    <div className="card-body">
                      <div className="card-name-row">
                        <h3 className="card-name">{profile.name}</h3>
                        <span className="role-tag" style={{ borderColor: roleInfo.color, color: roleInfo.color }}>
                          {roleInfo.name}
                        </span>
                      </div>
                      {profile.alias && <p className="card-alias">「{profile.alias}」</p>}
                      {profile.faction && <p className="card-faction">🏯 {profile.faction}</p>}
                      <div className="card-stats">
                        <span title="成长经历">🌱 {profile.growthCount}</span>
                        <span title="关系">🤝 {profile.relationshipCount}</span>
                        <span title="抉择">⚖️ {profile.decisionCount}</span>
                      </div>
                      {profile.personality && profile.personality.length > 0 && (
                        <div className="card-tags">
                          {profile.personality.slice(0, 3).map((p, i) => (
                            <span key={i} className="personality-tag">{p}</span>
                          ))}
                          {profile.personality.length > 3 && <span className="more-tag">+{profile.personality.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'endings' && (
        <div className="cp-content">
          <div className="section-toolbar">
            <h2 className="section-title">结局追踪</h2>
            <button className="create-btn" onClick={() => navigate('/character-profiles/endings/create')}>
              <span>+</span> 新建结局
            </button>
          </div>

          {endings.length === 0 ? (
            <div className="cp-empty">
              <div className="empty-icon">🎭</div>
              <h3>尚无结局记录</h3>
              <p>创建主线结局，设定解锁条件</p>
              <button className="primary-btn" onClick={() => navigate('/character-profiles/endings/create')}>
                创建结局
              </button>
            </div>
          ) : (
            <div className="endings-grid">
              {endings.map(ending => {
                const typeInfo = ENDING_TYPE_MAP[ending.type] || ENDING_TYPE_MAP.normal;
                return (
                  <div key={ending.id} className={`ending-card ${ending.isUnlocked ? 'unlocked' : 'locked'}`} onClick={() => navigate(`/character-profiles/endings/${ending.id}`)}>
                    <div className="ending-type-badge" style={{ background: typeInfo.color }}>
                      {typeInfo.icon} {typeInfo.name}
                    </div>
                    <div className="ending-icon">
                      {ending.isUnlocked ? '🔓' : '🔒'}
                    </div>
                    <h3 className="ending-name">{ending.name}</h3>
                    <p className="ending-desc">{ending.description || '暂无描述'}</p>
                    <div className="ending-progress-wrap">
                      <div className="ending-progress-bar">
                        <div className="ending-progress-fill" style={{ width: `${Math.round(ending.unlockProgress * 100)}%`, background: typeInfo.color }} />
                      </div>
                      <span className="ending-progress-text">{Math.round(ending.unlockProgress * 100)}%</span>
                    </div>
                    {ending.isUnlocked && <div className="ending-unlocked-label">✓ 已解锁</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CharacterProfileHome;
