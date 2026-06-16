import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { characterProfileApi } from '../services/api.js';
import './CharacterProfileEditor.scss';

const STATUS_OPTIONS = [
  { key: 'alive', name: '存活', icon: '💚' },
  { key: 'dead', name: '死亡', icon: '💀' },
  { key: 'missing', name: '失踪', icon: '❓' },
  { key: 'unknown', name: '未知', icon: '🌫️' }
];

const ROLE_OPTIONS = [
  { key: 'protagonist', name: '主角', icon: '⭐' },
  { key: 'supporting', name: '配角', icon: '🌙' },
  { key: 'key_npc', name: '关键NPC', icon: '🗝️' }
];

function CharacterProfileEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState({
    name: '',
    alias: '',
    avatar: '',
    coverImage: '',
    role: 'supporting',
    faction: '',
    status: 'alive',
    birthYear: '',
    deathYear: '',
    personality: '',
    background: ''
  });

  useEffect(() => {
    if (isEdit) loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const profile = await characterProfileApi.getProfile(id);
      setForm({
        name: profile.name || '',
        alias: profile.alias || '',
        avatar: profile.avatar || '',
        coverImage: profile.coverImage || '',
        role: profile.role || 'supporting',
        faction: profile.faction || '',
        status: profile.status || 'alive',
        birthYear: profile.birthYear || '',
        deathYear: profile.deathYear || '',
        personality: (profile.personality || []).join('、'),
        background: profile.background || ''
      });
    } catch (err) {
      console.error('加载角色失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        birthYear: form.birthYear ? parseInt(form.birthYear) : null,
        deathYear: form.deathYear ? parseInt(form.deathYear) : null,
        personality: form.personality ? form.personality.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : []
      };
      if (isEdit) {
        await characterProfileApi.updateProfile(id, data);
      } else {
        await characterProfileApi.createProfile(data);
      }
      navigate('/character-profiles');
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cpe-loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="character-profile-editor">
      <div className="cpe-header">
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>← 返回侧写馆</button>
        <h1 className="cpe-title">{isEdit ? '编辑角色档案' : '创建角色档案'}</h1>
      </div>

      <form className="cpe-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2 className="section-label">基本信息</h2>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">角色姓名 *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="输入角色姓名" required />
            </div>
            <div className="form-group">
              <label className="form-label">别名/代号</label>
              <input className="form-input" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} placeholder="如：夜行者、第七号" />
            </div>
            <div className="form-group">
              <label className="form-label">角色定位</label>
              <div className="radio-group">
                {ROLE_OPTIONS.map(r => (
                  <label key={r.key} className={`radio-item ${form.role === r.key ? 'active' : ''}`}>
                    <input type="radio" name="role" value={r.key} checked={form.role === r.key} onChange={e => setForm({ ...form, role: e.target.value })} />
                    <span className="radio-icon">{r.icon}</span>
                    <span className="radio-text">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">当前状态</label>
              <div className="radio-group">
                {STATUS_OPTIONS.map(s => (
                  <label key={s.key} className={`radio-item ${form.status === s.key ? 'active' : ''}`}>
                    <input type="radio" name="status" value={s.key} checked={form.status === s.key} onChange={e => setForm({ ...form, status: e.target.value })} />
                    <span className="radio-icon">{s.icon}</span>
                    <span className="radio-text">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-label">身份背景</h2>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">所属阵营</label>
              <input className="form-input" value={form.faction} onChange={e => setForm({ ...form, faction: e.target.value })} placeholder="如：雾城守卫队、暗影同盟" />
            </div>
            <div className="form-group">
              <label className="form-label">出生年份</label>
              <input className="form-input" type="number" value={form.birthYear} onChange={e => setForm({ ...form, birthYear: e.target.value })} placeholder="如：1985" />
            </div>
            <div className="form-group">
              <label className="form-label">死亡年份</label>
              <input className="form-input" type="number" value={form.deathYear} onChange={e => setForm({ ...form, deathYear: e.target.value })} placeholder="留空表示仍在世" />
            </div>
            <div className="form-group">
              <label className="form-label">头像URL</label>
              <input className="form-input" value={form.avatar} onChange={e => setForm({ ...form, avatar: e.target.value })} placeholder="头像图片地址" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-label">性格与背景</h2>
          <div className="form-group full-width">
            <label className="form-label">性格标签（用「、」分隔）</label>
            <input className="form-input" value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} placeholder="如：沉默寡言、心思缜密、外冷内热" />
          </div>
          <div className="form-group full-width">
            <label className="form-label">背景故事</label>
            <textarea className="form-textarea" value={form.background} onChange={e => setForm({ ...form, background: e.target.value })} placeholder="描述这个角色的身世背景..." rows={5} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate('/character-profiles')}>取消</button>
          <button type="submit" className="submit-btn" disabled={saving || !form.name.trim()}>
            {saving ? '保存中...' : (isEdit ? '保存修改' : '创建角色')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CharacterProfileEditor;
