import React, { useState, useEffect } from 'react';
import { timeSlotApi, appointmentApi, exhibitionApi } from '../services/api.js';
import './AppointmentForm.scss';

function AppointmentForm({ exhibitionId: initialExhibitionId, onSuccess }) {
  const [exhibitions, setExhibitions] = useState([]);
  const [formData, setFormData] = useState({
    exhibitionId: initialExhibitionId || '',
    visitorName: '',
    visitorPhone: '',
    visitorEmail: '',
    appointmentDate: '',
    timeSlotId: '',
    numberOfPeople: 1,
    purpose: '',
    message: '',
    relation: ''
  });
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    if (formData.exhibitionId && formData.appointmentDate) {
      loadTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [formData.exhibitionId, formData.appointmentDate]);

  const loadExhibitions = async () => {
    try {
      const data = await exhibitionApi.list();
      setExhibitions(data);
    } catch (err) {
      console.error('加载展厅列表失败:', err);
    }
  };

  const loadTimeSlots = async () => {
    setLoading(true);
    try {
      const data = await timeSlotApi.list({
        exhibitionId: formData.exhibitionId,
        date: formData.appointmentDate,
        isActive: true
      });
      setTimeSlots(data);
    } catch (err) {
      console.error('加载时段失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, timeSlotId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.exhibitionId) throw new Error('请选择展厅');
      if (!formData.visitorName.trim()) throw new Error('请填写姓名');
      if (!formData.visitorPhone.trim()) throw new Error('请填写手机号');
      if (!formData.appointmentDate) throw new Error('请选择日期');
      if (!formData.timeSlotId) throw new Error('请选择时段');

      const result = await appointmentApi.create({
        ...formData,
        numberOfPeople: parseInt(formData.numberOfPeople, 10)
      });

      setSuccess(true);
      if (onSuccess) onSuccess(result);

      setTimeout(() => {
        setFormData({
          exhibitionId: initialExhibitionId || '',
          visitorName: '',
          visitorPhone: '',
          visitorEmail: '',
          appointmentDate: '',
          timeSlotId: '',
          numberOfPeople: 1,
          purpose: '',
          message: '',
          relation: ''
        });
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="appointment-form-wrap">
      {success ? (
        <div className="success-panel">
          <div className="success-icon">✦</div>
          <h3>预约申请已提交</h3>
          <p>我们已收到您的预约请求，请保持手机畅通，稍后将有确认信息发送给您。</p>
        </div>
      ) : (
        <form className="appointment-form" onSubmit={handleSubmit}>
          <div className="form-title">
            <span className="title-icon">✿</span>
            <h2>追思预约</h2>
            <p className="form-desc">请填写以下信息完成预约，愿您在追思中找到心灵的慰藉</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            {!initialExhibitionId && (
              <div className="form-item full">
                <label>选择展厅 <span className="required">*</span></label>
                <select
                  name="exhibitionId"
                  value={formData.exhibitionId}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">请选择展厅</option>
                  {exhibitions.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-item">
              <label>访客姓名 <span className="required">*</span></label>
              <input
                type="text"
                name="visitorName"
                value={formData.visitorName}
                onChange={handleChange}
                placeholder="请输入您的姓名"
                className="form-input"
              />
            </div>

            <div className="form-item">
              <label>联系电话 <span className="required">*</span></label>
              <input
                type="tel"
                name="visitorPhone"
                value={formData.visitorPhone}
                onChange={handleChange}
                placeholder="请输入手机号"
                className="form-input"
              />
            </div>

            <div className="form-item">
              <label>电子邮箱</label>
              <input
                type="email"
                name="visitorEmail"
                value={formData.visitorEmail}
                onChange={handleChange}
                placeholder="可选"
                className="form-input"
              />
            </div>

            <div className="form-item">
              <label>与逝者关系</label>
              <select
                name="relation"
                value={formData.relation}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">请选择</option>
                <option value="亲属">亲属</option>
                <option value="朋友">朋友</option>
                <option value="同事">同事</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="form-item">
              <label>预约日期 <span className="required">*</span></label>
              <input
                type="date"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                min={today}
                className="form-input"
              />
            </div>

            <div className="form-item">
              <label>同行人数</label>
              <select
                name="numberOfPeople"
                value={formData.numberOfPeople}
                onChange={handleChange}
                className="form-input"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} 人</option>
                ))}
              </select>
            </div>

            <div className="form-item full">
              <label>选择时段 <span className="required">*</span></label>
              {loading ? (
                <div className="slots-loading">加载时段中...</div>
              ) : timeSlots.length === 0 ? (
                <div className="slots-empty">
                  {formData.exhibitionId && formData.appointmentDate
                    ? '该日期暂无可预约时段，请选择其他日期'
                    : '请先选择展厅和日期'}
                </div>
              ) : (
                <div className="time-slots">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      className={`slot-item ${formData.timeSlotId === slot.id ? 'selected' : ''} ${slot.availableCount === 0 ? 'disabled' : ''}`}
                      onClick={() => slot.availableCount > 0 && setFormData(prev => ({ ...prev, timeSlotId: slot.id }))}
                      disabled={slot.availableCount === 0}
                    >
                      <span className="slot-time">{slot.startTime} - {slot.endTime}</span>
                      <span className="slot-capacity">
                        {slot.availableCount > 0 ? `剩余 ${slot.availableCount} 位` : '已满'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-item full">
              <label>追思目的</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">请选择</option>
                <option value="忌日追思">忌日追思</option>
                <option value="生日纪念">生日纪念</option>
                <option value="节日祭扫">节日祭扫</option>
                <option value="日常探望">日常探望</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="form-item full">
              <label>寄语留言</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="写下您想对TA说的话，或特别的追思需求..."
                rows={4}
                className="form-textarea"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? '提交中...' : '✦ 提交预约'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AppointmentForm;
