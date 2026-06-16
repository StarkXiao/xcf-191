import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { characterProfileApi } from '../services/api.js';
import './EndingEditor.scss';

const ENDING_TYPES = [
  { key: 'true', name: '真结局', icon: '👑', color: '#ffd700' },
  { key: 'good', name: '好结局', icon: '🌟', color: '#98fb98' },
  { key: 'normal', name: '普通结局', icon: '📜', color: '#87ceeb' },
  { key: 'bad', name: '坏结局', icon: '💀', color: '#ff6347' },
  { key: 'hidden', name: '隐藏结局', icon: '🔮', color: '#dda0dd' }
];

const CONDITION_TYPES = [
  { key: 'decision', name: '抉择条件', desc: '角色做出特定选择' },
  { key: 'relationship', name: '关系条件', desc: '角色间达到特定关系' },
  { key: 'status', name: '状态条件', desc: '角色处于特定状态' },
  { key: 'growth', name: '成长条件', desc: '角色经历特定事件' }
];

const STATUS_OPTIONS = ['alive', 'dead', 'missing', 'unknown'];

function EndingEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [profiles, setProfiles] = useState([]);
  const [profileDetails, setProfileDetails] = useState({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'normal',
    epilogue: '',
    conditions: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allProfiles = await characterProfileApi.listProfiles();
      setProfiles(allProfiles);
      const detailMap = {};
      for (const p of allProfiles) {
        const detail = await characterProfileApi.getProfile(p.id);
        detailMap[p.id] = detail;
      }
      setProfileDetails(detailMap);
      if (isEdit) {
        const ending = await characterProfileApi.getEnding(id);
        setForm({
          name: ending.name || '',
          description: ending.description || '',
          type: ending.type || 'normal',
          epilogue: ending.epilogue || '',
          conditions: ending.conditions || []
        });
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await characterProfileApi.updateEnding(id, form);
      } else {
        await characterProfileApi.createEnding(form);
      }
      navigate('/character-profiles');
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setForm({
      ...form,
      conditions: [...form.conditions, { type: 'decision', characterId: '', requiredOption: '', targetId: '', requiredType: '', requiredStatus: 'alive', growthId: '', decisionId: '' }]
    });
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...form.conditions];
    if (field === 'type') {
      newConditions[index] = { type: value, characterId: '', requiredOption: '', targetId: '', requiredType: '', requiredStatus: 'alive', growthId: '', decisionId: '' };
    } else if (field === 'characterId') {
      newConditions[index] = { ...newConditions[index], characterId: value, decisionId: '', growthId: '', requiredOption: '', targetId: '', requiredType: '' };
    } else {
      newConditions[index] = { ...newConditions[index], [field]: value };
    }
    setForm({ ...form, conditions: newConditions });
  };

  const removeCondition = (index) => {
    setForm({ ...form, conditions: form.conditions.filter((_, i) => i !== index) });
  };

  const getProfileDecisions = (profileId) => {
    const profile = profileDetails[profileId];
    return profile ? (profile.keyDecisions || []) : [];
  };

  const getProfileGrowth = (profileId) => {
    const profile = profileDetails[profileId];
    return profile ? (profile.growthExperiences || []) : [];
  };

  if (loading) {
    return (
      <div className="ee-loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="ending-editor">
      <div className="ee-header">
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>← 返回侧写馆</button>
        <h1 className="ee-title">{isEdit ? '编辑结局' : '创建结局'}</h1>
      </div>

      <form className="ee-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2 className="section-label">结局信息</h2>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">结局名称 *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：雾散之晨" required />
            </div>
            <div className="form-group">
              <label className="form-label">结局类型</label>
              <div className="type-group">
                {ENDING_TYPES.map(t => (
                  <label key={t.key} className={`type-item ${form.type === t.key ? 'active' : ''}`} style={{ '--type-color': t.color }}>
                    <input type="radio" name="type" value={t.key} checked={form.type === t.key} onChange={e => setForm({ ...form, type: e.target.value })} />
                    <span className="type-icon">{t.icon}</span>
                    <span className="type-text">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group full-width">
            <label className="form-label">结局描述</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="描述这个结局的情景..." rows={3} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">尾声</label>
            <textarea className="form-textarea" value={form.epilogue} onChange={e => setForm({ ...form, epilogue: e.target.value })} placeholder="结局之后的后续故事..." rows={3} />
          </div>
        </div>

        <div className="form-section">
          <div className="section-toolbar">
            <h2 className="section-label">解锁条件</h2>
            <button type="button" className="add-cond-btn" onClick={addCondition}>+ 添加条件</button>
          </div>

          {form.conditions.length === 0 ? (
            <div className="no-conditions">
              <span className="no-icon">🔓</span>
              <p>暂无解锁条件，结局将自动解锁</p>
            </div>
          ) : (
            <div className="conditions-list">
              {form.conditions.map((cond, idx) => (
                <div key={idx} className="condition-card">
                  <div className="cond-header">
                    <span className="cond-index">条件 {idx + 1}</span>
                    <button type="button" className="cond-remove" onClick={() => removeCondition(idx)}>✕</button>
                  </div>
                  <div className="cond-body">
                    <div className="cond-row">
                      <select className="form-select" value={cond.type} onChange={e => updateCondition(idx, 'type', e.target.value)}>
                        {CONDITION_TYPES.map(ct => <option key={ct.key} value={ct.key}>{ct.name}</option>)}
                      </select>
                      <select className="form-select" value={cond.characterId} onChange={e => updateCondition(idx, 'characterId', e.target.value)}>
                        <option value="">选择角色</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {cond.type === 'decision' && cond.characterId && (
                      <>
                        <div className="cond-row">
                          <select className="form-select" value={cond.decisionId} onChange={e => updateCondition(idx, 'decisionId', e.target.value)}>
                            <option value="">选择抉择</option>
                            {getProfileDecisions(cond.characterId).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                          </select>
                        </div>
                        {cond.decisionId && (
                          <div className="cond-row">
                            <select className="form-select" value={cond.requiredOption} onChange={e => updateCondition(idx, 'requiredOption', e.target.value)}>
                              <option value="">选择要求的选项</option>
                              {(() => {
                                const dec = getProfileDecisions(cond.characterId).find(d => d.id === cond.decisionId);
                                return dec?.options?.map((opt, i) => (
                                  <option key={i} value={opt.label}>{opt.label}</option>
                                )) || [];
                              })()}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {cond.type === 'relationship' && cond.characterId && (
                      <div className="cond-row">
                        <select className="form-select" value={cond.targetId} onChange={e => updateCondition(idx, 'targetId', e.target.value)}>
                          <option value="">选择目标角色</option>
                          {profiles.filter(p => p.id !== cond.characterId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select className="form-select" value={cond.requiredType} onChange={e => updateCondition(idx, 'requiredType', e.target.value)}>
                          <option value="">要求的关系类型</option>
                          {[
                            { key: 'ally', name: '🤝 盟友' },
                            { key: 'rival', name: '⚔️ 宿敌' },
                            { key: 'mentor', name: '🎓 师徒' },
                            { key: 'student', name: '📖 弟子' },
                            { key: 'family', name: '👨‍👩‍👧 血亲' },
                            { key: 'lover', name: '💕 恋人' },
                            { key: 'comrade', name: '🛡️ 战友' },
                            { key: 'suspect', name: '🔍 嫌疑' },
                            { key: 'benefactor', name: '🌟 恩人' },
                            { key: 'beneficiary', name: '🙏 受恩者' }
                          ].map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </select>
                      </div>
                    )}

                    {cond.type === 'status' && (
                      <div className="cond-row">
                        <select className="form-select" value={cond.requiredStatus} onChange={e => updateCondition(idx, 'requiredStatus', e.target.value)}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}

                    {cond.type === 'growth' && cond.characterId && (
                      <div className="cond-row">
                        <select className="form-select" value={cond.growthId} onChange={e => updateCondition(idx, 'growthId', e.target.value)}>
                          <option value="">选择成长经历</option>
                          {getProfileGrowth(cond.characterId).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/character-profiles')}>取消</button>
          <button type="submit" className="submit-btn" disabled={saving || !form.name.trim()}>
            {saving ? '保存中...' : (isEdit ? '保存修改' : '创建结局')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EndingEditor;
