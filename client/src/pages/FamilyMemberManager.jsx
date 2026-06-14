import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { familyMemberApi } from '../services/api.js';
import './FamilyMemberManager.scss';

const RELATION_OPTIONS = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'child', label: '子女' },
  { value: 'spouse', label: '配偶' },
  { value: 'sibling', label: '兄弟姐妹' },
  { value: 'grandparent', label: '祖父母' },
  { value: 'grandchild', label: '孙子女' },
  { value: 'uncle_aunt', label: '叔伯/姨姑' },
  { value: 'nephew_niece', label: '侄子/侄女' },
  { value: 'cousin', label: '堂/表兄弟姐妹' }
];

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '其他' }
];

function FamilyMemberManager() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    birthDate: '',
    deathDate: '',
    gender: 'unknown',
    description: '',
    role: ''
  });
  const [relationForm, setRelationForm] = useState({
    memberId: '',
    type: 'spouse'
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await familyMemberApi.list();
      setMembers(data);
    } catch (err) {
      console.error('加载成员失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      avatar: '',
      birthDate: '',
      deathDate: '',
      gender: 'unknown',
      description: '',
      role: ''
    });
    setEditingMember(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      avatar: member.avatar || '',
      birthDate: member.birthDate ? member.birthDate.slice(0, 10) : '',
      deathDate: member.deathDate ? member.deathDate.slice(0, 10) : '',
      gender: member.gender || 'unknown',
      description: member.description || '',
      role: member.role || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const submitData = {
        ...formData,
        birthDate: formData.birthDate || null,
        deathDate: formData.deathDate || null
      };

      if (editingMember) {
        await familyMemberApi.update(editingMember.id, submitData);
      } else {
        await familyMemberApi.create(submitData);
      }
      setShowAddModal(false);
      resetForm();
      loadMembers();
    } catch (err) {
      console.error('保存成员失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除该成员吗？相关的关系也会被移除。')) return;
    try {
      await familyMemberApi.remove(id);
      loadMembers();
    } catch (err) {
      console.error('删除成员失败:', err);
    }
  };

  const openRelationModal = (member) => {
    setSelectedMember(member);
    setRelationForm({ memberId: '', type: 'spouse' });
    setShowRelationModal(true);
  };

  const handleAddRelation = async () => {
    if (!relationForm.memberId || !selectedMember) return;
    try {
      await familyMemberApi.addRelation(selectedMember.id, relationForm.memberId, relationForm.type);
      setShowRelationModal(false);
      loadMembers();
    } catch (err) {
      console.error('添加关系失败:', err);
    }
  };

  const handleRemoveRelation = async (memberId, relatedMemberId) => {
    if (!confirm('确定要解除这个关系吗？')) return;
    try {
      await familyMemberApi.removeRelation(memberId, relatedMemberId);
      loadMembers();
    } catch (err) {
      console.error('移除关系失败:', err);
    }
  };

  const getRelationLabel = (type) => {
    const opt = RELATION_OPTIONS.find(o => o.value === type);
    return opt ? opt.label : type;
  };

  const getGenderLabel = (gender) => {
    const opt = GENDER_OPTIONS.find(o => o.value === gender);
    return opt ? opt.label : '其他';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const getAvailableMembersForRelation = () => {
    if (!selectedMember) return [];
    const relatedIds = (selectedMember.relations || []).map(r => r.memberId);
    return members.filter(m => m.id !== selectedMember.id && !relatedIds.includes(m.id));
  };

  if (loading) {
    return (
      <div className="family-member-manager loading-page">
        <div className="loading-spinner"></div>
        <span className="loading-text">加载中...</span>
      </div>
    );
  }

  return (
    <div className="family-member-manager">
      <div className="page-header">
        <div>
          <Link to="/family-albums" className="back-link">
            <span>←</span> 返回纪念册首页
          </Link>
          <h1 className="page-title">
            <span className="title-icon">❋</span>
            家庭成员管理
          </h1>
          <p className="page-subtitle">管理家族成员信息，建立亲属关系网络</p>
        </div>
        <button className="add-btn-primary" onClick={openAddModal}>
          <span className="btn-icon">+</span>
          添加成员
        </button>
      </div>

      {members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❋</div>
          <p className="empty-text">还没有添加家庭成员</p>
          <button className="empty-btn" onClick={openAddModal}>添加第一位成员</button>
        </div>
      ) : (
        <div className="members-list">
          {members.map(member => (
            <div key={member.id} className="member-detail-card">
              <div className="member-main">
                <div className="member-avatar-lg">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} />
                  ) : (
                    <span className="avatar-placeholder-lg">{member.name.charAt(0)}</span>
                  )}
                </div>
                <div className="member-main-info">
                  <div className="member-name-row">
                    <h3 className="member-name">{member.name}</h3>
                    {member.role && <span className="member-tag">{member.role}</span>}
                    <span className="gender-tag">{getGenderLabel(member.gender)}</span>
                  </div>
                  <div className="member-dates">
                    {member.birthDate && <span>生于 {formatDate(member.birthDate)}</span>}
                    {member.birthDate && member.deathDate && <span className="date-sep">—</span>}
                    {member.deathDate && <span>卒于 {formatDate(member.deathDate)}</span>}
                  </div>
                  {member.description && (
                    <p className="member-desc">{member.description}</p>
                  )}
                </div>
                <div className="member-actions">
                  <button className="action-icon-btn" onClick={() => openRelationModal(member)} title="添加关系">
                    🔗
                  </button>
                  <button className="action-icon-btn" onClick={() => openEditModal(member)} title="编辑">
                    ✎
                  </button>
                  <button className="action-icon-btn danger" onClick={() => handleDelete(member.id)} title="删除">
                    🗑
                  </button>
                </div>
              </div>

              {(member.relations || []).length > 0 && (
                <div className="relations-section">
                  <h4 className="relations-title">亲属关系</h4>
                  <div className="relations-list">
                    {(member.relations || []).map(rel => (
                      <div key={rel.memberId} className="relation-item">
                        <div className="relation-avatar">
                          {rel.member?.avatar ? (
                            <img src={rel.member.avatar} alt="" />
                          ) : (
                            <span>{rel.member?.name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="relation-info">
                          <span className="relation-type">{getRelationLabel(rel.type)}</span>
                          <span className="relation-name">{rel.member?.name || '未知成员'}</span>
                        </div>
                        <button
                          className="relation-remove"
                          onClick={() => handleRemoveRelation(member.id, rel.memberId)}
                          title="解除关系"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMember ? '编辑成员' : '添加家庭成员'}</h3>
              <button className="modal-close" onClick={() => { setShowAddModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-item full">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入姓名"
                    required
                  />
                </div>
                <div className="form-item">
                  <label>头像URL</label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="可选，头像图片地址"
                  />
                </div>
                <div className="form-item">
                  <label>家族角色</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    placeholder="如：祖父、母亲、长子"
                  />
                </div>
                <div className="form-item">
                  <label>性别</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  >
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-item">
                  <label>出生日期</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
                <div className="form-item">
                  <label>逝世日期</label>
                  <input
                    type="date"
                    value={formData.deathDate}
                    onChange={e => setFormData({ ...formData, deathDate: e.target.value })}
                  />
                </div>
                <div className="form-item full">
                  <label>简介</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="记录生平、事迹或个人特点..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  取消
                </button>
                <button type="submit" className="btn-submit">
                  {editingMember ? '保存修改' : '添加成员'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRelationModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowRelationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加亲属关系 - {selectedMember.name}</h3>
              <button className="modal-close" onClick={() => setShowRelationModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {getAvailableMembersForRelation().length === 0 ? (
                <p className="empty-inline">没有可建立关系的成员，请先添加更多成员。</p>
              ) : (
                <div className="relation-form">
                  <div className="form-item">
                    <label>选择亲属</label>
                    <select
                      value={relationForm.memberId}
                      onChange={e => setRelationForm({ ...relationForm, memberId: e.target.value })}
                    >
                      <option value="">请选择成员</option>
                      {getAvailableMembersForRelation().map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-item">
                    <label>关系类型</label>
                    <select
                      value={relationForm.type}
                      onChange={e => setRelationForm({ ...relationForm, type: e.target.value })}
                    >
                      {RELATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowRelationModal(false)}>取消</button>
              <button
                className="btn-submit"
                onClick={handleAddRelation}
                disabled={!relationForm.memberId}
              >
                建立关系
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyMemberManager;
