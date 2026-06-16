import React, { useState, useRef } from 'react';
import './TimelineEditor.scss';

function TimelineEditor({ exhibitionId, materials, timelines, onTimelinesChange, timelineApi }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    materialIds: [],
    location: null
  });

  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [splitModal, setSplitModal] = useState(false);
  const [splitTarget, setSplitTarget] = useState(null);
  const [splitGroups, setSplitGroups] = useState([]);
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeForm, setMergeForm] = useState({ title: '', eventDate: '' });

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const openModal = (item = null) => {
    if (item) {
      setEditing(item);
      setForm({
        title: item.title,
        description: item.description,
        eventDate: item.eventDate.split('T')[0],
        materialIds: [...(item.materialIds || [])],
        location: item.location ? { ...item.location } : null
      });
    } else {
      setEditing(null);
      setForm({
        title: '',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
        materialIds: [],
        location: null
      });
    }
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
  };

  const toggleMaterial = (id) => {
    setForm(prev => ({
      ...prev,
      materialIds: prev.materialIds.includes(id)
        ? prev.materialIds.filter(m => m !== id)
        : [...prev.materialIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('请输入标题');
      return;
    }
    const locationData = form.location && form.location.lat !== '' && form.location.lng !== ''
      ? {
          name: form.location.name,
          address: form.location.address,
          city: form.location.city,
          lat: parseFloat(form.location.lat),
          lng: parseFloat(form.location.lng)
        }
      : null;
    try {
      if (editing) {
        await timelineApi.update(editing.id, {
          ...form,
          eventDate: new Date(form.eventDate).toISOString(),
          location: locationData
        });
      } else {
        await timelineApi.create({
          exhibitionId,
          ...form,
          eventDate: new Date(form.eventDate).toISOString(),
          location: locationData
        });
      }
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
      closeModal();
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const toggleLocation = () => {
    setForm(prev => ({
      ...prev,
      location: prev.location
        ? null
        : { name: '', address: '', city: '', lat: '', lng: '' }
    }));
  };

  const updateLocation = (field, value) => {
    setForm(prev => ({
      ...prev,
      location: prev.location
        ? { ...prev.location, [field]: value }
        : { name: '', address: '', city: '', lat: '', lng: '', [field]: value }
    }));
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个时间节点吗？')) return;
    try {
      await timelineApi.remove(id);
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const toggleBatchSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds([]);
  };

  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...timelines];
    const [draggedItem] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, draggedItem);
    const orders = reordered.map((item, i) => ({ id: item.id, order: i }));
    try {
      await timelineApi.batchReorder(orders);
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
    } catch (err) {
      console.error('排序失败:', err);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      alert('请至少选择两个节点进行合并');
      return;
    }
    setMergeModal(true);
    const firstSelected = timelines.find(t => t.id === selectedIds[0]);
    setMergeForm({
      title: '',
      eventDate: firstSelected ? firstSelected.eventDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
  };

  const confirmMerge = async () => {
    try {
      const eventDate = mergeForm.eventDate
        ? new Date(mergeForm.eventDate).toISOString()
        : undefined;
      await timelineApi.batchMerge(selectedIds, mergeForm.title || undefined, eventDate);
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
      exitBatchMode();
      setMergeModal(false);
    } catch (err) {
      console.error('合并失败:', err);
      alert('合并失败，请重试');
    }
  };

  const openSplitModal = (node) => {
    if (!node.materialIds || node.materialIds.length < 2) {
      alert('节点至少需要关联2个素材才能拆分');
      return;
    }
    setSplitTarget(node);
    setSplitGroups([
      { title: '', materialIds: [node.materialIds[0]], eventDate: node.eventDate.split('T')[0] },
      { title: '', materialIds: node.materialIds.slice(1), eventDate: node.eventDate.split('T')[0] }
    ]);
    setSplitModal(true);
  };

  const addSplitGroup = () => {
    if (!splitTarget) return;
    setSplitGroups(prev => [
      ...prev,
      { title: '', materialIds: [], eventDate: splitTarget.eventDate.split('T')[0] }
    ]);
  };

  const removeSplitGroup = (idx) => {
    if (splitGroups.length <= 2) return;
    const groupToRemove = splitGroups[idx];
    if (groupToRemove && groupToRemove.materialIds.length > 0) {
      if (!confirm(`删除此分组后，其 ${groupToRemove.materialIds.length} 个素材将移动到第一个分组，确定继续？`)) return;
    }
    setSplitGroups(prev => {
      const removed = prev[idx];
      const remaining = prev.filter((_, i) => i !== idx);
      if (removed && removed.materialIds.length > 0 && remaining.length > 0) {
        remaining[0] = {
          ...remaining[0],
          materialIds: [...remaining[0].materialIds, ...removed.materialIds]
        };
      }
      return remaining;
    });
  };

  const updateSplitGroup = (idx, field, value) => {
    setSplitGroups(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };

  const findMaterialGroup = (matId) => {
    for (let i = 0; i < splitGroups.length; i++) {
      if (splitGroups[i].materialIds.includes(matId)) return i;
    }
    return -1;
  };

  const toggleSplitMaterial = (groupIdx, matId) => {
    setSplitGroups(prev => {
      const currentGroupIdx = prev.findIndex(g => g.materialIds.includes(matId));
      if (currentGroupIdx === groupIdx) {
        return prev.map((g, i) => {
          if (i !== groupIdx) return g;
          return { ...g, materialIds: g.materialIds.filter(id => id !== matId) };
        });
      }
      return prev.map((g, i) => {
        if (i === groupIdx) {
          return { ...g, materialIds: [...g.materialIds, matId] };
        }
        if (i === currentGroupIdx) {
          return { ...g, materialIds: g.materialIds.filter(id => id !== matId) };
        }
        return g;
      });
    });
  };

  const confirmSplit = async () => {
    if (!splitTarget) return;
    const originalMaterialIds = splitTarget.materialIds || [];
    const allAssigned = splitGroups.every(g => g.materialIds.length > 0);
    if (!allAssigned) {
      alert('每个分组至少需要一个素材');
      return;
    }
    const allFlatIds = splitGroups.reduce((acc, g) => acc.concat(g.materialIds), []);
    const uniqueIds = [...new Set(allFlatIds)];
    if (allFlatIds.length !== uniqueIds.length) {
      alert('存在重复分配的素材，请检查后重试');
      return;
    }
    const missingIds = originalMaterialIds.filter(id => !allFlatIds.includes(id));
    if (missingIds.length > 0) {
      alert(`还有 ${missingIds.length} 个素材未分配，请将所有素材分配到分组中`);
      return;
    }
    const extraIds = allFlatIds.filter(id => !originalMaterialIds.includes(id));
    if (extraIds.length > 0) {
      alert('存在不属于此节点的素材，请检查后重试');
      return;
    }
    try {
      const groups = splitGroups.map(g => ({
        title: g.title || undefined,
        description: undefined,
        eventDate: g.eventDate ? new Date(g.eventDate).toISOString() : undefined,
        materialIds: g.materialIds
      }));
      await timelineApi.split(splitTarget.id, groups);
      const updated = await timelineApi.list(exhibitionId);
      onTimelinesChange(updated);
      setSplitModal(false);
      setSplitTarget(null);
      setSplitGroups([]);
    } catch (err) {
      console.error('拆分失败:', err);
      alert('拆分失败，请重试');
    }
  };

  const getMaterialById = (id) => materials.find(m => m.id === id);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const renderMaterialThumb = (mat) => {
    if (!mat) return null;
    if (mat.type === 'image') {
      return <img src={mat.url} alt={mat.title} />;
    }
    if (mat.type === 'audio') {
      return <span className="mat-thumb-icon">🎵</span>;
    }
    if (mat.type === 'text') {
      return <span className="mat-thumb-icon">✎</span>;
    }
    if (mat.type === 'video') {
      return <span className="mat-thumb-icon">🎬</span>;
    }
    return null;
  };

  return (
    <div className="timeline-editor">
      <div className="editor-header">
        <p className="editor-hint">按时间顺序整理你的回忆，创建属于你的故事线</p>
        <div className="editor-actions">
          <button
            className={`batch-toggle-btn ${batchMode ? 'active' : ''}`}
            onClick={() => batchMode ? exitBatchMode() : setBatchMode(true)}
          >
            {batchMode ? '退出批量' : '批量编排'}
          </button>
          <button className="add-btn" onClick={() => openModal()}>
            <span>+</span> 添加时间节点
          </button>
        </div>
      </div>

      {batchMode && selectedIds.length > 0 && (
        <div className="batch-action-bar">
          <span className="batch-count">已选 {selectedIds.length} 个节点</span>
          <button className="batch-btn merge-btn" onClick={handleMerge} disabled={selectedIds.length < 2}>
            合并节点
          </button>
          <button className="batch-btn cancel-btn" onClick={exitBatchMode}>
            取消选择
          </button>
        </div>
      )}

      {timelines.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⌛</div>
          <p>还没有时间节点，点击上方按钮添加第一个回忆瞬间</p>
        </div>
      ) : (
        <div className="timeline">
          <div className="timeline-line"></div>
          {timelines.map((node, idx) => {
            const nodeMats = (node.materialIds || []).map(getMaterialById).filter(Boolean);
            const isSelected = selectedIds.includes(node.id);
            return (
              <div
                key={node.id}
                className={`timeline-node ${idx % 2 === 0 ? 'left' : 'right'} ${isSelected ? 'selected' : ''}`}
                draggable={!batchMode}
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="node-dot"></div>
                <div className="node-card">
                  {batchMode && (
                    <div className="node-batch-check" onClick={() => toggleBatchSelection(node.id)}>
                      <span className={`checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? '✓' : ''}
                      </span>
                    </div>
                  )}
                  {!batchMode && (
                    <div className="node-drag-handle" title="拖拽排序">⠿</div>
                  )}
                  <div className="node-date">{formatDate(node.eventDate)}</div>
                  <h3 className="node-title">{node.title}</h3>
                  {node.location && (
                    <div className="node-location">
                      <span className="location-icon">📍</span>
                      <span className="location-text">
                        {node.location.name || node.location.address || `${node.location.lat.toFixed(3)}, ${node.location.lng.toFixed(3)}`}
                      </span>
                    </div>
                  )}
                  {node.description && <p className="node-desc">{node.description}</p>}
                  {nodeMats.length > 0 && (
                    <div className="node-materials">
                      {nodeMats.map(mat => (
                        <div key={mat.id} className="node-mat-thumb">
                          {renderMaterialThumb(mat)}
                        </div>
                      ))}
                      <span className="node-mat-count">{nodeMats.length}个素材</span>
                    </div>
                  )}
                  <div className="node-actions">
                    <button onClick={() => openModal(node)}>编辑</button>
                    {!batchMode && node.materialIds && node.materialIds.length >= 2 && (
                      <button className="split-btn" onClick={() => openSplitModal(node)}>拆分</button>
                    )}
                    <button className="danger" onClick={() => handleDelete(node.id)}>删除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editing ? '编辑时间节点' : '添加时间节点'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>事件日期</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <label>标题 *</label>
                <input
                  type="text"
                  placeholder="这个时刻的标题"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
              <div className="form-row">
                <label>描述</label>
                <textarea
                  placeholder="描述这个特别的时刻..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <div className="form-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={form.location !== null}
                    onChange={toggleLocation}
                  />
                  <span>绑定地点信息</span>
                </label>
              </div>
              {form.location && (
                <div className="location-editor">
                  <div className="location-grid">
                    <div className="form-row">
                      <label>地点名称</label>
                      <input
                        type="text"
                        placeholder="如：外滩、埃菲尔铁塔"
                        value={form.location.name}
                        onChange={(e) => updateLocation('name', e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="form-row">
                      <label>城市</label>
                      <input
                        type="text"
                        placeholder="如：上海、巴黎"
                        value={form.location.city}
                        onChange={(e) => updateLocation('city', e.target.value)}
                        maxLength={50}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <label>详细地址</label>
                    <input
                      type="text"
                      placeholder="完整的地址信息"
                      value={form.location.address}
                      onChange={(e) => updateLocation('address', e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="location-grid">
                    <div className="form-row">
                      <label>纬度 *</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="如：31.2397"
                        value={form.location.lat}
                        onChange={(e) => updateLocation('lat', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <label>经度 *</label>
                      <input
                        type="number"
                        step="0.000001"
                        placeholder="如：121.4998"
                        value={form.location.lng}
                        onChange={(e) => updateLocation('lng', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <p className="hint-text">提示：经纬度可通过地图软件或在线工具查询，中国范围约为纬度 18-54，经度 73-135</p>
                </div>
              )}
              <div className="form-row">
                <label>关联素材</label>
                {materials.length === 0 ? (
                  <p className="hint-text">暂无素材，先去素材管理添加一些吧</p>
                ) : (
                  <div className="material-selector">
                    {materials.map(mat => (
                      <div
                        key={mat.id}
                        className={`mat-select-item ${form.materialIds.includes(mat.id) ? 'selected' : ''}`}
                        onClick={() => toggleMaterial(mat.id)}
                      >
                        <div className="mat-select-thumb">{renderMaterialThumb(mat)}</div>
                        <div className="mat-select-info">
                          <div className="mat-select-title">{mat.title || '未命名'}</div>
                          <div className="mat-select-type">
                            {mat.type === 'image' && '图片'}
                            {mat.type === 'audio' && '语音'}
                            {mat.type === 'text' && '文字'}
                            {mat.type === 'video' && '视频'}
                          </div>
                        </div>
                        <div className="mat-check">{form.materialIds.includes(mat.id) ? '✓' : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>取消</button>
                <button type="submit" className="primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mergeModal && (
        <div className="modal-overlay" onClick={() => setMergeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">合并 {selectedIds.length} 个时间节点</h3>
            <div className="merge-preview">
              {selectedIds.map(id => {
                const node = timelines.find(t => t.id === id);
                return node ? (
                  <div key={id} className="merge-preview-item">
                    <span className="merge-node-title">{node.title}</span>
                    <span className="merge-node-date">{formatDate(node.eventDate)}</span>
                    <span className="merge-node-mats">{(node.materialIds || []).length}个素材</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="form-row">
              <label>合并后标题（留空自动拼接）</label>
              <input
                type="text"
                placeholder="合并后的节点标题"
                value={mergeForm.title}
                onChange={(e) => setMergeForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="form-row">
              <label>合并后日期</label>
              <input
                type="date"
                value={mergeForm.eventDate}
                onChange={(e) => setMergeForm(prev => ({ ...prev, eventDate: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setMergeModal(false)}>取消</button>
              <button className="primary" onClick={confirmMerge}>确认合并</button>
            </div>
          </div>
        </div>
      )}

      {splitModal && splitTarget && (
        <div className="modal-overlay" onClick={() => setSplitModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">拆分节点：{splitTarget.title}</h3>
            <div className="split-overview">
              <span className="split-overview-text">
                共 {splitTarget.materialIds?.length || 0} 个素材，
                已分配 {splitGroups.reduce((acc, g) => acc + g.materialIds.length, 0)} 个
              </span>
              {splitGroups.reduce((acc, g) => acc + g.materialIds.length, 0) === (splitTarget.materialIds?.length || 0) ? (
                <span className="split-status complete">✓ 全部已分配</span>
              ) : (
                <span className="split-status pending">
                  还有 {(splitTarget.materialIds?.length || 0) - splitGroups.reduce((acc, g) => acc + g.materialIds.length, 0)} 个未分配
                </span>
              )}
            </div>
            <p className="hint-text">将此节点的素材拆分到多个新节点中，每个素材只能属于一个分组</p>
            {splitGroups.map((group, gIdx) => (
              <div key={gIdx} className="split-group">
                <div className="split-group-header">
                  <span className="split-group-label">
                    分组 {gIdx + 1}
                    <span className="split-group-count">{group.materialIds.length} 个素材</span>
                  </span>
                  {splitGroups.length > 2 && (
                    <button className="split-remove-btn" onClick={() => removeSplitGroup(gIdx)}>删除分组</button>
                  )}
                </div>
                <div className="form-row">
                  <label>标题（留空自动命名）</label>
                  <input
                    type="text"
                    placeholder={`分组 ${gIdx + 1} 标题`}
                    value={group.title}
                    onChange={(e) => updateSplitGroup(gIdx, 'title', e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="form-row">
                  <label>日期</label>
                  <input
                    type="date"
                    value={group.eventDate}
                    onChange={(e) => updateSplitGroup(gIdx, 'eventDate', e.target.value)}
                  />
                </div>
                <div className="split-materials">
                  <label>选择素材（点击移动到当前分组）</label>
                  <div className="split-mat-grid">
                    {(splitTarget.materialIds || []).map(matId => {
                      const mat = getMaterialById(matId);
                      if (!mat) return null;
                      const inGroup = group.materialIds.includes(matId);
                      const assignedGroup = findMaterialGroup(matId);
                      const inOther = assignedGroup !== -1 && assignedGroup !== gIdx;
                      return (
                        <div
                          key={matId}
                          className={`split-mat-item ${inGroup ? 'selected' : ''} ${inOther ? 'in-other-group' : ''}`}
                          onClick={() => toggleSplitMaterial(gIdx, matId)}
                          title={inOther ? `当前在分组 ${assignedGroup + 1}，点击移动到此分组` : ''}
                        >
                          {inOther && (
                            <span className="mat-other-badge">分组{assignedGroup + 1}</span>
                          )}
                          <div className="split-mat-thumb">{renderMaterialThumb(mat)}</div>
                          <span className="split-mat-name">{mat.title || '未命名'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            <button className="add-split-group-btn" onClick={addSplitGroup}>
              + 添加分组
            </button>
            <div className="modal-actions">
              <button onClick={() => setSplitModal(false)}>取消</button>
              <button className="primary" onClick={confirmSplit}>确认拆分</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimelineEditor;
