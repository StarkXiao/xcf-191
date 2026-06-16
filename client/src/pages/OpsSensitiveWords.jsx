import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { opsApi } from '../services/api.js';
import './OpsSensitiveWords.scss';

const CATEGORIES = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'abuse', label: '侮辱谩骂' },
  { value: 'politics', label: '政治敏感' },
  { value: 'porn', label: '色情低俗' },
  { value: 'violence', label: '暴力恐怖' },
  { value: 'other', label: '其他' }
];

function OpsSensitiveWords() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: '', page: 1, pageSize: 50 });
  const [total, setTotal] = useState(0);
  const [newWord, setNewWord] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [batchInput, setBatchInput] = useState('');
  const [batchCategory, setBatchCategory] = useState('other');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  useEffect(() => {
    loadWords();
  }, [filters.category, filters.page]);

  const loadWords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      params.page = filters.page;
      params.pageSize = filters.pageSize;
      const data = await opsApi.listSensitiveWords(params);
      setWords(data.items);
      setTotal(data.total);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    try {
      await opsApi.createSensitiveWord({ word: newWord.trim(), category: newCategory });
      setNewWord('');
      loadWords();
    } catch (err) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleBatchAdd = async () => {
    const wordList = batchInput.split('\n').map(w => w.trim()).filter(w => w);
    if (wordList.length === 0) return;
    try {
      const result = await opsApi.batchCreateSensitiveWords({ words: wordList, category: batchCategory });
      alert(`成功添加 ${result.added} 个敏感词`);
      setShowBatchModal(false);
      setBatchInput('');
      loadWords();
    } catch (err) {
      alert(err.response?.data?.error || '批量添加失败');
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    try {
      await opsApi.updateSensitiveWord(id, { enabled: !currentEnabled });
      loadWords();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除此敏感词吗？')) return;
    try {
      await opsApi.removeSensitiveWord(id);
      loadWords();
    } catch (err) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditWord(item.word);
    setEditCategory(item.category);
    setEditEnabled(item.enabled !== false);
  };

  const saveEdit = async () => {
    try {
      await opsApi.updateSensitiveWord(editingId, {
        word: editWord.trim(),
        category: editCategory,
        enabled: editEnabled
      });
      setEditingId(null);
      loadWords();
    } catch (err) {
      alert(err.response?.data?.error || '更新失败');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const totalPages = Math.ceil(total / filters.pageSize);

  const getCategoryLabel = (value) => {
    const found = CATEGORIES.find(c => c.value === value);
    return found ? found.label : value;
  };

  return (
    <div className="ops-sensitive-words">
      <div className="ops-header">
        <button className="back-btn" onClick={() => navigate('/ops/messages')}>
          <span>←</span> 返回留言处理
        </button>
        <div className="header-content">
          <h1>敏感词管理</h1>
          <span className="word-count">共 {total} 个敏感词</span>
        </div>
      </div>

      <div className="add-bar">
        <form className="add-form" onSubmit={handleAdd}>
          <input
            type="text"
            className="add-input"
            placeholder="输入敏感词"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            maxLength={50}
          />
          <select
            className="add-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={!newWord.trim()}>
            添加
          </button>
        </form>
        <button className="btn-secondary" onClick={() => setShowBatchModal(true)}>
          批量添加
        </button>
      </div>

      <div className="category-filter">
        <button
          className={`cat-btn ${!filters.category ? 'active' : ''}`}
          onClick={() => setFilters(f => ({ ...f, category: '', page: 1 }))}
        >
          全部
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            className={`cat-btn ${filters.category === c.value ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, category: c.value, page: 1 }))}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="words-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : words.length === 0 ? (
          <div className="empty">暂无敏感词</div>
        ) : (
          <table className="words-table">
            <thead>
              <tr>
                <th>敏感词</th>
                <th>分类</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {words.map(item => (
                <tr key={item.id} className={!item.enabled ? 'disabled' : ''}>
                  {editingId === item.id ? (
                    <>
                      <td>
                        <input
                          className="edit-input"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          maxLength={50}
                        />
                      </td>
                      <td>
                        <select
                          className="edit-category"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            checked={editEnabled}
                            onChange={(e) => setEditEnabled(e.target.checked)}
                          />
                          {editEnabled ? '启用' : '禁用'}
                        </label>
                      </td>
                      <td>-</td>
                      <td>
                        <button className="btn-sm btn-save" onClick={saveEdit}>保存</button>
                        <button className="btn-sm btn-cancel" onClick={cancelEdit}>取消</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="word-cell">{item.word}</td>
                      <td>
                        <span className="category-tag">{getCategoryLabel(item.category)}</span>
                      </td>
                      <td>
                        <button
                          className={`toggle-btn ${item.enabled !== false ? 'on' : 'off'}`}
                          onClick={() => handleToggle(item.id, item.enabled !== false)}
                        >
                          {item.enabled !== false ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="time-cell">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</td>
                      <td>
                        <button className="btn-sm btn-edit" onClick={() => startEdit(item)}>编辑</button>
                        <button className="btn-sm btn-delete" onClick={() => handleDelete(item.id)}>删除</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
          >上一页</button>
          <span className="page-info">{filters.page} / {totalPages} (共 {total} 条)</span>
          <button
            className="page-btn"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
          >下一页</button>
        </div>
      )}

      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>批量添加敏感词</h3>
            <div className="form-group">
              <label>分类</label>
              <select
                value={batchCategory}
                onChange={(e) => setBatchCategory(e.target.value)}
                className="form-select"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>敏感词列表（每行一个）</label>
              <textarea
                className="form-textarea"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="每行输入一个敏感词"
                rows={8}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBatchModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleBatchAdd}>批量添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsSensitiveWords;
