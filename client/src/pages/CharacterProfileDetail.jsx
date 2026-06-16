import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterProfileApi } from '../services/api.js';
import './CharacterProfileDetail.scss';

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

const IMPACT_MAP = {
  minor: { name: '微末', color: '#8080a0' },
  moderate: { name: '中等', color: '#87ceeb' },
  major: { name: '重大', color: '#ffd700' },
  critical: { name: '转折', color: '#ff6347' }
};

const RELATION_ICON_MAP = {
  ally: '🤝', rival: '⚔️', mentor: '🎓', student: '📖',
  family: '👨‍👩‍👧', lover: '💕', comrade: '🛡️', suspect: '🔍',
  benefactor: '🌟', beneficiary: '🙏'
};

const GROWTH_STAGE_MAP = {
  origin: { name: '起源', icon: '🌱', color: '#E6F3FF' },
  awakening: { name: '觉醒', icon: '⚡', color: '#FFF8DC' },
  struggle: { name: '磨砺', icon: '🔥', color: '#FFE4E1' },
  turning: { name: '蜕变', icon: '🦋', color: '#F0E6FF' },
  zenith: { name: '巅峰', icon: '🏔️', color: '#E8FFE8' },
  twilight: { name: '暮年', icon: '🌅', color: '#FFEFD5' }
};

function CharacterProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('growth');

  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [showRelForm, setShowRelForm] = useState(false);
  const [showDecForm, setShowDecForm] = useState(false);
  const [showRelEditor, setShowRelEditor] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);

  const [growthForm, setGrowthForm] = useState({ title: '', description: '', year: '', age: '', stage: 'origin', impact: 'moderate' });
  const [relForm, setRelForm] = useState({ targetCharacterId: '', type: 'ally', description: '' });
  const [decForm, setDecForm] = useState({ title: '', description: '', year: '', impact: 'major', options: '', chosenOption: '', consequence: '' });
  const [evoForm, setEvoForm] = useState({ year: '', newType: 'ally', reason: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [prof, m, allProfs] = await Promise.all([
        characterProfileApi.getProfile(id),
        characterProfileApi.getMeta(),
        characterProfileApi.listProfiles()
      ]);
      setProfile(prof);
      setMeta(m);
      setAllProfiles(allProfs.filter(p => p.id !== id));
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrowth = async () => {
    try {
      await characterProfileApi.addGrowth(id, {
        ...growthForm,
        year: growthForm.year ? parseInt(growthForm.year) : null,
        age: growthForm.age ? parseInt(growthForm.age) : null
      });
      setShowGrowthForm(false);
      setGrowthForm({ title: '', description: '', year: '', age: '', stage: 'origin', impact: 'moderate' });
      loadData();
    } catch (err) {
      console.error('添加成长经历失败:', err);
    }
  };

  const handleDeleteGrowth = async (growthId) => {
    if (!confirm('确定删除此成长经历？')) return;
    try {
      await characterProfileApi.removeGrowth(id, growthId);
      loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleAddRelationship = async () => {
    try {
      await characterProfileApi.addRelationship(id, relForm);
      setShowRelForm(false);
      setRelForm({ targetCharacterId: '', type: 'ally', description: '' });
      loadData();
    } catch (err) {
      console.error('添加关系失败:', err);
    }
  };

  const handleDeleteRelationship = async (relId) => {
    if (!confirm('确定删除此关系？')) return;
    try {
      await characterProfileApi.removeRelationship(id, relId);
      loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleOpenRelEditor = (rel, e) => {
    if (e) e.stopPropagation();
    setShowRelEditor(rel);
    setEvoForm({ year: '', newType: rel.currentType || rel.type, reason: '' });
  };

  const handleAddEvolution = async () => {
    if (!showRelEditor || !evoForm.newType) return;
    try {
      const newEvolution = {
        year: evoForm.year ? parseInt(evoForm.year) : null,
        from: showRelEditor.currentType || showRelEditor.type,
        to: evoForm.newType,
        reason: evoForm.reason || ''
      };
      await characterProfileApi.updateRelationship(id, showRelEditor.id, {
        type: evoForm.newType,
        currentType: evoForm.newType,
        newEvolution
      });
      setShowRelEditor(null);
      setEvoForm({ year: '', newType: 'ally', reason: '' });
      loadData();
    } catch (err) {
      console.error('添加关系变化失败:', err);
    }
  };

  const handleUpdateRelDesc = async (newDesc) => {
    if (!showRelEditor) return;
    try {
      await characterProfileApi.updateRelationship(id, showRelEditor.id, {
        description: newDesc
      });
      loadData();
      setShowRelEditor({ ...showRelEditor, description: newDesc });
    } catch (err) {
      console.error('更新关系描述失败:', err);
    }
  };

  const handleAddDecision = async () => {
    try {
      const options = decForm.options
        ? decForm.options.split('\n').map((line, i) => ({ label: line.trim(), index: i }))
        : [];
      await characterProfileApi.addDecision(id, {
        ...decForm,
        year: decForm.year ? parseInt(decForm.year) : null,
        options,
        relatedEndingIds: [],
        impactOnRelationships: []
      });
      setShowDecForm(false);
      setDecForm({ title: '', description: '', year: '', impact: 'major', options: '', chosenOption: '', consequence: '' });
      loadData();
    } catch (err) {
      console.error('添加抉择失败:', err);
    }
  };

  const handleDeleteDecision = async (decId) => {
    if (!confirm('确定删除此抉择记录？')) return;
    try {
      await characterProfileApi.removeDecision(id, decId);
      loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleChooseOption = async (decId, optionLabel) => {
    try {
      const dec = profile.keyDecisions.find(d => d.id === decId);
      if (!dec) return;
      await characterProfileApi.updateDecision(id, decId, { ...dec, chosenOption: optionLabel });
      loadData();
    } catch (err) {
      console.error('更新抉择失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="cpd-loading">
        <div className="loading-spinner"></div>
        <span>翻阅档案中...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="cpd-not-found">
        <div className="not-found-icon">🌫️</div>
        <h2>角色档案未找到</h2>
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>返回侧写馆</button>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[profile.status] || STATUS_MAP.unknown;
  const roleInfo = ROLE_MAP[profile.role] || ROLE_MAP.supporting;
  const growths = profile.growthExperiences || [];
  const relationships = profile.relationships || [];
  const decisions = profile.keyDecisions || [];

  const growthsByStage = (meta?.growthStages || []).map(stage => ({
    ...stage,
    items: growths.filter(g => g.stage === stage.key)
  })).filter(s => s.items.length > 0);

  return (
    <div className="character-profile-detail">
      <div className="cpd-hero">
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>← 返回侧写馆</button>
        <div className="hero-content">
          <div className="hero-avatar">
            {profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span className="avatar-placeholder">👤</span>}
          </div>
          <div className="hero-info">
            <div className="hero-name-row">
              <h1 className="hero-name">{profile.name}</h1>
              <span className="role-badge" style={{ borderColor: roleInfo.color, color: roleInfo.color }}>{roleInfo.name}</span>
              <span className="status-badge" style={{ background: statusInfo.color, color: '#000' }}>{statusInfo.icon} {statusInfo.name}</span>
            </div>
            {profile.alias && <p className="hero-alias">「{profile.alias}」</p>}
            <div className="hero-meta">
              {profile.faction && <span className="meta-item">🏯 {profile.faction}</span>}
              {profile.birthYear && <span className="meta-item">📅 生于 {profile.birthYear}年</span>}
              {profile.deathYear && <span className="meta-item">💀 卒于 {profile.deathYear}年</span>}
            </div>
            {profile.personality && profile.personality.length > 0 && (
              <div className="hero-personality">
                {profile.personality.map((p, i) => <span key={i} className="personality-tag">{p}</span>)}
              </div>
            )}
            {profile.background && <p className="hero-background">{profile.background}</p>}
          </div>
          <button className="edit-btn" onClick={() => navigate(`/character-profiles/${id}/edit`)}>✎ 编辑</button>
        </div>
      </div>

      <div className="cpd-section-tabs">
        <button className={`section-tab ${activeSection === 'growth' ? 'active' : ''}`} onClick={() => setActiveSection('growth')}>
          🌱 成长经历 <span className="tab-count">{growths.length}</span>
        </button>
        <button className={`section-tab ${activeSection === 'relationships' ? 'active' : ''}`} onClick={() => setActiveSection('relationships')}>
          🤝 关系图谱 <span className="tab-count">{relationships.length}</span>
        </button>
        <button className={`section-tab ${activeSection === 'decisions' ? 'active' : ''}`} onClick={() => setActiveSection('decisions')}>
          ⚖️ 关键抉择 <span className="tab-count">{decisions.length}</span>
        </button>
      </div>

      {activeSection === 'growth' && (
        <div className="cpd-section">
          <div className="section-toolbar">
            <h2 className="section-title">成长经历</h2>
            <button className="add-btn" onClick={() => setShowGrowthForm(!showGrowthForm)}>
              {showGrowthForm ? '取消' : '+ 添加经历'}
            </button>
          </div>

          {showGrowthForm && (
            <div className="inline-form">
              <div className="form-row">
                <input className="form-input" placeholder="经历标题" value={growthForm.title} onChange={e => setGrowthForm({ ...growthForm, title: e.target.value })} />
                <select className="form-select" value={growthForm.stage} onChange={e => setGrowthForm({ ...growthForm, stage: e.target.value })}>
                  {(meta?.growthStages || []).map(s => <option key={s.key} value={s.key}>{s.icon} {s.name}</option>)}
                </select>
                <select className="form-select" value={growthForm.impact} onChange={e => setGrowthForm({ ...growthForm, impact: e.target.value })}>
                  {(meta?.decisionImpacts || []).map(i => <option key={i.key} value={i.key}>{i.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <input className="form-input short" placeholder="年份" value={growthForm.year} onChange={e => setGrowthForm({ ...growthForm, year: e.target.value })} />
                <input className="form-input short" placeholder="年龄" value={growthForm.age} onChange={e => setGrowthForm({ ...growthForm, age: e.target.value })} />
              </div>
              <textarea className="form-textarea" placeholder="详细描述这段经历..." value={growthForm.description} onChange={e => setGrowthForm({ ...growthForm, description: e.target.value })} />
              <div className="form-actions">
                <button className="form-cancel" onClick={() => setShowGrowthForm(false)}>取消</button>
                <button className="form-submit" onClick={handleAddGrowth} disabled={!growthForm.title}>保存经历</button>
              </div>
            </div>
          )}

          {growths.length === 0 ? (
            <div className="section-empty">
              <span className="empty-icon">🌱</span>
              <p>尚无成长经历记录</p>
            </div>
          ) : (
            <div className="growth-timeline">
              {growthsByStage.map(stage => (
                <div key={stage.key} className="growth-stage-group">
                  <div className="stage-header" style={{ '--stage-color': stage.color }}>
                    <span className="stage-icon">{stage.icon}</span>
                    <h3 className="stage-name">{stage.name}</h3>
                    <span className="stage-count">{stage.items.length} 段经历</span>
                  </div>
                  <div className="stage-items">
                    {stage.items.map(g => {
                      const impactInfo = IMPACT_MAP[g.impact] || IMPACT_MAP.moderate;
                      return (
                        <div key={g.id} className="growth-item" style={{ borderLeftColor: impactInfo.color }}>
                          <div className="growth-header">
                            <h4 className="growth-title">{g.title}</h4>
                            <span className="impact-badge" style={{ background: impactInfo.color, color: '#000' }}>{impactInfo.name}</span>
                            <button className="item-delete" onClick={() => handleDeleteGrowth(g.id)}>✕</button>
                          </div>
                          {g.year && <span className="growth-year">📅 {g.year}年{g.age ? ` (${g.age}岁)` : ''}</span>}
                          <p className="growth-desc">{g.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {growthsByStage.length === 0 && growths.length > 0 && (
                <div className="growth-list-plain">
                  {growths.map(g => {
                    const impactInfo = IMPACT_MAP[g.impact] || IMPACT_MAP.moderate;
                    return (
                      <div key={g.id} className="growth-item" style={{ borderLeftColor: impactInfo.color }}>
                        <div className="growth-header">
                          <h4 className="growth-title">{g.title}</h4>
                          <span className="impact-badge" style={{ background: impactInfo.color, color: '#000' }}>{impactInfo.name}</span>
                          <button className="item-delete" onClick={() => handleDeleteGrowth(g.id)}>✕</button>
                        </div>
                        {g.year && <span className="growth-year">📅 {g.year}年{g.age ? ` (${g.age}岁)` : ''}</span>}
                        <p className="growth-desc">{g.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSection === 'relationships' && (
        <div className="cpd-section">
          <div className="section-toolbar">
            <h2 className="section-title">关系图谱</h2>
            <button className="add-btn" onClick={() => setShowRelForm(!showRelForm)}>
              {showRelForm ? '取消' : '+ 添加关系'}
            </button>
          </div>

          {showRelForm && (
            <div className="inline-form">
              <div className="form-row">
                <select className="form-select" value={relForm.targetCharacterId} onChange={e => setRelForm({ ...relForm, targetCharacterId: e.target.value })}>
                  <option value="">选择目标角色</option>
                  {allProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="form-select" value={relForm.type} onChange={e => setRelForm({ ...relForm, type: e.target.value })}>
                  {(meta?.relationTypes || []).map(r => <option key={r.key} value={r.key}>{r.icon} {r.name}</option>)}
                </select>
              </div>
              <input className="form-input" placeholder="关系描述" value={relForm.description} onChange={e => setRelForm({ ...relForm, description: e.target.value })} />
              <div className="form-actions">
                <button className="form-cancel" onClick={() => setShowRelForm(false)}>取消</button>
                <button className="form-submit" onClick={handleAddRelationship} disabled={!relForm.targetCharacterId}>保存关系</button>
              </div>
            </div>
          )}

          {relationships.length === 0 ? (
            <div className="section-empty">
              <span className="empty-icon">🤝</span>
              <p>尚无关系记录</p>
            </div>
          ) : (
            <div className="relationships-grid">
              {relationships.map(rel => {
                const relIcon = RELATION_ICON_MAP[rel.currentType || rel.type] || '🔗';
                const evolutions = rel.evolution || [];
                return (
                  <div key={rel.id} className="rel-card">
                    <div className="rel-card-inner" onClick={() => rel.targetCharacterId && navigate(`/character-profiles/${rel.targetCharacterId}`)}>
                      <div className="rel-avatar">
                        {rel.targetAvatar ? <img src={rel.targetAvatar} alt={rel.targetName} /> : <span>👤</span>}
                      </div>
                      <div className="rel-info">
                        <div className="rel-name-row">
                          <h4 className="rel-name">{rel.targetName}</h4>
                          <button className="rel-edit-btn" onClick={(e) => handleOpenRelEditor(rel, e)}>✎ 编辑</button>
                        </div>
                        <span className="rel-type">{relIcon} {(meta?.relationTypes || []).find(r => r.key === (rel.currentType || rel.type))?.name || rel.currentType || rel.type}</span>
                        {rel.description && <p className="rel-desc">{rel.description}</p>}
                        {evolutions.length > 0 && (
                          <div className="rel-evo-preview">
                            <span className="evo-count">📜 {evolutions.length} 次关系变化</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="item-delete" onClick={(e) => { e.stopPropagation(); handleDeleteRelationship(rel.id); }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSection === 'decisions' && (
        <div className="cpd-section">
          <div className="section-toolbar">
            <h2 className="section-title">关键抉择</h2>
            <button className="add-btn" onClick={() => setShowDecForm(!showDecForm)}>
              {showDecForm ? '取消' : '+ 添加抉择'}
            </button>
          </div>

          {showDecForm && (
            <div className="inline-form">
              <div className="form-row">
                <input className="form-input" placeholder="抉择标题" value={decForm.title} onChange={e => setDecForm({ ...decForm, title: e.target.value })} />
                <select className="form-select" value={decForm.impact} onChange={e => setDecForm({ ...decForm, impact: e.target.value })}>
                  {(meta?.decisionImpacts || []).map(i => <option key={i.key} value={i.key}>{i.name}</option>)}
                </select>
                <input className="form-input short" placeholder="年份" value={decForm.year} onChange={e => setDecForm({ ...decForm, year: e.target.value })} />
              </div>
              <textarea className="form-textarea" placeholder="抉择描述..." value={decForm.description} onChange={e => setDecForm({ ...decForm, description: e.target.value })} />
              <textarea className="form-textarea" placeholder="选项列表（每行一个选项）" value={decForm.options} onChange={e => setDecForm({ ...decForm, options: e.target.value })} />
              <textarea className="form-textarea" placeholder="抉择后果..." value={decForm.consequence} onChange={e => setDecForm({ ...decForm, consequence: e.target.value })} />
              <div className="form-actions">
                <button className="form-cancel" onClick={() => setShowDecForm(false)}>取消</button>
                <button className="form-submit" onClick={handleAddDecision} disabled={!decForm.title}>保存抉择</button>
              </div>
            </div>
          )}

          {decisions.length === 0 ? (
            <div className="section-empty">
              <span className="empty-icon">⚖️</span>
              <p>尚无关键抉择记录</p>
            </div>
          ) : (
            <div className="decisions-list">
              {decisions.map(dec => {
                const impactInfo = IMPACT_MAP[dec.impact] || IMPACT_MAP.major;
                return (
                  <div key={dec.id} className="decision-card" style={{ borderLeftColor: impactInfo.color }}>
                    <div className="dec-header">
                      <h4 className="dec-title">{dec.title}</h4>
                      <span className="impact-badge" style={{ background: impactInfo.color, color: '#000' }}>{impactInfo.name}</span>
                      {dec.year && <span className="dec-year">📅 {dec.year}年</span>}
                      <button className="item-delete" onClick={() => handleDeleteDecision(dec.id)}>✕</button>
                    </div>
                    <p className="dec-desc">{dec.description}</p>
                    {dec.options && dec.options.length > 0 && (
                      <div className="dec-options">
                        {dec.options.map((opt, i) => (
                          <button
                            key={i}
                            className={`dec-option ${dec.chosenOption === opt.label ? 'chosen' : ''}`}
                            onClick={() => handleChooseOption(dec.id, opt.label)}
                          >
                            {dec.chosenOption === opt.label && <span className="chosen-mark">✓</span>}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {dec.consequence && (
                      <div className="dec-consequence">
                        <span className="consequence-label">后果</span>
                        <p>{dec.consequence}</p>
                      </div>
                    )}
                    {dec.relatedEndingIds && dec.relatedEndingIds.length > 0 && (
                      <div className="dec-endings">
                        <span className="endings-label">关联结局</span>
                        {dec.relatedEndingIds.map((eid, i) => <span key={i} className="ending-ref">🎭 {eid}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showRelEditor && (
        <div className="rel-editor-modal" onClick={() => setShowRelEditor(null)}>
          <div className="rel-editor-content" onClick={e => e.stopPropagation()}>
            <div className="rel-editor-header">
              <h3 className="rel-editor-title">关系编辑 - {showRelEditor.targetName}</h3>
              <button className="rel-editor-close" onClick={() => setShowRelEditor(null)}>✕</button>
            </div>

            <div className="rel-editor-body">
              <div className="rel-editor-section">
                <h4 className="sub-title">关系描述</h4>
                <textarea
                  className="form-textarea"
                  value={showRelEditor.description || ''}
                  onChange={e => setShowRelEditor({ ...showRelEditor, description: e.target.value })}
                  onBlur={e => handleUpdateRelDesc(e.target.value)}
                  placeholder="描述这段关系的特点..."
                  rows={2}
                />
              </div>

              <div className="rel-editor-section">
                <div className="section-header-row">
                  <h4 className="sub-title">关系变化时间线</h4>
                  <span className="current-relation-badge">
                    当前：{(meta?.relationTypes || []).find(r => r.key === (showRelEditor.currentType || showRelEditor.type))?.icon || '🔗'}
                    {(meta?.relationTypes || []).find(r => r.key === (showRelEditor.currentType || showRelEditor.type))?.name || showRelEditor.currentType || showRelEditor.type}
                  </span>
                </div>

                {(showRelEditor.evolution || []).length === 0 ? (
                  <div className="timeline-empty">
                    <span>📜 暂无关系变化记录</span>
                  </div>
                ) : (
                  <div className="evo-timeline">
                    {[...(showRelEditor.evolution || [])].reverse().map((evo, idx) => {
                      const typeInfo = (meta?.relationTypes || []).find(r => r.key === evo.to);
                      const fromInfo = (meta?.relationTypes || []).find(r => r.key === evo.from);
                      return (
                        <div key={idx} className="evo-timeline-item">
                          <div className="evo-dot"></div>
                          <div className="evo-content">
                            <div className="evo-header">
                              <span className="evo-year">{evo.year ? `${evo.year}年` : '不明时间'}</span>
                              <span className="evo-type-change">
                                {fromInfo?.icon || '❓'} {fromInfo?.name || evo.from || '初始'}
                                <span className="evo-arrow">→</span>
                                {typeInfo?.icon || '❓'} {typeInfo?.name || evo.to}
                              </span>
                            </div>
                            {evo.reason && <p className="evo-reason">{evo.reason}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rel-editor-section">
                <h4 className="sub-title">记录新的关系变化</h4>
                <div className="evo-form">
                  <div className="evo-form-row">
                    <input
                      className="form-input short"
                      placeholder="年份"
                      type="number"
                      value={evoForm.year}
                      onChange={e => setEvoForm({ ...evoForm, year: e.target.value })}
                    />
                    <select
                      className="form-select"
                      value={evoForm.newType}
                      onChange={e => setEvoForm({ ...evoForm, newType: e.target.value })}
                    >
                      {(meta?.relationTypes || []).map(r => (
                        <option key={r.key} value={r.key}>{r.icon} {r.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="form-input"
                    placeholder="变化原因..."
                    value={evoForm.reason}
                    onChange={e => setEvoForm({ ...evoForm, reason: e.target.value })}
                  />
                  <button
                    className="form-submit full-width"
                    onClick={handleAddEvolution}
                    disabled={!evoForm.newType || evoForm.newType === (showRelEditor.currentType || showRelEditor.type)}
                  >
                    添加关系变化记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterProfileDetail;
