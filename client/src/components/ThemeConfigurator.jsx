import React, { useState, useEffect } from 'react';
import { fileApi } from '../services/api.js';
import './ThemeConfigurator.scss';

const THEME_PRESETS = [
  {
    value: 'warm',
    name: '暖阳',
    desc: '金色温暖的回忆色调',
    colors: { primary: '#ffd700', secondary: '#f4a460', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #f4a460, #ffd700)'
  },
  {
    value: 'ocean',
    name: '深海',
    desc: '静谧深蓝的思念之感',
    colors: { primary: '#87ceeb', secondary: '#4682b4', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #4682b4, #87ceeb)'
  },
  {
    value: 'forest',
    name: '林间',
    desc: '清新自然的绿意时光',
    colors: { primary: '#98fb98', secondary: '#2e8b57', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #2e8b57, #98fb98)'
  },
  {
    value: 'sunset',
    name: '黄昏',
    desc: '橙紫渐变的温柔暮色',
    colors: { primary: '#ff6b6b', secondary: '#9370db', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #ff6b6b, #9370db)'
  },
  {
    value: 'night',
    name: '星夜',
    desc: '深邃梦幻的星空之境',
    colors: { primary: '#9370db', secondary: '#4b0082', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #191970, #4b0082)'
  },
  {
    value: 'sakura',
    name: '樱花',
    desc: '粉色浪漫的柔美容颜',
    colors: { primary: '#ffb6c1', secondary: '#ffc0cb', text: '#f0f0ff', background: '' },
    gradient: 'linear-gradient(135deg, #ffb6c1, #ffc0cb)'
  }
];

const FONT_OPTIONS = [
  { value: 'default', name: '默认', family: "'Noto Sans SC', sans-serif" },
  { value: 'serif', name: '宋体', family: "'Noto Serif SC', 'SimSun', serif" },
  { value: 'kai', name: '楷体', family: "'KaiTi', 'STKaiti', serif" },
  { value: 'fang', name: '仿宋', family: "'FangSong', 'STFangsong', serif" }
];

const DECORATION_OPTIONS = [
  { value: 'none', name: '无装饰', icon: '○' },
  { value: 'stars', name: '星光', icon: '✦' },
  { value: 'petals', name: '花瓣', icon: '❀' },
  { value: 'bubbles', name: '气泡', icon: '◎' }
];

function ThemeConfigurator({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('preset');
  const [bgUploading, setBgUploading] = useState(false);

  const config = value || {
    theme: 'warm',
    backgroundImage: '',
    colors: { primary: '', secondary: '', text: '', background: '' },
    font: 'default',
    decoration: 'none'
  };

  const updateConfig = (updates) => {
    const newConfig = { ...config, ...updates };
    onChange(newConfig);
  };

  const updateColors = (colorUpdates) => {
    updateConfig({ colors: { ...config.colors, ...colorUpdates } });
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const res = await fileApi.upload([file]);
      if (res.files && res.files.length > 0) {
        updateConfig({ backgroundImage: res.files[0].url });
      }
    } catch (err) {
      console.error('背景图上传失败:', err);
    } finally {
      setBgUploading(false);
    }
  };

  const applyPreset = (preset) => {
    updateConfig({
      theme: preset.value,
      colors: { ...preset.colors }
    });
  };

  const tabs = [
    { key: 'preset', name: '主题预设', icon: '✦' },
    { key: 'background', name: '背景图', icon: '🖼' },
    { key: 'colors', name: '配色', icon: '🎨' },
    { key: 'font', name: '字体', icon: 'A' },
    { key: 'decoration', name: '装饰', icon: '✿' }
  ];

  return (
    <div className="theme-configurator">
      <div className="tc-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tc-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tc-tab-icon">{tab.icon}</span>
            <span className="tc-tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="tc-content">
        {activeTab === 'preset' && (
          <div className="tc-presets">
            <div className="tc-section-hint">选择预设主题，快速应用整体风格</div>
            <div className="tc-preset-grid">
              {THEME_PRESETS.map(preset => (
                <div
                  key={preset.value}
                  className={`tc-preset-card ${config.theme === preset.value ? 'active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <div className="tc-preset-preview" style={{ background: preset.gradient }}></div>
                  <div className="tc-preset-info">
                    <div className="tc-preset-name">{preset.name}</div>
                    <div className="tc-preset-desc">{preset.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="tc-background">
            <div className="tc-section-hint">上传自定义背景图，覆盖主题默认背景</div>
            <div className="tc-bg-uploader">
              {config.backgroundImage ? (
                <div className="tc-bg-preview">
                  <img src={config.backgroundImage} alt="背景预览" />
                  <div className="tc-bg-overlay">
                    <button
                      className="tc-bg-remove"
                      onClick={() => updateConfig({ backgroundImage: '' })}
                    >
                      移除背景
                    </button>
                  </div>
                </div>
              ) : (
                <label className="tc-bg-placeholder">
                  <input type="file" accept="image/*" onChange={handleBgUpload} hidden disabled={bgUploading} />
                  <span className="tc-upload-icon">+</span>
                  <span className="tc-upload-text">{bgUploading ? '上传中...' : '点击上传背景图'}</span>
                  <span className="tc-upload-hint">建议 1920x1080 及以上分辨率</span>
                </label>
              )}
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="tc-colors">
            <div className="tc-section-hint">自定义配色方案，覆盖预设主题色</div>
            <div className="tc-color-row">
              <label className="tc-color-field">
                <span className="tc-color-label">主色调</span>
                <div className="tc-color-input-wrap">
                  <input
                    type="color"
                    value={config.colors.primary || '#ffd700'}
                    onChange={(e) => updateColors({ primary: e.target.value })}
                  />
                  <span className="tc-color-value">{config.colors.primary || '跟随主题'}</span>
                </div>
              </label>
              <label className="tc-color-field">
                <span className="tc-color-label">辅助色</span>
                <div className="tc-color-input-wrap">
                  <input
                    type="color"
                    value={config.colors.secondary || '#f4a460'}
                    onChange={(e) => updateColors({ secondary: e.target.value })}
                  />
                  <span className="tc-color-value">{config.colors.secondary || '跟随主题'}</span>
                </div>
              </label>
            </div>
            <div className="tc-color-row">
              <label className="tc-color-field">
                <span className="tc-color-label">文字颜色</span>
                <div className="tc-color-input-wrap">
                  <input
                    type="color"
                    value={config.colors.text || '#f0f0ff'}
                    onChange={(e) => updateColors({ text: e.target.value })}
                  />
                  <span className="tc-color-value">{config.colors.text || '跟随主题'}</span>
                </div>
              </label>
              <label className="tc-color-field">
                <span className="tc-color-label">背景色</span>
                <div className="tc-color-input-wrap">
                  <input
                    type="color"
                    value={config.colors.background || '#0a0a1a'}
                    onChange={(e) => updateColors({ background: e.target.value })}
                  />
                  <span className="tc-color-value">{config.colors.background || '跟随主题'}</span>
                </div>
              </label>
            </div>
            <button
              className="tc-color-reset"
              onClick={() => {
                const preset = THEME_PRESETS.find(p => p.value === config.theme);
                if (preset) updateColors(preset.colors);
              }}
            >
              重置为预设配色
            </button>
          </div>
        )}

        {activeTab === 'font' && (
          <div className="tc-fonts">
            <div className="tc-section-hint">选择展厅文字字体风格</div>
            <div className="tc-font-list">
              {FONT_OPTIONS.map(font => (
                <div
                  key={font.value}
                  className={`tc-font-card ${config.font === font.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ font: font.value })}
                >
                  <span className="tc-font-preview" style={{ fontFamily: font.family }}>
                    永远怀念
                  </span>
                  <span className="tc-font-name">{font.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'decoration' && (
          <div className="tc-decorations">
            <div className="tc-section-hint">选择页面装饰效果，增添情感氛围</div>
            <div className="tc-deco-list">
              {DECORATION_OPTIONS.map(deco => (
                <div
                  key={deco.value}
                  className={`tc-deco-card ${config.decoration === deco.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ decoration: deco.value })}
                >
                  <span className="tc-deco-icon">{deco.icon}</span>
                  <span className="tc-deco-name">{deco.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const applyThemeConfig = (themeConfig, theme) => {
  const preset = THEME_PRESETS.find(p => p.value === theme) || THEME_PRESETS[0];
  const cfg = themeConfig || {};
  const colors = cfg.colors || {};

  const primary = colors.primary || preset.colors.primary;
  const secondary = colors.secondary || preset.colors.secondary;
  const text = colors.text || preset.colors.text;
  const background = colors.background;

  const style = {};
  if (primary) style['--theme-primary'] = primary;
  if (secondary) style['--theme-secondary'] = secondary;
  if (text) style['--theme-text'] = text;
  if (background) style['--theme-bg'] = background;
  if (cfg.backgroundImage) style['--theme-bg-image'] = `url(${cfg.backgroundImage})`;

  const fontOption = FONT_OPTIONS.find(f => f.value === (cfg.font || 'default'));
  if (fontOption) style['--theme-font'] = fontOption.family;

  return style;
};

export const getDecorationClass = (themeConfig) => {
  const deco = themeConfig?.decoration || 'none';
  return deco !== 'none' ? `deco-${deco}` : '';
};

export { THEME_PRESETS, FONT_OPTIONS, DECORATION_OPTIONS };
export default ThemeConfigurator;
