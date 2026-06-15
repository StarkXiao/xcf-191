import React, { useState, useEffect } from 'react';
import { backupApi, exhibitionApi } from '../services/api.js';
import './BackupManager.scss';

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN');
};

const BackupManager = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [exports, setExports] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [importFile, setImportFile] = useState(null);
  const [importAnalysis, setImportAnalysis] = useState(null);
  const [importOptions, setImportOptions] = useState({
    dryRun: false,
    overwrite: false,
    idConflictStrategy: 'rename'
  });
  const [importResult, setImportResult] = useState(null);

  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    loadExports();
    loadExhibitions();
  }, []);

  const loadExports = async () => {
    try {
      const data = await backupApi.listExports();
      setExports(data);
    } catch (err) {
      showMessage('加载导出列表失败', 'error');
    }
  };

  const loadExhibitions = async () => {
    try {
      const data = await exhibitionApi.list();
      setExhibitions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleExportExhibition = async () => {
    if (!selectedExhibition) {
      showMessage('请选择要导出的展厅', 'warning');
      return;
    }
    setLoading(true);
    try {
      const result = await backupApi.exportExhibition(selectedExhibition);
      showMessage(`导出成功：${result.filename}`, 'success');
      loadExports();
    } catch (err) {
      showMessage(`导出失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    setLoading(true);
    try {
      const result = await backupApi.exportAll();
      showMessage(`完整备份成功：${result.filename}`, 'success');
      loadExports();
    } catch (err) {
      showMessage(`导出失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatic = async () => {
    if (!selectedExhibition) {
      showMessage('请选择要生成静态页的展厅', 'warning');
      return;
    }
    setLoading(true);
    try {
      const result = await backupApi.generateStatic(selectedExhibition);
      showMessage(`静态回忆页已生成：${result.filename}`, 'success');
      loadExports();
    } catch (err) {
      showMessage(`生成失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename) => {
    const url = backupApi.downloadExport(filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteExport = async (filename) => {
    if (!confirm(`确定要删除导出文件 ${filename} 吗？`)) return;
    try {
      await backupApi.deleteExport(filename);
      showMessage('删除成功', 'success');
      loadExports();
    } catch (err) {
      showMessage('删除失败', 'error');
    }
  };

  const handleImportFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportAnalysis(null);
    setImportResult(null);
    setLoading(true);
    try {
      const analysis = await backupApi.analyzeBackup(file);
      setImportAnalysis(analysis);
    } catch (err) {
      showMessage(`分析失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importAnalysis) return;
    if (!importAnalysis.valid) {
      showMessage('备份文件无效，无法导入', 'error');
      return;
    }
    if (importAnalysis.checksumsValid === false) {
      if (!confirm('文件校验发现不匹配，仍要继续导入吗？')) return;
    }
    setLoading(true);
    try {
      const result = await backupApi.executeImport({
        fileName: importAnalysis.fileName,
        ...importOptions
      });
      setImportResult(result);
      showMessage(
        result.dryRun ? '预演完成' : `导入成功：${result.scope === 'exhibition' ? result.exhibitionTitle : '完整数据'}`,
        'success'
      );
    } catch (err) {
      showMessage(`导入失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifyFile(file);
    setVerifyResult(null);
    setLoading(true);
    try {
      const result = await backupApi.verifyChecksums(file);
      setVerifyResult(result);
    } catch (err) {
      showMessage(`校验失败：${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backup-manager">
      <h2 className="page-title">📦 展厅导出与备份管理</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'export' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('export')}
        >
          导出 & 静态页
        </button>
        <button
          className={activeTab === 'exports' ? 'tab active' : 'tab'}
          onClick={() => { setActiveTab('exports'); loadExports(); }}
        >
          导出文件列表
        </button>
        <button
          className={activeTab === 'import' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('import')}
        >
          导入恢复
        </button>
        <button
          className={activeTab === 'verify' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('verify')}
        >
          文件校验
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'export' && (
          <div className="export-section">
            <div className="card">
              <h3>🎯 单展厅导出</h3>
              <p className="hint">将单个展厅的素材、时间线、留言等完整打包为 ZIP</p>
              <div className="form-row">
                <label>选择展厅：</label>
                <select
                  value={selectedExhibition}
                  onChange={(e) => setSelectedExhibition(e.target.value)}
                >
                  <option value="">-- 请选择展厅 --</option>
                  {exhibitions.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
              <div className="action-row">
                <button
                  className="btn primary"
                  onClick={handleExportExhibition}
                  disabled={loading || !selectedExhibition}
                >
                  {loading ? '处理中...' : '📦 导出展厅'}
                </button>
                <button
                  className="btn secondary"
                  onClick={handleGenerateStatic}
                  disabled={loading || !selectedExhibition}
                >
                  🌐 生成静态回忆页
                </button>
              </div>
            </div>

            <div className="card">
              <h3>💾 完整数据备份</h3>
              <p className="hint">导出所有展厅、家庭纪念册、素材等全部数据</p>
              <button
                className="btn warning"
                onClick={handleExportAll}
                disabled={loading}
              >
                {loading ? '处理中...' : '🔒 导出全部数据'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'exports' && (
          <div className="exports-list">
            {exports.length === 0 ? (
              <div className="empty">暂无导出文件</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>大小</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((f) => (
                    <tr key={f.filename}>
                      <td className="filename">{f.filename}</td>
                      <td>{formatSize(f.size)}</td>
                      <td>{formatDate(f.createdAt)}</td>
                      <td>
                        <button className="btn small" onClick={() => handleDownload(f.filename)}>
                          下载
                        </button>
                        <button className="btn small danger" onClick={() => handleDeleteExport(f.filename)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="import-section">
            <div className="card">
              <h3>📥 从备份文件恢复</h3>
              <p className="hint">选择 .zip 备份文件，系统会先分析内容，然后执行导入</p>
              <div className="form-row">
                <label>选择备份文件：</label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleImportFileSelect}
                />
              </div>

              {importAnalysis && (
                <div className={`analysis-result ${importAnalysis.valid ? 'valid' : 'invalid'}`}>
                  <h4>📋 分析结果</h4>
                  <div className="analysis-grid">
                    <div><strong>标题：</strong>{importAnalysis.title}</div>
                    <div><strong>范围：</strong>{importAnalysis.scope}</div>
                    <div><strong>版本：</strong>v{importAnalysis.version}</div>
                    <div><strong>导出时间：</strong>{formatDate(importAnalysis.exportedAt)}</div>
                    <div><strong>文件数：</strong>{importAnalysis.fileCount}</div>
                    <div>
                      <strong>清单有效：</strong>
                      {importAnalysis.valid ? <span className="ok">✅ 是</span> : <span className="err">❌ 否</span>}
                    </div>
                    <div>
                      <strong>校验通过：</strong>
                      {importAnalysis.checksumsValid === null ? (
                        <span className="warn">⚠️ 无校验信息</span>
                      ) : importAnalysis.checksumsValid ? (
                        <span className="ok">✅ 全部匹配</span>
                      ) : (
                        <span className="err">❌ 存在不匹配</span>
                      )}
                    </div>
                  </div>
                  {importAnalysis.stats && (
                    <div className="stats-grid">
                      <h5>📊 数据统计</h5>
                      {Object.entries(importAnalysis.stats).map(([k, v]) => (
                        <div key={k}><strong>{k}：</strong>{v}</div>
                      ))}
                    </div>
                  )}
                  {importAnalysis.validationErrors?.length > 0 && (
                    <div className="errors-box">
                      <h5>⚠️ 验证错误</h5>
                      <ul>
                        {importAnalysis.validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {importAnalysis && importAnalysis.valid && (
                <>
                  <div className="options">
                    <h4>⚙️ 导入选项</h4>
                    <label>
                      <input
                        type="checkbox"
                        checked={importOptions.dryRun}
                        onChange={(e) => setImportOptions({ ...importOptions, dryRun: e.target.checked })}
                      />
                      预演模式（不实际写入数据）
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={importOptions.overwrite}
                        onChange={(e) => setImportOptions({ ...importOptions, overwrite: e.target.checked })}
                      />
                      覆盖模式（全量导入时替换现有数据）
                    </label>
                    <div className="form-row">
                      <label>ID冲突策略：</label>
                      <select
                        value={importOptions.idConflictStrategy}
                        onChange={(e) => setImportOptions({ ...importOptions, idConflictStrategy: e.target.value })}
                      >
                        <option value="rename">生成新ID</option>
                        <option value="keep">保留原ID</option>
                      </select>
                    </div>
                  </div>
                  <button
                    className="btn success"
                    onClick={handleExecuteImport}
                    disabled={loading}
                  >
                    {loading ? '导入中...' : '🚀 执行导入'}
                  </button>
                </>
              )}

              {importResult && (
                <div className="import-result">
                  <h4>✅ 导入结果</h4>
                  <div className="result-grid">
                    <div><strong>模式：</strong>{importResult.dryRun ? '预演' : '实际导入'}</div>
                    <div><strong>范围：</strong>{importResult.scope}</div>
                    <div><strong>复制文件：</strong>{importResult.filesCopied}</div>
                    <div><strong>跳过文件：</strong>{importResult.filesSkipped}</div>
                    {importResult.scope === 'exhibition' && (
                      <>
                        <div><strong>展厅：</strong>{importResult.exhibitionTitle}</div>
                        <div><strong>素材：</strong>{importResult.materialsImported}</div>
                        <div><strong>时间线：</strong>{importResult.timelinesImported}</div>
                        <div><strong>留言：</strong>{importResult.messagesImported}</div>
                      </>
                    )}
                    {importResult.scope === 'full' && (
                      <>
                        <div><strong>展厅：</strong>{importResult.exhibitionsImported}</div>
                        <div><strong>素材：</strong>{importResult.materialsImported}</div>
                        <div><strong>时间线：</strong>{importResult.timelinesImported}</div>
                        <div><strong>留言：</strong>{importResult.messagesImported}</div>
                        <div><strong>家庭成员：</strong>{importResult.membersImported}</div>
                        <div><strong>纪念册：</strong>{importResult.albumsImported}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="verify-section">
            <div className="card">
              <h3>🔍 文件完整性校验</h3>
              <p className="hint">使用 SHA-256 校验 ZIP 包内每个文件的哈希值是否匹配</p>
              <div className="form-row">
                <label>选择备份文件：</label>
                <input type="file" accept=".zip" onChange={handleVerifyFileSelect} />
              </div>

              {verifyResult && (
                <div className={`verify-result ${verifyResult.checksumsValid ? 'ok' : 'err'}`}>
                  <h4>校验结果</h4>
                  <div>
                    <strong>清单有效：</strong>
                    {verifyResult.manifestValid ? <span className="ok">✅ 是</span> : <span className="err">❌ 否</span>}
                  </div>
                  <div>
                    <strong>文件校验：</strong>
                    {verifyResult.checksumsValid === null ? (
                      <span className="warn">⚠️ 包内无校验信息</span>
                    ) : verifyResult.checksumsValid ? (
                      <span className="ok">✅ 全部通过</span>
                    ) : (
                      <span className="err">❌ 存在不匹配</span>
                    )}
                  </div>
                  {verifyResult.checksumResults?.length > 0 && (
                    <div className="checksum-list">
                      <h5>文件明细</h5>
                      {verifyResult.checksumResults.map((r, i) => (
                        <div key={i} className={`checksum-item ${r.valid ? 'ok' : 'err'}`}>
                          <span className="status">{r.valid ? '✅' : '❌'}</span>
                          <span className="file">{r.file}</span>
                          {!r.valid && <span className="detail">{r.error || '哈希不匹配'}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;
