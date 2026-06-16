import React from 'react';
import { formatTime } from '../services/playbackProgress.js';
import './ResumePrompt.scss';

function ResumePrompt({ items, onResume, onDismiss }) {
  if (!items || items.length === 0) return null;

  const mainItem = items[0];
  const extraCount = items.length - 1;

  return (
    <div className="resume-prompt">
      <div className="resume-prompt-icon">⏱</div>
      <div className="resume-prompt-info">
        <span className="resume-prompt-text">
          上次播放到 {formatTime(mainItem.currentTime)}
          {mainItem.title && <span className="resume-prompt-title">「{mainItem.title}」</span>}
          {extraCount > 0 && <span className="resume-prompt-extra">，另有 {extraCount} 个媒体有记录</span>}
        </span>
      </div>
      <button className="resume-prompt-btn resume" onClick={onResume}>
        继续播放
      </button>
      <button className="resume-prompt-btn dismiss" onClick={onDismiss}>
        从头开始
      </button>
    </div>
  );
}

export default ResumePrompt;
