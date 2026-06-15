import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi } from '../services/api.js';
import './OpsFileRepair.scss';

function OpsFileRepair() {
  const navigate = useNavigate();
  const [abnormalData, setAbnormalData] = useState(null);
  const [repairLogs, setRepairLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('abnormal');
  const [repairing, setRepairing] = useState({});
  const [selectedOrphans, setSelectedOrphans] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [abnormal, logs] = await Promise.all([
        opsApi.getAbnormalFiles(),
        opsApi.getRepairLogs({ page: 1, pageSize: 50 })
      ]);
      setAbnormalData(abnormal);
      setRepairLogs(logs.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async (materialId, action, newUrl) => {
    setRepairing(prev => ({ ...prev, [materialId]: true }));
    try {
      await opsApi.repairFile({ materialId, action, newUrl });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || '修复失败');
    } finally {
      setRepairing(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const handleOrphanCleanup = async () => {
    if (selectedOrphans.size === 0) return;
    if (!confirm(`确定清理 ${selectedOrphans.size} 个孤立文件？`)) return;
    try {
      await opsApi.cleanupOrphans(Array.from(selectedOrphans));
      setSelectedOrphans(new Set());
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || '清理失败');
    }
  };

  const toggleOrphan = (url) => {
    const next = new Set(selectedOrphans);
    if (next.has(url)) {
      next.delete(url);
    } else {
      next.add(url);
    }
    setSelectedOrphans(next);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading && !abnormalData) {
    return <div className="ops-file-repair"><div className="loading">扫描中...</div></div>;
  }

  return (
    <div className="ops-file-repair">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops')}>
          <span>←</span> 返回运营中心
        </button>
        <div className="header-content">
          <h1>异常文件修复</h1>
          <button className="btn-primary" onClick={loadData}>重新扫描</button>
        </div>
      </div>

      {abnormalData && (
        <div className="summary-cards">
          <div className="summary-card error">
            <span className="summary-value">{abnormalData.abnormalCount}</span>
            <span className="summary-label">异常文件</span>
          </div>
          <div className="summary-card warning">
            <span className="summary-value">{abnormalData.orphanCount}</span>
            <span className="summary-label">孤立文件</span>
          </div>
        </div>
      )}

      <div className="tabs-bar">
        <button
          className={`tab-item ${activeTab === 'abnormal' ? 'active' : ''}`}
          onClick={() => setActiveTab('abnormal')}
        >
          异常文件 ({abnormalData?.abnormalCount || 0})
        </button>
        <button
          className={`tab-item ${activeTab === 'orphans' ? 'active' : ''}`}
          onClick={() => setActiveTab('orphans')}
        >
          孤立文件 ({abnormalData?.orphanCount || 0})
        </button>
        <button
          className={`tab-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          修复日志 ({repairLogs.length})
        </button>
      </div>

      {activeTab === 'abnormal' && abnormalData && (
        <div className="abnormal-list">
          {abnormalData.abnormalFiles.length === 0 ? (
            <div className="empty">所有文件正常，无异常</div>
          ) : (
            abnormalData.abnormalFiles.map(file => (
              <div key={file.id} className="file-card error">
                <div className="file-info">
                  <div className="file-title">
                    <span className="file-icon">❌</span>
                    <span>{file.materialTitle}</span>
                    <span className="file-type">{file.type}</span>
                  </div>
                  <div className="file-detail">{file.exhibitionTitle}</div>
                  <div className="file-path">{file.url}</div>
                  <div className="file-issues">
                    {file.issues.map((issue, idx) => (
                      <span key={idx} className="issue-tag">{issue}</span>
                    ))}
                  </div>
                  <div className="file-suggestion">建议：{file.repairSuggestion}</div>
                </div>
                <div className="file-actions">
                  {file.canRepair && (
                    <>
                      <button
                        className="btn-repair"
                        disabled={repairing[file.id]}
                        onClick={() => handleRepair(file.id, 'remove')}
                      >
                        {repairing[file.id] ? '处理中...' : '移除链接'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'orphans' && abnormalData && (
        <div className="orphan-section">
          {selectedOrphans.size > 0 && (
            <div className="batch-bar">
              <span>已选择 {selectedOrphans.size} 个文件</span>
              <button className="btn-danger" onClick={handleOrphanCleanup}>批量清理</button>
            </div>
          )}
          {abnormalData.orphanFiles.length === 0 ? (
            <div className="empty">无孤立文件</div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>文件名</th>
                    <th>目录</th>
                    <th>大小</th>
                    <th>建议</th>
                  </tr>
                </thead>
                <tbody>
                  {abnormalData.orphanFiles.map((file, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrphans.has(file.url)}
                          onChange={() => toggleOrphan(file.url)}
                        />
                      </td>
                      <td className="file-name">{file.filename}</td>
                      <td>{file.dir}</td>
                      <td>{formatSize(file.size)}</td>
                      <td className="text-muted">{file.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="logs-section">
          {repairLogs.length === 0 ? (
            <div className="empty">暂无修复记录</div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>素材</th>
                    <th>操作</th>
                    <th>原URL</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {repairLogs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                      <td>{log.materialTitle || '-'}</td>
                      <td>
                        <span className="action-tag">{log.action}</span>
                      </td>
                      <td className="url-cell">{log.oldUrl || '-'}</td>
                      <td>
                        <span className={`result-tag ${log.result}`}>{log.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OpsFileRepair;
