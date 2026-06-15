import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi } from '../services/api.js';
import './OpsFileRepair.scss';

const ACTION_LABELS = {
  'upload-replace': '上传替换',
  'bind-orphan': '绑定孤立文件',
  'replace': '手动替换URL',
  'remove': '移除链接',
  'orphan-cleanup': '清理孤立文件'
};

const RESULT_LABELS = {
  'replaced': '已替换',
  'removed': '已移除',
  'cleaned': '已清理'
};

function OpsFileRepair() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [abnormalData, setAbnormalData] = useState(null);
  const [repairLogs, setRepairLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('abnormal');
  const [repairing, setRepairing] = useState({});
  const [selectedOrphans, setSelectedOrphans] = useState(new Set());

  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTarget, setRepairTarget] = useState(null);
  const [bindSource, setBindSource] = useState('material');
  const [sourceOrphanFile, setSourceOrphanFile] = useState(null);
  const [selectedTargetMaterialId, setSelectedTargetMaterialId] = useState('');
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('');

  const [repairMode, setRepairMode] = useState('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const [selectedOrphanUrl, setSelectedOrphanUrl] = useState('');
  const [repairResult, setRepairResult] = useState(null);

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

  const openRepairModalFromMaterial = (file) => {
    setRepairTarget(file);
    setBindSource('material');
    setSourceOrphanFile(null);
    setSelectedTargetMaterialId('');
    setMaterialSearchKeyword('');
    setRepairMode('upload');
    setUploadProgress(0);
    setUploading(false);
    setSelectedFile(null);
    setManualUrl('');
    setSelectedOrphanUrl('');
    setRepairResult(null);
    setShowRepairModal(true);
  };

  const openBindModalFromOrphan = (orphanFile) => {
    setSourceOrphanFile(orphanFile);
    setSelectedOrphanUrl(orphanFile.url);
    setBindSource('orphan');
    setRepairTarget(null);
    setSelectedTargetMaterialId('');
    setMaterialSearchKeyword('');
    setRepairMode('bind');
    setUploadProgress(0);
    setUploading(false);
    setSelectedFile(null);
    setManualUrl('');
    setRepairResult(null);
    setShowRepairModal(true);
  };

  const closeRepairModal = () => {
    setShowRepairModal(false);
    setRepairTarget(null);
    setSourceOrphanFile(null);
    setSelectedTargetMaterialId('');
    setMaterialSearchKeyword('');
    setRepairResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadRepair = async () => {
    if (!selectedFile || !repairTarget) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await opsApi.uploadRepairFile(
        repairTarget.id,
        selectedFile,
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      );
      setRepairResult({
        success: true,
        mode: 'upload',
        message: '文件上传并修复成功',
        details: result
      });
      setTimeout(() => {
        loadData();
        closeRepairModal();
      }, 1500);
    } catch (err) {
      setRepairResult({
        success: false,
        mode: 'upload',
        message: err.response?.data?.error || '上传修复失败'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBindOrphan = async () => {
    if (bindSource === 'material') {
      if (!selectedOrphanUrl || !repairTarget) return;
    } else {
      if (!selectedTargetMaterialId || !selectedOrphanUrl) return;
    }

    setUploading(true);
    try {
      const materialId = bindSource === 'material' ? repairTarget.id : selectedTargetMaterialId;
      const result = await opsApi.bindOrphanFile(materialId, selectedOrphanUrl);
      setRepairResult({
        success: true,
        mode: 'bind',
        message: '孤立文件绑定成功',
        details: result
      });
      setTimeout(() => {
        loadData();
        closeRepairModal();
      }, 1500);
    } catch (err) {
      setRepairResult({
        success: false,
        mode: 'bind',
        message: err.response?.data?.error || '绑定失败'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleManualReplace = async () => {
    if (!manualUrl || !repairTarget) return;
    setUploading(true);
    try {
      const result = await opsApi.repairFile({
        materialId: repairTarget.id,
        action: 'replace',
        newUrl: manualUrl
      });
      setRepairResult({
        success: true,
        mode: 'manual',
        message: 'URL 更新成功',
        details: result
      });
      setTimeout(() => {
        loadData();
        closeRepairModal();
      }, 1500);
    } catch (err) {
      setRepairResult({
        success: false,
        mode: 'manual',
        message: err.response?.data?.error || 'URL 更新失败'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (materialId) => {
    if (!confirm('确定移除该素材的文件链接？此操作不会删除孤立文件。')) return;
    setRepairing(prev => ({ ...prev, [materialId]: true }));
    try {
      await opsApi.repairFile({ materialId, action: 'remove' });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    } finally {
      setRepairing(prev => ({ ...prev, [materialId]: false }));
    }
  };

  const handleOrphanCleanup = async () => {
    if (selectedOrphans.size === 0) return;
    if (!confirm(`确定清理 ${selectedOrphans.size} 个孤立文件？此操作不可恢复。`)) return;
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

  const getIssueIcon = (issues) => {
    if (issues.includes('文件丢失')) return '📭';
    if (issues.includes('文件为空')) return '📄';
    if (issues.some(i => i.includes('不匹配'))) return '🔀';
    return '⚠️';
  };

  const orphanOptions = abnormalData?.orphanFiles || [];
  const abnormalFiles = abnormalData?.abnormalFiles || [];

  const filteredTargetMaterials = useMemo(() => {
    if (!materialSearchKeyword.trim()) return abnormalFiles;
    const keyword = materialSearchKeyword.toLowerCase();
    return abnormalFiles.filter(f =>
      f.materialTitle?.toLowerCase().includes(keyword) ||
      f.exhibitionTitle?.toLowerCase().includes(keyword) ||
      f.type?.toLowerCase().includes(keyword)
    );
  }, [abnormalFiles, materialSearchKeyword]);

  const selectedTargetMaterial = useMemo(() => {
    return abnormalFiles.find(f => f.id === selectedTargetMaterialId) || null;
  }, [abnormalFiles, selectedTargetMaterialId]);

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
            <div className="empty-success">
              <span className="success-icon">🎉</span>
              <span>所有文件正常，无异常</span>
            </div>
          ) : (
            abnormalData.abnormalFiles.map(file => (
              <div key={file.id} className={`file-card ${file.issues.length > 0 ? 'error' : 'warning'}`}>
                <div className="file-info">
                  <div className="file-title">
                    <span className="file-icon">{getIssueIcon(file.issues)}</span>
                    <span>{file.materialTitle}</span>
                    <span className="file-type">{file.type}</span>
                    {file.exists && (
                      <span className="file-size">{formatSize(file.fileSize)}</span>
                    )}
                  </div>
                  <div className="file-detail">
                    <span className="detail-label">所属展厅：</span>{file.exhibitionTitle}
                  </div>
                  <div className="file-path">
                    <span className="detail-label">当前URL：</span>{file.url}
                  </div>
                  <div className="file-issues">
                    {file.issues.map((issue, idx) => (
                      <span key={idx} className="issue-tag">
                        <span className="issue-dot" />
                        {issue}
                      </span>
                    ))}
                  </div>
                  <div className="file-suggestion">
                    <span className="suggestion-label">💡 建议：</span>
                    {file.repairSuggestion}
                  </div>
                </div>
                <div className="file-actions">
                  {file.canRepair && (
                    <>
                      <button
                        className="btn-repair primary"
                        disabled={repairing[file.id]}
                        onClick={() => openRepairModalFromMaterial(file)}
                      >
                        🔧 修复
                      </button>
                      <button
                        className="btn-repair danger"
                        disabled={repairing[file.id]}
                        onClick={() => handleRemove(file.id)}
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
            <div className="empty-success">
              <span className="success-icon">🎉</span>
              <span>无孤立文件</span>
            </div>
          ) : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>文件名</th>
                    <th>目录</th>
                    <th>大小</th>
                    <th>操作</th>
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
                      <td className="actions-cell">
                        {abnormalData.abnormalCount > 0 && (
                          <button
                            className="btn-link"
                            onClick={() => openBindModalFromOrphan(file)}
                          >
                            🔗 绑定到素材
                          </button>
                        )}
                      </td>
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
                    <th>操作类型</th>
                    <th>原URL</th>
                    <th>新URL</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {repairLogs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                      <td>{log.materialTitle || '-'}</td>
                      <td>
                        <span className="action-tag">{ACTION_LABELS[log.action] || log.action}</span>
                      </td>
                      <td className="url-cell">{log.oldUrl || '-'}</td>
                      <td className="url-cell">{log.newUrl || '-'}</td>
                      <td>
                        <span className={`result-tag ${log.result}`}>
                          {RESULT_LABELS[log.result] || log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showRepairModal && (
        <div className="modal-overlay" onClick={!uploading && !repairResult?.success ? closeRepairModal : undefined}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {bindSource === 'orphan' ? '绑定孤立文件到素材' : '修复异常文件'}
              </h3>
              {!repairResult && !uploading && (
                <button className="modal-close" onClick={closeRepairModal}>×</button>
              )}
            </div>

            {sourceOrphanFile && (
              <div className="repair-target-info">
                <div className="info-row">
                  <span className="info-label">源文件：</span>
                  <span className="info-value">{sourceOrphanFile.filename}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">目录：</span>
                  <span className="info-value">{sourceOrphanFile.dir}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">大小：</span>
                  <span className="info-value">{formatSize(sourceOrphanFile.size)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">URL：</span>
                  <span className="info-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {sourceOrphanFile.url}
                  </span>
                </div>
              </div>
            )}

            {repairTarget && (
              <div className="repair-target-info">
                <div className="info-row">
                  <span className="info-label">素材：</span>
                  <span className="info-value">{repairTarget.materialTitle}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">展厅：</span>
                  <span className="info-value">{repairTarget.exhibitionTitle}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">问题：</span>
                  <span className="info-value error">
                    {repairTarget.issues.join('；')}
                  </span>
                </div>
              </div>
            )}

            {!repairResult && (
              <>
                {bindSource === 'material' && (
                  <div className="repair-modes">
                    <button
                      className={`mode-btn ${repairMode === 'upload' ? 'active' : ''}`}
                      onClick={() => setRepairMode('upload')}
                      disabled={uploading}
                    >
                      <span className="mode-icon">📤</span>
                      <span className="mode-title">上传新文件</span>
                      <span className="mode-desc">选择本地文件上传替换</span>
                    </button>
                    <button
                      className={`mode-btn ${repairMode === 'bind' ? 'active' : ''}`}
                      onClick={() => setRepairMode('bind')}
                      disabled={uploading || orphanOptions.length === 0}
                    >
                      <span className="mode-icon">🔗</span>
                      <span className="mode-title">绑定孤立文件</span>
                      <span className="mode-desc">从孤立文件中选择绑定</span>
                      {orphanOptions.length === 0 && <span className="mode-disabled">暂无可绑定文件</span>}
                    </button>
                    <button
                      className={`mode-btn ${repairMode === 'manual' ? 'active' : ''}`}
                      onClick={() => setRepairMode('manual')}
                      disabled={uploading}
                    >
                      <span className="mode-icon">✏️</span>
                      <span className="mode-title">手动输入URL</span>
                      <span className="mode-desc">直接输入新的文件地址</span>
                    </button>
                  </div>
                )}

                <div className="repair-content">
                  {bindSource === 'material' && repairMode === 'upload' && (
                    <div className="upload-section">
                      <div
                        className="drop-zone"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) setSelectedFile(file);
                        }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={handleFileSelect}
                        />
                        {selectedFile ? (
                          <div className="selected-file">
                            <span className="file-icon">📄</span>
                            <div className="file-meta">
                              <div className="file-name">{selectedFile.name}</div>
                              <div className="file-size-text">{formatSize(selectedFile.size)}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-file"
                              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="drop-hint">
                            <span className="hint-icon">📁</span>
                            <p>点击或拖拽文件到此处上传</p>
                            <p className="hint-sub">支持图片、音频、视频文件</p>
                          </div>
                        )}
                      </div>
                      {uploading && uploadProgress > 0 && (
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                          <span className="progress-text">{uploadProgress}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {bindSource === 'material' && repairMode === 'bind' && (
                    <div className="bind-section">
                      <label className="form-label">选择孤立文件</label>
                      <select
                        className="form-input"
                        value={selectedOrphanUrl}
                        onChange={(e) => setSelectedOrphanUrl(e.target.value)}
                        disabled={uploading}
                      >
                        <option value="">请选择孤立文件</option>
                        {orphanOptions.map((file, idx) => (
                          <option key={idx} value={file.url}>
                            {file.filename} ({formatSize(file.size)}) - {file.dir}
                          </option>
                        ))}
                      </select>
                      <p className="form-hint">
                        {selectedOrphanUrl
                          ? `将绑定：${selectedOrphanUrl}`
                          : '选择一个孤立文件绑定到该素材'}
                      </p>
                    </div>
                  )}

                  {bindSource === 'material' && repairMode === 'manual' && (
                    <div className="manual-section">
                      <label className="form-label">新文件URL</label>
                      <input
                        type="text"
                        className="form-input"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="例如：/uploads/images/xxx.jpg 或 https://..."
                        disabled={uploading}
                      />
                      <p className="form-hint">
                        输入有效的文件URL，可以是本地上传路径或外部URL
                      </p>
                    </div>
                  )}

                  {bindSource === 'orphan' && (
                    <div className="target-material-section">
                      <label className="form-label">选择目标素材</label>
                      <div className="material-search">
                        <input
                          type="text"
                          className="form-input"
                          value={materialSearchKeyword}
                          onChange={(e) => setMaterialSearchKeyword(e.target.value)}
                          placeholder="🔍 搜索素材名称、展厅或类型..."
                          disabled={uploading}
                        />
                      </div>
                      <div className="material-list">
                        {filteredTargetMaterials.length === 0 ? (
                          <div className="material-empty">暂无匹配的异常素材</div>
                        ) : (
                          filteredTargetMaterials.map(file => (
                            <div
                              key={file.id}
                              className={`material-item ${selectedTargetMaterialId === file.id ? 'selected' : ''}`}
                              onClick={() => !uploading && setSelectedTargetMaterialId(file.id)}
                            >
                              <div className="material-item-main">
                                <span className="material-icon">{getIssueIcon(file.issues)}</span>
                                <div className="material-item-info">
                                  <div className="material-item-title">{file.materialTitle}</div>
                                  <div className="material-item-meta">
                                    <span className="material-type">{file.type}</span>
                                    <span className="material-exhibition">{file.exhibitionTitle}</span>
                                  </div>
                                  <div className="material-item-issues">
                                    {file.issues.map((issue, idx) => (
                                      <span key={idx} className="issue-tag small">
                                        {issue}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="material-item-check">
                                {selectedTargetMaterialId === file.id && <span>✓</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="form-hint">
                        {selectedTargetMaterial
                          ? `已选择：${selectedTargetMaterial.materialTitle}`
                          : `共 ${filteredTargetMaterials.length} 个异常素材可选，点击选择目标素材`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-secondary"
                    onClick={closeRepairModal}
                    disabled={uploading}
                  >
                    取消
                  </button>
                  {bindSource === 'material' && repairMode === 'upload' && (
                    <button
                      className="btn-primary"
                      onClick={handleUploadRepair}
                      disabled={!selectedFile || uploading || !repairTarget}
                    >
                      {uploading ? '上传中...' : '上传并修复'}
                    </button>
                  )}
                  {(bindSource === 'material' && repairMode === 'bind') && (
                    <button
                      className="btn-primary"
                      onClick={handleBindOrphan}
                      disabled={!selectedOrphanUrl || uploading || !repairTarget}
                    >
                      {uploading ? '绑定中...' : '确认绑定'}
                    </button>
                  )}
                  {bindSource === 'orphan' && (
                    <button
                      className="btn-primary"
                      onClick={handleBindOrphan}
                      disabled={!selectedTargetMaterialId || uploading || !selectedOrphanUrl}
                    >
                      {uploading ? '绑定中...' : '确认绑定'}
                    </button>
                  )}
                  {bindSource === 'material' && repairMode === 'manual' && (
                    <button
                      className="btn-primary"
                      onClick={handleManualReplace}
                      disabled={!manualUrl || uploading || !repairTarget}
                    >
                      {uploading ? '更新中...' : '确认更新'}
                    </button>
                  )}
                </div>
              </>
            )}

            {repairResult && (
              <div className={`repair-result ${repairResult.success ? 'success' : 'error'}`}>
                <div className="result-icon">
                  {repairResult.success ? '✅' : '❌'}
                </div>
                <div className="result-title">
                  {repairResult.success ? '修复成功' : '修复失败'}
                </div>
                <div className="result-message">{repairResult.message}</div>
                {repairResult.success && repairResult.details?.material && (
                  <div className="result-details">
                    <div className="detail-row">
                      <span>素材：</span>
                      <span>{repairResult.details.material.title || repairResult.details.material.name}</span>
                    </div>
                    <div className="detail-row">
                      <span>新URL：</span>
                      <span className="new-url">{repairResult.details.material.url}</span>
                    </div>
                    {repairResult.details.oldFileDeleted && (
                      <div className="detail-row info">
                        <span>ℹ️</span>
                        <span>原文件已清理</span>
                      </div>
                    )}
                    {repairResult.details.uploadedFile && (
                      <div className="detail-row">
                        <span>📄</span>
                        <span>{repairResult.details.uploadedFile.filename}</span>
                      </div>
                    )}
                  </div>
                )}
                {!repairResult.success && (
                  <button className="btn-secondary" onClick={() => setRepairResult(null)}>
                    返回重试
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsFileRepair;
