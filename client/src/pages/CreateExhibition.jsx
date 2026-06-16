import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exhibitionApi, fileApi } from '../services/api.js';
import ThemeConfigurator from '../components/ThemeConfigurator.jsx';
import './CreateExhibition.scss';

function CreateExhibition() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    theme: 'warm',
    memorialDate: ''
  });
  const [themeConfig, setThemeConfig] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleThemeConfigChange = (newConfig) => {
    setThemeConfig(newConfig);
    setForm(prev => ({ ...prev, theme: newConfig.theme }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('请输入展厅名称');
      return;
    }
    setSubmitting(true);
    try {
      let coverImage = '';
      if (coverFile) {
        const res = await fileApi.upload([coverFile]);
        if (res.files && res.files.length > 0) {
          coverImage = res.files[0].url;
        }
      }
      const exhibition = await exhibitionApi.create({
        ...form,
        coverImage,
        themeConfig
      });
      navigate(`/exhibition/${exhibition.id}`);
    } catch (err) {
      console.error('创建失败:', err);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-exhibition">
      <div className="page-header">
        <h1 className="page-title">
          <span className="title-icon">✦</span>
          创建纪念馆
        </h1>
        <p className="page-desc">为那些珍贵的时光，打造一个专属的空间</p>
      </div>

      <form className="create-form" onSubmit={handleSubmit}>
        <div className="form-section cover-section">
          <div className="section-label">封面图片</div>
          <div className="cover-uploader">
            {coverPreview ? (
              <div className="cover-preview">
                <img src={coverPreview} alt="封面预览" />
                <button
                  type="button"
                  className="cover-remove"
                  onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                >
                  更换
                </button>
              </div>
            ) : (
              <label className="cover-placeholder">
                <input type="file" accept="image/*" onChange={handleCoverChange} hidden />
                <span className="upload-icon">+</span>
                <span className="upload-text">点击上传封面</span>
                <span className="upload-hint">支持 JPG / PNG / GIF</span>
              </label>
            )}
          </div>
        </div>

        <div className="form-section">
          <label className="field-label">展厅名称 *</label>
          <input
            type="text"
            className="field-input"
            placeholder="给这个展厅起个名字..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={50}
          />
        </div>

        <div className="form-section">
          <label className="field-label">展厅简介</label>
          <textarea
            className="field-textarea"
            placeholder="描述这个展厅所纪念的人或事..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={500}
          />
        </div>

        <div className="form-section">
          <label className="field-label">纪念日 <span className="field-optional">（可选，如忌日、生日等重要日期）</span></label>
          <input
            type="date"
            className="field-input"
            value={form.memorialDate}
            onChange={(e) => setForm({ ...form, memorialDate: e.target.value })}
          />
          <p className="field-hint">设置后将在此日期临近时自动提醒，方便回访追思</p>
        </div>

        <div className="form-section">
          <label className="field-label">主题配置</label>
          <ThemeConfigurator value={themeConfig} onChange={handleThemeConfigChange} />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '创建中...' : '创建展厅'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateExhibition;
