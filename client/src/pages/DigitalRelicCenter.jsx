import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { relicApi, fileApi, exhibitionApi, familyAlbumApi, materialApi } from '../services/api.js';
import './DigitalRelicCenter.scss';

const TYPE_META = {
  image: { label: '照片', icon: '📷', color: '#ffd700' },
  audio: { label: '语音', icon: '🎵', color: '#87ceeb' },
  video: { label: '视频', icon: '🎬', color: '#dda0dd' },
  text: { label: '文字', icon: '✎', color: '#f4a460' },
  other: { label: '其他', icon: '📁', color: '#98fb98' }
};

const VIEW_MODES = [
  { key: 'grid', label: '网格', icon: '▦' },
  { key: 'list', label: '列表', icon: '☰' }
];

function DigitalRelicCenter() {
  const [activeTab, setActiveTab] = useState('relics');
  const [categories, setCategories] = useState([]);
  const [relics, setRelics] = useState([]);
  const [totalRelics, setTotalRelics] = useState(0);
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [exhibitions, setExhibitions] = useState([]);
  const [familyAlbums, setFamilyAlbums] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [archiveFilter, setArchiveFilter] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [editingRelicId, setEditingRelicId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRule, setEditingRule] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [textForm, setTextForm] = useState({ title: '', content: '', tags: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'other', icon: '📁', color: '#98fb98' });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    conditions: { types: [], keywords: [], dateRange: { from: '', to: '' }, categoryIds: [] },
    action: { archive: true, targetCategoryId: '' },
    enabled: true
  });
  const [migrateForm, setMigrateForm] = useState({ targetCategoryId: '', targetExhibitionId: '', targetFamilyAlbumId: '' });
  const [editRelicForm, setEditRelicForm] = useState({ title: '', description: '', tags: '', categoryId: '' });

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, rulesRes, statsRes, exhsRes, albumsRes] = await Promise.all([
        relicApi.listCategories(),
        relicApi.listRules(),
        relicApi.getStats(),
        exhibitionApi.list(),
        familyAlbumApi.list()
      ]);
      setCategories(catsRes);
      setRules(rulesRes);
      setStats(statsRes);
      setExhibitions(exhsRes);
      setFamilyAlbums(albumsRes);
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadRelics = useCallback(async () => {
    try {
      const params = {
        categoryId: selectedCategoryId || undefined,
        type: typeFilter || undefined,
        archived: archiveFilter !== null ? (archiveFilter ? 'true' : 'false') : undefined,
        keyword: searchKeyword || undefined,
        sortBy,
        sortOrder
      };
      const res = await relicApi.listRelics(params);
      setRelics(res.items || []);
      setTotalRelics(res.total || 0);
    } catch (err) {
      console.error('加载遗物失败:', err);
    }
  }, [selectedCategoryId, typeFilter, archiveFilter, searchKeyword, sortBy, sortOrder]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadRelics();
  }, [loadRelics]);

  const filteredRelics = useMemo(() => relics, [relics]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRelics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRelics.map(r => r.id)));
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await fileApi.upload(files, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      const typeMap = { images: 'image', audios: 'audio', videos: 'video' };
      for (const file of res.files) {
        await relicApi.createRelic({
          categoryId: selectedCategoryId || undefined,
          type: typeMap[file.type] || 'other',
          url: file.url,
          title: file.filename
        });
      }
      showToast(`成功导入 ${res.files.length} 个文件`, 'success');
      setShowUploadModal(false);
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('上传失败:', err);
      showToast('上传失败，请重试', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
    e.target.value = '';
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textForm.content.trim()) return;
    try {
      await relicApi.createRelic({
        categoryId: selectedCategoryId || undefined,
        type: 'text',
        title: textForm.title || '文字回忆',
        description: textForm.content,
        tags: textForm.tags ? textForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      });
      showToast('文字遗物已添加', 'success');
      setShowTextModal(false);
      setTextForm({ title: '', content: '', tags: '' });
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('添加失败:', err);
      showToast('添加失败', 'error');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    try {
      if (editingCategory) {
        await relicApi.updateCategory(editingCategory.id, categoryForm);
        showToast('分类已更新', 'success');
      } else {
        await relicApi.createCategory(categoryForm);
        showToast('分类已创建', 'success');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', type: 'other', icon: '📁', color: '#98fb98' });
      loadAllData();
    } catch (err) {
      console.error('操作失败:', err);
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (cat.id.startsWith('default-')) {
      showToast('默认分类不可删除', 'warning');
      return;
    }
    if (!confirm(`确定删除分类「${cat.name}」吗？该分类下的遗物将移至默认分类。`)) return;
    try {
      await relicApi.removeCategory(cat.id);
      showToast('分类已删除', 'success');
      if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
      loadAllData();
      loadRelics();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    if (!ruleForm.name.trim()) return;
    try {
      const payload = {
        ...ruleForm,
        conditions: {
          ...ruleForm.conditions,
          keywords: typeof ruleForm.conditions.keywords === 'string'
            ? ruleForm.conditions.keywords.split(',').map(k => k.trim()).filter(Boolean)
            : ruleForm.conditions.keywords
        }
      };
      if (editingRule) {
        await relicApi.updateRule(editingRule.id, payload);
        showToast('规则已更新', 'success');
      } else {
        await relicApi.createRule(payload);
        showToast('规则已创建', 'success');
      }
      setShowRuleModal(false);
      setEditingRule(null);
      setRuleForm({
        name: '',
        conditions: { types: [], keywords: [], dateRange: { from: '', to: '' }, categoryIds: [] },
        action: { archive: true, targetCategoryId: '' },
        enabled: true
      });
      loadAllData();
    } catch (err) {
      console.error('操作失败:', err);
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!confirm(`确定删除规则「${rule.name}」吗？`)) return;
    try {
      await relicApi.removeRule(rule.id);
      showToast('规则已删除', 'success');
      loadAllData();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  };

  const handleExecuteRule = async (rule) => {
    try {
      const res = await relicApi.executeRule(rule.id);
      showToast(`规则执行完成，匹配 ${res.matched} 项`, 'success');
      loadAllData();
      loadRelics();
    } catch (err) {
      console.error('执行失败:', err);
      showToast('执行失败', 'error');
    }
  };

  const handleExecuteAllRules = async () => {
    try {
      const res = await relicApi.executeAllRules();
      showToast(`已执行 ${res.rulesExecuted} 条规则，共处理 ${res.totalMatched} 项`, 'success');
      loadAllData();
      loadRelics();
    } catch (err) {
      console.error('执行失败:', err);
      showToast('执行失败', 'error');
    }
  };

  const handleBatchArchive = async (archived) => {
    if (selectedIds.size === 0) {
      showToast('请先选择项目', 'warning');
      return;
    }
    try {
      const res = await relicApi.batchArchive(Array.from(selectedIds), archived);
      showToast(`已${archived ? '归档' : '取消归档'} ${res.count} 项`, 'success');
      setSelectedIds(new Set());
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('操作失败:', err);
      showToast('操作失败', 'error');
    }
  };

  const handleMigrateSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      showToast('请先选择项目', 'warning');
      return;
    }
    if (!migrateForm.targetCategoryId && !migrateForm.targetExhibitionId && !migrateForm.targetFamilyAlbumId) {
      showToast('请至少选择一个迁移目标', 'warning');
      return;
    }
    try {
      const options = {};
      if (migrateForm.targetCategoryId) options.targetCategoryId = migrateForm.targetCategoryId;
      if (migrateForm.targetExhibitionId) options.targetExhibitionId = migrateForm.targetExhibitionId || null;
      if (migrateForm.targetFamilyAlbumId) options.targetFamilyAlbumId = migrateForm.targetFamilyAlbumId || null;
      const res = await relicApi.batchMigrate(Array.from(selectedIds), options);
      showToast(`已迁移 ${res.count} 项`, 'success');
      setShowMigrateModal(false);
      setMigrateForm({ targetCategoryId: '', targetExhibitionId: '', targetFamilyAlbumId: '' });
      setSelectedIds(new Set());
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('迁移失败:', err);
      showToast('迁移失败', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      showToast('请先选择项目', 'warning');
      return;
    }
    if (!confirm(`确定删除选中的 ${selectedIds.size} 项吗？此操作不可撤销。`)) return;
    try {
      const res = await relicApi.batchDelete(Array.from(selectedIds));
      showToast(`已删除 ${res.count} 项`, 'success');
      setSelectedIds(new Set());
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  };

  const handleDeleteRelic = async (id) => {
    if (!confirm('确定删除这个遗物吗？')) return;
    try {
      await relicApi.removeRelic(id);
      showToast('已删除', 'success');
      loadRelics();
      loadAllData();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败', 'error');
    }
  };

  const startEditRelic = (r) => {
    setEditingRelicId(r.id);
    setEditRelicForm({
      title: r.title || '',
      description: r.description || '',
      tags: (r.tags || []).join(', '),
      categoryId: r.categoryId || ''
    });
  };

  const saveEditRelic = async () => {
    try {
      await relicApi.updateRelic(editingRelicId, {
        title: editRelicForm.title,
        description: editRelicForm.description,
        tags: editRelicForm.tags ? editRelicForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        categoryId: editRelicForm.categoryId || undefined
      });
      showToast('已更新', 'success');
      setEditingRelicId(null);
      loadRelics();
    } catch (err) {
      console.error('更新失败:', err);
      showToast('更新失败', 'error');
    }
  };

  const getCategoryById = (id) => categories.find(c => c.id === id);

  const renderRelicPreview = (r) => {
    const meta = TYPE_META[r.type] || TYPE_META.other;
    if (r.type === 'image' && r.url) {
      return <img src={r.url} alt={r.title} className="relic-thumb" />;
    }
    if (r.type === 'audio') {
      return (
        <div className="relic-media-preview">
          <span className="relic-type-icon">{meta.icon}</span>
          {r.url && <audio src={r.url} controls className="mini-audio" />}
        </div>
      );
    }
    if (r.type === 'video') {
      return (
        <div className="relic-media-preview">
          {r.url ? <video src={r.url} className="relic-thumb" /> : <span className="relic-type-icon">{meta.icon}</span>}
        </div>
      );
    }
    if (r.type === 'text') {
      return (
        <div className="relic-text-preview">
          <span className="relic-type-icon">{meta.icon}</span>
          <p className="text-snippet">{(r.description || '').substring(0, 80)}</p>
        </div>
      );
    }
    return <span className="relic-type-icon">{meta.icon}</span>;
  };

  const renderRelicCard = (r) => {
    const meta = TYPE_META[r.type] || TYPE_META.other;
    const cat = getCategoryById(r.categoryId);
    const isSelected = selectedIds.has(r.id);
    const isEditing = editingRelicId === r.id;

    return (
      <div
        key={r.id}
        className={`relic-card ${isSelected ? 'selected' : ''} ${r.archived ? 'archived' : ''}`}
        style={{ borderLeftColor: meta.color }}
      >
        <div className="relic-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}>
          <input type="checkbox" checked={isSelected} onChange={() => {}} />
        </div>
        <div className="relic-preview">{renderRelicPreview(r)}</div>
        {r.archived && <div className="archive-badge">已归档</div>}

        {isEditing ? (
          <div className="relic-edit-form">
            <input
              type="text"
              placeholder="标题"
              value={editRelicForm.title}
              onChange={(e) => setEditRelicForm({ ...editRelicForm, title: e.target.value })}
            />
            <textarea
              placeholder="描述"
              value={editRelicForm.description}
              onChange={(e) => setEditRelicForm({ ...editRelicForm, description: e.target.value })}
              rows={2}
            />
            <input
              type="text"
              placeholder="标签（逗号分隔）"
              value={editRelicForm.tags}
              onChange={(e) => setEditRelicForm({ ...editRelicForm, tags: e.target.value })}
            />
            <select
              value={editRelicForm.categoryId}
              onChange={(e) => setEditRelicForm({ ...editRelicForm, categoryId: e.target.value })}
            >
              <option value="">选择分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <div className="edit-actions-row">
              <button className="primary" onClick={saveEditRelic}>保存</button>
              <button onClick={() => setEditingRelicId(null)}>取消</button>
            </div>
          </div>
        ) : (
          <div className="relic-body">
            <h4 className="relic-title" title={r.title}>{r.title || '未命名'}</h4>
            {r.description && r.type !== 'text' && (
              <p className="relic-desc">{r.description.substring(0, 50)}{r.description.length > 50 ? '...' : ''}</p>
            )}
            <div className="relic-meta">
              <span className="meta-tag" style={{ background: `${meta.color}22`, color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
              {cat && (
                <span className="meta-tag" style={{ background: `${cat.color}22`, color: cat.color }}>
                  {cat.icon} {cat.name}
                </span>
              )}
            </div>
            {r.tags && r.tags.length > 0 && (
              <div className="relic-tags">
                {r.tags.slice(0, 3).map((t, i) => (
                  <span key={i} className="relic-tag">#{t}</span>
                ))}
                {r.tags.length > 3 && <span className="relic-tag">+{r.tags.length - 3}</span>}
              </div>
            )}
            <div className="relic-date">
              {new Date(r.createdAt).toLocaleDateString('zh-CN')}
            </div>
            <div className="relic-actions">
              <button className="btn-sm" onClick={() => startEditRelic(r)}>编辑</button>
              <button className="btn-sm" onClick={() => handleBatchArchive(!r.archived) || null}>
                {r.archived ? '取消归档' : '归档'}
              </button>
              <button className="btn-sm danger" onClick={() => handleDeleteRelic(r.id)}>删除</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRelicListItem = (r) => {
    const meta = TYPE_META[r.type] || TYPE_META.other;
    const cat = getCategoryById(r.categoryId);
    const isSelected = selectedIds.has(r.id);

    return (
      <div key={r.id} className={`relic-list-row ${isSelected ? 'selected' : ''} ${r.archived ? 'archived' : ''}`}>
        <div className="list-cell list-check">
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)} />
        </div>
        <div className="list-cell list-preview">{renderRelicPreview(r)}</div>
        <div className="list-cell list-title">
          <span className="list-title-text" title={r.title}>{r.title || '未命名'}</span>
          {r.archived && <span className="archive-badge-small">归档</span>}
        </div>
        <div className="list-cell list-type">
          <span style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
        </div>
        <div className="list-cell list-category">
          {cat ? <span style={{ color: cat.color }}>{cat.icon} {cat.name}</span> : '-'}
        </div>
        <div className="list-cell list-tags">
          {(r.tags || []).slice(0, 2).map((t, i) => <span key={i} className="relic-tag-sm">#{t}</span>)}
        </div>
        <div className="list-cell list-date">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</div>
        <div className="list-cell list-actions">
          <button className="btn-xs" onClick={() => startEditRelic(r)}>编辑</button>
          <button className="btn-xs danger" onClick={() => handleDeleteRelic(r.id)}>删除</button>
        </div>
      </div>
    );
  };

  const typeCounts = useMemo(() => {
    const counts = { all: totalRelics };
    if (stats && stats.byType) {
      Object.assign(counts, stats.byType);
    }
    return counts;
  }, [stats, totalRelics]);

  if (loading) {
    return (
      <div className="drc-page">
        <div className="drc-loading">
          <div className="loading-spinner">✦</div>
          <p>正在加载数字遗物整理中心...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drc-page">
      <div className="drc-header">
        <div>
          <h1 className="drc-title">
            <span className="title-icon">✦</span>
            数字遗物整理中心
          </h1>
          <p className="drc-subtitle">统一管理照片、语音、视频与文字 · 智能归档 · 便捷检索 · 批量迁移</p>
        </div>
        <div className="drc-stats-bar">
          {stats && (
            <>
              <div className="stat-pill">
                <span className="stat-num">{stats.total}</span>
                <span className="stat-label">遗物总数</span>
              </div>
              <div className="stat-pill gold">
                <span className="stat-num">📷 {stats.byType?.image || 0}</span>
                <span className="stat-label">照片</span>
              </div>
              <div className="stat-pill blue">
                <span className="stat-num">🎵 {stats.byType?.audio || 0}</span>
                <span className="stat-label">语音</span>
              </div>
              <div className="stat-pill purple">
                <span className="stat-num">🎬 {stats.byType?.video || 0}</span>
                <span className="stat-label">视频</span>
              </div>
              <div className="stat-pill warm">
                <span className="stat-num">✎ {stats.byType?.text || 0}</span>
                <span className="stat-label">文字</span>
              </div>
              <div className="stat-pill muted">
                <span className="stat-num">📦 {stats.archived || 0}</span>
                <span className="stat-label">已归档</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="drc-tabs">
        <button
          className={`tab-btn ${activeTab === 'relics' ? 'active' : ''}`}
          onClick={() => setActiveTab('relics')}
        >
          <span>📚</span> 遗物管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <span>🗂</span> 分类管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <span>⚙</span> 归档规则
        </button>
      </div>

      {activeTab === 'relics' && (
        <div className="drc-content">
          <aside className="drc-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-header">
                <h3>分类目录</h3>
                <button
                  className="btn-icon"
                  title="新建分类"
                  onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                >+</button>
              </div>
              <ul className="category-list">
                <li
                  className={`cat-item ${!selectedCategoryId ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryId(null)}
                >
                  <span className="cat-icon">📂</span>
                  <span className="cat-name">全部遗物</span>
                  <span className="cat-count">{totalRelics}</span>
                </li>
                {categories.map(cat => (
                  <li
                    key={cat.id}
                    className={`cat-item ${selectedCategoryId === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <span className="cat-icon" style={{ color: cat.color }}>{cat.icon}</span>
                    <span className="cat-name">{cat.name}</span>
                    <span className="cat-count">{stats?.byCategory?.[cat.id] || 0}</span>
                    {!cat.id.startsWith('default-') && (
                      <button
                        className="cat-del"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        title="删除分类"
                      >×</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-header"><h3>类型筛选</h3></div>
              <div className="type-filters">
                <button
                  className={`tf-btn ${!typeFilter ? 'active' : ''}`}
                  onClick={() => setTypeFilter(null)}
                >全部 ({typeCounts.all})</button>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <button
                    key={k}
                    className={`tf-btn ${typeFilter === k ? 'active' : ''}`}
                    onClick={() => setTypeFilter(k)}
                    style={{ '--tf-color': v.color }}
                  >
                    {v.icon} {v.label} ({typeCounts[k] || 0})
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-header"><h3>归档状态</h3></div>
              <div className="archive-filters">
                <button
                  className={`af-btn ${archiveFilter === null ? 'active' : ''}`}
                  onClick={() => setArchiveFilter(null)}
                >全部</button>
                <button
                  className={`af-btn ${archiveFilter === false ? 'active' : ''}`}
                  onClick={() => setArchiveFilter(false)}
                >📖 未归档 ({stats?.notArchived || 0})</button>
                <button
                  className={`af-btn ${archiveFilter === true ? 'active' : ''}`}
                  onClick={() => setArchiveFilter(true)}
                >📦 已归档 ({stats?.archived || 0})</button>
              </div>
            </div>
          </aside>

          <section className="drc-main">
            <div className="drc-toolbar">
              <div className="toolbar-left">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="搜索标题、描述或标签..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="createdAt">按创建时间</option>
                  <option value="updatedAt">按更新时间</option>
                  <option value="title">按名称</option>
                  <option value="type">按类型</option>
                </select>
                <button
                  className="btn-icon"
                  title={sortOrder === 'desc' ? '降序' : '升序'}
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
              <div className="toolbar-right">
                <div className="view-toggle">
                  {VIEW_MODES.map(vm => (
                    <button
                      key={vm.key}
                      className={`vt-btn ${viewMode === vm.key ? 'active' : ''}`}
                      onClick={() => setViewMode(vm.key)}
                      title={vm.label}
                    >{vm.icon}</button>
                  ))}
                </div>
                <button
                  className="toolbar-btn primary"
                  onClick={() => setShowUploadModal(true)}
                >📤 上传文件</button>
                <button
                  className="toolbar-btn"
                  onClick={() => setShowTextModal(true)}
                >✎ 添加文字</button>
              </div>
            </div>

            <div className="drc-batch-bar">
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredRelics.length && filteredRelics.length > 0}
                  onChange={toggleSelectAll}
                />
                全选 <span className="selected-count">（已选 {selectedIds.size}/{filteredRelics.length}）</span>
              </label>
              <div className="batch-actions">
                <button
                  className="batch-btn"
                  disabled={selectedIds.size === 0}
                  onClick={() => handleBatchArchive(true)}
                >📦 批量归档</button>
                <button
                  className="batch-btn"
                  disabled={selectedIds.size === 0}
                  onClick={() => handleBatchArchive(false)}
                >📖 取消归档</button>
                <button
                  className="batch-btn"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowMigrateModal(true)}
                >➡ 批量迁移</button>
                <button
                  className="batch-btn danger"
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchDelete}
                >🗑 批量删除</button>
              </div>
            </div>

            <div className="drc-results">
              {filteredRelics.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>
                  <h3>暂无遗物</h3>
                  <p>点击「上传文件」或「添加文字」开始整理你的数字遗物</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="relic-grid">{filteredRelics.map(renderRelicCard)}</div>
              ) : (
                <div className="relic-list">
                  <div className="relic-list-header">
                    <div className="list-cell list-check"></div>
                    <div className="list-cell list-preview">预览</div>
                    <div className="list-cell list-title">标题</div>
                    <div className="list-cell list-type">类型</div>
                    <div className="list-cell list-category">分类</div>
                    <div className="list-cell list-tags">标签</div>
                    <div className="list-cell list-date">创建日期</div>
                    <div className="list-cell list-actions">操作</div>
                  </div>
                  {filteredRelics.map(renderRelicListItem)}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="drc-content">
          <div className="categories-header">
            <h2>分类管理</h2>
            <button
              className="toolbar-btn primary"
              onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
            >+ 新建分类</button>
          </div>
          <div className="category-grid">
            {categories.map(cat => (
              <div key={cat.id} className="category-card" style={{ borderTopColor: cat.color }}>
                <div className="category-head">
                  <span className="category-icon-lg" style={{ color: cat.color }}>{cat.icon}</span>
                  <h3>{cat.name}</h3>
                  {cat.id.startsWith('default-') && <span className="default-badge">默认</span>}
                </div>
                <div className="category-info">
                  <div className="info-row">
                    <span className="info-label">类型</span>
                    <span className="info-val" style={{ color: cat.color }}>
                      {(TYPE_META[cat.type] || TYPE_META.other).label}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">遗物数</span>
                    <span className="info-val num">{stats?.byCategory?.[cat.id] || 0}</span>
                  </div>
                </div>
                <div className="category-actions">
                  <button
                    className="btn-sm"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({
                        name: cat.name,
                        type: cat.type,
                        icon: cat.icon,
                        color: cat.color
                      });
                      setShowCategoryModal(true);
                    }}
                  >编辑</button>
                  <button
                    className="btn-sm danger"
                    disabled={cat.id.startsWith('default-')}
                    onClick={() => handleDeleteCategory(cat)}
                  >删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="drc-content">
          <div className="categories-header">
            <h2>归档规则</h2>
            <div>
              <button className="toolbar-btn" onClick={handleExecuteAllRules}>
                ▶ 执行全部规则
              </button>
              <button
                className="toolbar-btn primary"
                style={{ marginLeft: '8px' }}
                onClick={() => { setEditingRule(null); setShowRuleModal(true); }}
              >+ 新建规则</button>
            </div>
          </div>
          <div className="rules-list">
            {rules.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚙</div>
                <h3>暂无归档规则</h3>
                <p>创建规则以自动对遗物进行分类和归档</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
                  <div className="rule-head">
                    <div>
                      <h3>{rule.name}</h3>
                      <p className="rule-sub">
                        排序: {rule.sort} · 创建于 {new Date(rule.createdAt).toLocaleDateString('zh-CN')}
                        {rule.lastRunAt && ` · 上次执行: ${new Date(rule.lastRunAt).toLocaleString('zh-CN')}`}
                      </p>
                    </div>
                    <div className="rule-status">
                      <span className={`status-dot ${rule.enabled ? 'on' : 'off'}`}></span>
                      {rule.enabled ? '已启用' : '已停用'}
                    </div>
                  </div>
                  <div className="rule-body">
                    <div className="rule-section">
                      <h4>匹配条件</h4>
                      <div className="cond-list">
                        {rule.conditions?.types?.length > 0 && (
                          <span className="cond-chip">
                            类型: {rule.conditions.types.map(t => (TYPE_META[t] || { label: t }).label).join(', ')}
                          </span>
                        )}
                        {rule.conditions?.keywords?.length > 0 && (
                          <span className="cond-chip">
                            关键词: {rule.conditions.keywords.join(', ')}
                          </span>
                        )}
                        {rule.conditions?.categoryIds?.length > 0 && (
                          <span className="cond-chip">
                            分类: {rule.conditions.categoryIds.map(id => getCategoryById(id)?.name || id).join(', ')}
                          </span>
                        )}
                        {rule.conditions?.dateRange && (rule.conditions.dateRange.from || rule.conditions.dateRange.to) && (
                          <span className="cond-chip">
                            日期: {rule.conditions.dateRange.from || '*'} ~ {rule.conditions.dateRange.to || '*'}
                          </span>
                        )}
                        {(!rule.conditions?.types?.length && !rule.conditions?.keywords?.length &&
                          !rule.conditions?.categoryIds?.length &&
                          !rule.conditions?.dateRange?.from && !rule.conditions?.dateRange?.to) && (
                          <span className="cond-chip muted">匹配全部遗物</span>
                        )}
                      </div>
                    </div>
                    <div className="rule-section">
                      <h4>执行动作</h4>
                      <div className="cond-list">
                        {rule.action?.archive !== undefined && (
                          <span className={`action-chip ${rule.action.archive ? 'archive' : 'unarchive'}`}>
                            {rule.action.archive ? '📦 归档' : '📖 取消归档'}
                          </span>
                        )}
                        {rule.action?.targetCategoryId && (
                          <span className="action-chip migrate">
                            ➡ 移至 {getCategoryById(rule.action.targetCategoryId)?.name || '未知分类'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rule-actions">
                    <button className="btn-sm primary" onClick={() => handleExecuteRule(rule)}>立即执行</button>
                    <button
                      className="btn-sm"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleForm({
                          name: rule.name,
                          conditions: {
                            types: rule.conditions?.types || [],
                            keywords: (rule.conditions?.keywords || []).join(', '),
                            dateRange: rule.conditions?.dateRange || { from: '', to: '' },
                            categoryIds: rule.conditions?.categoryIds || []
                          },
                          action: {
                            archive: rule.action?.archive !== undefined ? rule.action.archive : true,
                            targetCategoryId: rule.action?.targetCategoryId || ''
                          },
                          enabled: rule.enabled
                        });
                        setShowRuleModal(true);
                      }}
                    >编辑</button>
                    <button
                      className="btn-sm"
                      onClick={async () => {
                        await relicApi.updateRule(rule.id, { enabled: !rule.enabled });
                        loadAllData();
                        showToast(rule.enabled ? '已停用' : '已启用', 'success');
                      }}
                    >{rule.enabled ? '停用' : '启用'}</button>
                    <button className="btn-sm danger" onClick={() => handleDeleteRule(rule)}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">上传数字遗物</h3>
            <div className="upload-dropzone">
              <div className="dz-icon">☁</div>
              <p>拖拽文件到此处，或点击下方按钮选择</p>
              <p className="dz-hint">支持图片、音频、视频等多媒体文件</p>
              {selectedCategoryId && (
                <p className="dz-target">
                  将上传至分类: <strong>{getCategoryById(selectedCategoryId)?.name || '默认分类'}</strong>
                </p>
              )}
              <div className="dz-buttons">
                <label className="dz-btn">
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} hidden disabled={uploading} />
                  📷 选择照片
                </label>
                <label className="dz-btn">
                  <input type="file" accept="audio/*" multiple onChange={handleFileUpload} hidden disabled={uploading} />
                  🎵 选择语音
                </label>
                <label className="dz-btn">
                  <input type="file" accept="video/*" multiple onChange={handleFileUpload} hidden disabled={uploading} />
                  🎬 选择视频
                </label>
                <label className="dz-btn primary">
                  <input type="file" multiple onChange={handleFileUpload} hidden disabled={uploading} />
                  📁 任意文件
                </label>
              </div>
              {uploading && (
                <div className="upload-progress-wrap">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <span className="progress-text">上传中 {uploadProgress}%</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {showTextModal && (
        <div className="modal-overlay" onClick={() => setShowTextModal(false)}>
          <div className="modal md" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">添加文字遗物</h3>
            <form onSubmit={handleTextSubmit}>
              <div className="form-group">
                <label>标题（可选）</label>
                <input
                  type="text"
                  placeholder="为这段文字起个名字"
                  value={textForm.title}
                  onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>内容 *</label>
                <textarea
                  placeholder="写下你想珍藏的文字回忆..."
                  value={textForm.content}
                  onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                  rows={8}
                  maxLength={5000}
                  required
                />
              </div>
              <div className="form-group">
                <label>标签（逗号分隔，可选）</label>
                <input
                  type="text"
                  placeholder="例如: 生日, 旅行, 家人"
                  value={textForm.tags}
                  onChange={(e) => setTextForm({ ...textForm, tags: e.target.value })}
                />
              </div>
              {selectedCategoryId && (
                <div className="form-hint">
                  将添加至: {getCategoryById(selectedCategoryId)?.icon} {getCategoryById(selectedCategoryId)?.name}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTextModal(false)}>取消</button>
                <button type="submit" className="primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingCategory ? '编辑分类' : '新建分类'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>分类名称 *</label>
                <input
                  type="text"
                  placeholder="例如: 旅行照片"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>关联类型</label>
                  <select
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  >
                    {Object.entries(TYPE_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>图标</label>
                  <input
                    type="text"
                    placeholder="📷"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>主题色</label>
                <div className="color-picker">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCategoryModal(false)}>取消</button>
                <button type="submit" className="primary">{editingCategory ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingRule ? '编辑归档规则' : '新建归档规则'}</h3>
            <form onSubmit={handleRuleSubmit}>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>规则名称 *</label>
                  <input
                    type="text"
                    placeholder="例如: 自动归档一年前的照片"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>状态</label>
                  <select
                    value={ruleForm.enabled ? '1' : '0'}
                    onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.value === '1' })}
                  >
                    <option value="1">启用</option>
                    <option value="0">停用</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">📋 匹配条件</h4>

                <div className="form-group">
                  <label>遗物类型（可多选）</label>
                  <div className="checkbox-group">
                    {Object.entries(TYPE_META).map(([k, v]) => (
                      <label key={k} className="chk-item">
                        <input
                          type="checkbox"
                          checked={ruleForm.conditions.types.includes(k)}
                          onChange={(e) => {
                            const types = e.target.checked
                              ? [...ruleForm.conditions.types, k]
                              : ruleForm.conditions.types.filter(t => t !== k);
                            setRuleForm({ ...ruleForm, conditions: { ...ruleForm.conditions, types } });
                          }}
                        />
                        <span style={{ color: v.color }}>{v.icon} {v.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>所属分类（可多选）</label>
                  <div className="checkbox-group wrap">
                    {categories.map(c => (
                      <label key={c.id} className="chk-item">
                        <input
                          type="checkbox"
                          checked={ruleForm.conditions.categoryIds.includes(c.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...ruleForm.conditions.categoryIds, c.id]
                              : ruleForm.conditions.categoryIds.filter(id => id !== c.id);
                            setRuleForm({ ...ruleForm, conditions: { ...ruleForm.conditions, categoryIds: ids } });
                          }}
                        />
                        <span style={{ color: c.color }}>{c.icon} {c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>关键词（逗号分隔，匹配标题、描述、标签）</label>
                  <input
                    type="text"
                    placeholder="例如: 旅行, 生日, 2023"
                    value={ruleForm.conditions.keywords}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      conditions: { ...ruleForm.conditions, keywords: e.target.value }
                    })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>起始日期</label>
                    <input
                      type="date"
                      value={ruleForm.conditions.dateRange.from}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        conditions: {
                          ...ruleForm.conditions,
                          dateRange: { ...ruleForm.conditions.dateRange, from: e.target.value }
                        }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>结束日期</label>
                    <input
                      type="date"
                      value={ruleForm.conditions.dateRange.to}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        conditions: {
                          ...ruleForm.conditions,
                          dateRange: { ...ruleForm.conditions.dateRange, to: e.target.value }
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">⚙ 执行动作</h4>
                <div className="form-group">
                  <label>归档操作</label>
                  <select
                    value={ruleForm.action.archive ? 'archive' : 'unarchive'}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      action: { ...ruleForm.action, archive: e.target.value === 'archive' }
                    })}
                  >
                    <option value="archive">📦 标记为已归档</option>
                    <option value="unarchive">📖 取消归档</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>迁移至分类（可选）</label>
                  <select
                    value={ruleForm.action.targetCategoryId}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      action: { ...ruleForm.action, targetCategoryId: e.target.value }
                    })}
                  >
                    <option value="">不迁移</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowRuleModal(false)}>取消</button>
                <button type="submit" className="primary">{editingRule ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMigrateModal && (
        <div className="modal-overlay" onClick={() => setShowMigrateModal(false)}>
          <div className="modal md" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">批量迁移（已选 {selectedIds.size} 项）</h3>
            <form onSubmit={handleMigrateSubmit}>
              <div className="form-group">
                <label>迁移至分类（可选）</label>
                <select
                  value={migrateForm.targetCategoryId}
                  onChange={(e) => setMigrateForm({ ...migrateForm, targetCategoryId: e.target.value })}
                >
                  <option value="">不改变</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>关联至展厅（可选）</label>
                <select
                  value={migrateForm.targetExhibitionId}
                  onChange={(e) => setMigrateForm({
                    ...migrateForm,
                    targetExhibitionId: e.target.value === '__clear__' ? '' : e.target.value
                  })}
                >
                  <option value="">不改变</option>
                  <option value="__clear__">取消关联</option>
                  {exhibitions.map(e => (
                    <option key={e.id} value={e.id}>🏛 {e.title || '未命名展厅'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>关联至家庭纪念册（可选）</label>
                <select
                  value={migrateForm.targetFamilyAlbumId}
                  onChange={(e) => setMigrateForm({
                    ...migrateForm,
                    targetFamilyAlbumId: e.target.value === '__clear__' ? '' : e.target.value
                  })}
                >
                  <option value="">不改变</option>
                  <option value="__clear__">取消关联</option>
                  {familyAlbums.map(a => (
                    <option key={a.id} value={a.id}>📖 {a.title || '未命名纪念册'}</option>
                  ))}
                </select>
              </div>
              <div className="form-hint">
                提示：至少选择一个迁移目标
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowMigrateModal(false)}>取消</button>
                <button type="submit" className="primary">开始迁移</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && '✓ '}
          {toast.type === 'error' && '✗ '}
          {toast.type === 'warning' && '⚠ '}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default DigitalRelicCenter;
