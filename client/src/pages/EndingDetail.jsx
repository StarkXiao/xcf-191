import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterProfileApi } from '../services/api.js';
import './EndingDetail.scss';

const ENDING_TYPE_MAP = {
  true: { name: '真结局', icon: '👑', color: '#ffd700' },
  good: { name: '好结局', icon: '🌟', color: '#98fb98' },
  normal: { name: '普通结局', icon: '📜', color: '#87ceeb' },
  bad: { name: '坏结局', icon: '💀', color: '#ff6347' },
  hidden: { name: '隐藏结局', icon: '🔮', color: '#dda0dd' }
};

function EndingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ending, setEnding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnding();
  }, [id]);

  const loadEnding = async () => {
    try {
      const data = await characterProfileApi.getEnding(id);
      setEnding(data);
    } catch (err) {
      console.error('加载结局失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除此结局？')) return;
    try {
      await characterProfileApi.removeEnding(id);
      navigate('/character-profiles');
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="ed-loading">
        <div className="loading-spinner"></div>
        <span>解读结局中...</span>
      </div>
    );
  }

  if (!ending) {
    return (
      <div className="ed-not-found">
        <div className="not-found-icon">🌫️</div>
        <h2>结局未找到</h2>
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>返回侧写馆</button>
      </div>
    );
  }

  const typeInfo = ENDING_TYPE_MAP[ending.type] || ENDING_TYPE_MAP.normal;

  return (
    <div className="ending-detail">
      <div className="ed-header">
        <button className="back-btn" onClick={() => navigate('/character-profiles')}>← 返回侧写馆</button>
        <div className="ed-actions">
          <button className="edit-btn" onClick={() => navigate(`/character-profiles/endings/${id}/edit`)}>✎ 编辑</button>
          <button className="delete-btn" onClick={handleDelete}>🗑 删除</button>
        </div>
      </div>

      <div className={`ed-banner ${ending.isUnlocked ? 'unlocked' : 'locked'}`}>
        <div className="banner-type" style={{ background: typeInfo.color }}>
          {typeInfo.icon} {typeInfo.name}
        </div>
        <div className="banner-icon">
          {ending.isUnlocked ? '🔓' : '🔒'}
        </div>
        <h1 className="banner-name">{ending.name}</h1>
        <p className="banner-desc">{ending.description || '暂无描述'}</p>

        <div className="banner-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.round(ending.unlockProgress * 100)}%`, background: typeInfo.color }} />
          </div>
          <span className="progress-text">
            {ending.isUnlocked ? '✓ 已解锁' : `${Math.round(ending.unlockProgress * 100)}% 解锁进度`}
          </span>
        </div>
      </div>

      {ending.epilogue && (
        <div className="ed-epilogue">
          <h3 className="epilogue-title">尾声</h3>
          <p className="epilogue-text">{ending.epilogue}</p>
        </div>
      )}

      <div className="ed-conditions">
        <h3 className="conditions-title">解锁条件</h3>
        {(ending.conditionDetails || []).length === 0 ? (
          <div className="no-conditions">
            <span>🔓 无条件限制，自动解锁</span>
          </div>
        ) : (
          <div className="conditions-list">
            {(ending.conditionDetails || []).map((cond, idx) => (
              <div key={idx} className={`condition-item ${cond.met ? 'met' : 'unmet'}`}>
                <div className="cond-status">
                  {cond.met ? '✓' : '○'}
                </div>
                <div className="cond-info">
                  <span className="cond-type">
                    {cond.type === 'decision' && '⚖️ 抉择条件'}
                    {cond.type === 'relationship' && '🤝 关系条件'}
                    {cond.type === 'status' && '📊 状态条件'}
                    {cond.type === 'growth' && '🌱 成长条件'}
                  </span>
                  <span className="cond-detail">
                    {cond.type === 'decision' && `${cond.characterName || '?'} 在「${cond.decisionTitle || '?'}」中选择「${cond.requiredOption || '?'}」`}
                    {cond.type === 'relationship' && `${cond.characterName || '?'} 与 ${cond.targetName || '?'} 的关系为「${cond.requiredType || '?'}」`}
                    {cond.type === 'status' && `${cond.characterName || '?'} 状态为「${cond.requiredStatus || '?'}」`}
                    {cond.type === 'growth' && `${cond.characterName || '?'} 经历「${cond.growthTitle || '?'}」`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EndingDetail;
