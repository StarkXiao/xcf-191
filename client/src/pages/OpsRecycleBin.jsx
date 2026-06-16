import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialApi } from '../services/api.js';
import './OpsRecycleBin.scss';

const TYPE_LABELS = {
  text: '文本',
  image: '图片',
  audio: '音频',
  video: '视频',
  unknown: '未知'
};

const TYPE_ICONS = {
  text: '✎',
  image: '📷',
  audio: '🎵',
  video: '🎬',
  unknown: '📄'
};

function OpsRecycleBin() {
  const navigate = useNavigate();
  const [recycleData, setRecycleData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRecycleList();
  }, [page, filterType, keyword]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData] = await Promise.all([
        materialApi.recycleStats()
      ]);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecycleList = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (filterType !== 'all') {
        params.type = filterType;
      }
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      const data = await materialApi.recycleList(params);
      setRecycleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (!recycleData?.items) return;
    if (selectedIds.size === recycleData.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recycleData.items.map(item => item.id)));
    }
  };

  const handleRestore = async (id) => {
    if (!confirm('确定要恢复这个素材吗？恢复后将重新出现在原展厅中。')) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await materialApi.recycleRestore(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await Promise.all([loadData(), loadRecycleList()]);
    } catch (err) {
      alert(err.response?.data?.error || '恢复失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!confirm('确定要永久删除这个素材吗？此操作不可恢复，文件将被彻底删除！')) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await materialApi.recyclePermanentDelete(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await Promise.all([loadData(), loadRecycleList()]);
    } catch (err) {
      alert(err.response?.data?.error || '删除失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要恢复选中的 ${selectedIds.size} 个素材吗？`)) return;
    setActionLoading(prev => ({ ...prev, batch: true }));
    try {
      await materialApi.recycleBatchRestore(Array.from(selectedIds));
      setSelectedIds(new Set());
      await Promise.all([loadData(), loadRecycleList()]);
    } catch (err) {
      alert(err.response?.data?.error || '批量恢复失败');
    } finally {
      setActionLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要永久删除选中的 ${selectedIds.size} 个素材吗？此操作不可恢复！`)) return;
    setActionLoading(prev => ({ ...prev, batch: true }));
    try {
      await materialApi.recycleBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      await Promise.all([loadData(), loadRecycleList()]);
    } catch (err) {
      alert(err.response?.data?.error || '批量删除失败');
    } finally {
      setActionLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const typeOptions = useMemo(() => {
    const options = [{ value: 'all', label: '全部' }];
    if (stats?.typeCount) {
      Object.entries(stats.typeCount).forEach(([type, count]) => {
        options.push({
          value: type,
          label: `${TYPE_ICONS[type] || '📄'} ${TYPE_LABELS[type] || type}`
        });
      });
    }
    return options;
  }, [stats]);

  const totalPages = recycleData ? Math.ceil(recycleData.total / pageSize) : 0;

  if (loading && !recycleData) {
    return <div className="ops-recycle-bin"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="ops-recycle-bin">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops')}>
          <span>←</span> 返回运营中心
        </button>
        <div className="header-content">
          <h1>素材回收站</h1>
          <button className="btn-primary" onClick={() => { loadData(); loadRecycleList(); }}>
            刷新
          </button>
        </div>
      </div>

      {stats && (
        <div className="summary-cards">
          <div className="summary-card total">
            <span className="summary-value">{stats.total}</span>
            <span className="summary-label">回收站总数</span>
          </div>
          <div className="summary-card size">
            <span className="summary-value">{formatSize(stats.totalFileSize)}</span>
            <span className="summary-label">占用空间</span>
          </div>
          {stats.typeCount && Object.entries(stats.typeCount).map(([type, count]) => (
            <div key={type} className="summary-card" onClick={() => setFilterType(type)}>
              <span className="summary-value">{count}</span>
              <span className="summary-label">{TYPE_LABELS[type] || type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-left">
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              className={`filter-btn ${filterType === opt.value ? 'active' : ''}`}
              onClick={() => { setFilterType(opt.value); setPage(1); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="filter-right">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 搜索素材标题或描述..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="batch-bar">
          <span>已选择 {selectedIds.size} 个素材</span>
          <div className="batch-actions">
            <button
              className="btn-restore"
              onClick={handleBatchRestore}
              disabled={actionLoading.batch}
            >
              {actionLoading.batch ? '处理中...' : '↩️ 批量恢复'}
            </button>
            <button
              className="btn-delete"
              onClick={handleBatchDelete}
              disabled={actionLoading.batch}
            >
              {actionLoading.batch ? '处理中...' : '🗑️ 批量永久删除'}
            </button>
          </div>
        </div>
      )}

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={recycleData?.items?.length > 0 && selectedIds.size === recycleData.items.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>素材</th>
              <th>类型</th>
              <th>所属展厅</th>
              <th>删除时间</th>
              <th>关联节点</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {recycleData?.items?.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">回收站为空</div>
                </td>
              </tr>
            ) : (
              recycleData?.items?.map(item => (
                <tr key={item.id} className={selectedIds.has(item.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td>
                    <div className="material-info">
                      <span className="material-icon">{TYPE_ICONS[item.type] || '📄'}</span>
                      <div className="material-meta">
                        <div className="material-title">{item.title || '未命名素材'}</div>
                        {item.url && (
                          <div className="material-url" title={item.url}>
                            {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="type-tag">{TYPE_LABELS[item.type] || item.type}</span>
                  </td>
                  <td>{item.exhibitionTitle || '-'}</td>
                  <td>{new Date(item.deletedAt).toLocaleString('zh-CN')}</td>
                  <td>
                    {item.deletedRelations?.timelineNodes?.length > 0 ? (
                      <div className="relation-tags">
                        {item.deletedRelations.timelineNodes.slice(0, 2).map(node => (
                          <span key={node.nodeId} className="relation-tag">
                            ⌛ {node.nodeTitle}
                          </span>
                        ))}
                        {item.deletedRelations.timelineNodes.length > 2 && (
                          <span className="relation-tag more">
                            +{item.deletedRelations.timelineNodes.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="no-relation">无关联</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-link restore"
                      onClick={() => handleRestore(item.id)}
                      disabled={actionLoading[item.id]}
                    >
                      {actionLoading[item.id] ? '恢复中...' : '恢复'}
                    </button>
                    <button
                      className="btn-link danger"
                      onClick={() => handlePermanentDelete(item.id)}
                      disabled={actionLoading[item.id]}
                    >
                      {actionLoading[item.id] ? '删除中...' : '永久删除'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </button>
          <span className="page-info">
            第 {page} / {totalPages} 页，共 {recycleData?.total || 0} 条
          </span>
          <button
            className="page-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default OpsRecycleBin;
