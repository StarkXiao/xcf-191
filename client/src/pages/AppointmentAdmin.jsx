import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  appointmentApi,
  timeSlotApi,
  reminderTemplateApi,
  visitRecordApi,
  exhibitionApi
} from '../services/api.js';
import './AppointmentAdmin.scss';

const STATUS_MAP = {
  pending: { label: '待确认', color: '#ffd700' },
  confirmed: { label: '已确认', color: '#87ceeb' },
  completed: { label: '已完成', color: '#98fb98' },
  cancelled: { label: '已取消', color: '#ff8080' },
  no_show: { label: '未到访', color: '#dda0dd' }
};

function AppointmentAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [exhibitions, setExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState('');
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [apptStats, setApptStats] = useState(null);
  const [apptFilters, setApptFilters] = useState({ status: '', date: '' });

  const [timeSlots, setTimeSlots] = useState([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: '', startTime: '09:00', endTime: '10:00', maxCapacity: 10, note: ''
  });
  const [batchForm, setBatchForm] = useState({
    startDate: '', endDate: '', maxCapacity: 10,
    timeRanges: [{ startTime: '09:00', endTime: '10:00' }],
    weekdays: [1, 2, 3, 4, 5, 6, 0]
  });

  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ type: 'confirm', name: '', content: '', enabled: true });
  const [previewText, setPreviewText] = useState('');

  const [visitRecords, setVisitRecords] = useState([]);
  const [visitStats, setVisitStats] = useState(null);
  const [checkInForm, setCheckInForm] = useState({ appointmentId: '', visitorPhone: '' });
  const [quickEntryForm, setQuickEntryForm] = useState({ visitorName: '', visitorPhone: '', numberOfPeople: 1 });
  const [checkInResult, setCheckInResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    loadExhibitions();
  }, []);

  useEffect(() => {
    if (activeTab === 'appointments') loadAppointments();
    if (activeTab === 'timeslots') loadTimeSlots();
    if (activeTab === 'templates') loadTemplates();
    if (activeTab === 'entry') loadVisitRecords();
  }, [activeTab, selectedExhibition]);

  const loadExhibitions = async () => {
    try {
      const data = await exhibitionApi.list();
      setExhibitions(data);
      if (data.length > 0) setSelectedExhibition(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAppointments = async () => {
    if (!selectedExhibition) return;
    setLoading(true);
    try {
      const params = { exhibitionId: selectedExhibition, ...apptFilters };
      const [list, stats] = await Promise.all([
        appointmentApi.list(params),
        appointmentApi.getStats({ exhibitionId: selectedExhibition })
      ]);
      setAppointments(list);
      setApptStats(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedExhibition) return;
    setLoading(true);
    try {
      const data = await timeSlotApi.list({ exhibitionId: selectedExhibition });
      setTimeSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await reminderTemplateApi.list();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadVisitRecords = async () => {
    if (!selectedExhibition) return;
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        visitRecordApi.list({ exhibitionId: selectedExhibition }),
        visitRecordApi.getStats({ exhibitionId: selectedExhibition })
      ]);
      setVisitRecords(list);
      setVisitStats(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApptAction = async (id, action) => {
    try {
      await appointmentApi[action](id);
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await timeSlotApi.create({ ...slotForm, exhibitionId: selectedExhibition });
      setShowSlotModal(false);
      setSlotForm({ date: '', startTime: '09:00', endTime: '10:00', maxCapacity: 10, note: '' });
      loadTimeSlots();
    } catch (err) {
      alert(err.response?.data?.error || '创建失败');
    }
  };

  const handleBatchCreate = async (e) => {
    e.preventDefault();
    try {
      await timeSlotApi.createBatch({ ...batchForm, exhibitionId: selectedExhibition });
      setShowBatchModal(false);
      loadTimeSlots();
    } catch (err) {
      alert(err.response?.data?.error || '批量创建失败');
    }
  };

  const handleToggleSlot = async (id) => {
    try {
      await timeSlotApi.toggle(id);
      loadTimeSlots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('确定删除该时段？')) return;
    try {
      await timeSlotApi.remove(id);
      loadTimeSlots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (templateForm.id) {
        await reminderTemplateApi.update(templateForm.id, templateForm);
      } else {
        await reminderTemplateApi.create(templateForm);
      }
      setShowTemplateModal(false);
      setTemplateForm({ type: 'confirm', name: '', content: '', enabled: true });
      loadTemplates();
    } catch (err) {
      alert(err.response?.data?.error || '保存失败');
    }
  };

  const handlePreview = async () => {
    try {
      const res = await reminderTemplateApi.preview(templateForm.content, {
        visitorName: '张三',
        exhibitionTitle: '示例展厅',
        appointmentDate: '2024-01-15',
        timeSlot: '09:00-10:00'
      });
      setPreviewText(res.preview);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTemplate = async (id) => {
    try {
      await reminderTemplateApi.toggle(id);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('确定删除该模板？')) return;
    try {
      await reminderTemplateApi.remove(id);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async () => {
    try {
      const res = await visitRecordApi.verify({
        ...checkInForm,
        exhibitionId: selectedExhibition
      });
      setVerifyResult(res);
    } catch (err) {
      alert(err.response?.data?.error || '验证失败');
    }
  };

  const handleCheckIn = async () => {
    try {
      const res = await visitRecordApi.checkIn({
        ...checkInForm,
        exhibitionId: selectedExhibition
      });
      setCheckInResult(res);
      setCheckInForm({ appointmentId: '', visitorPhone: '' });
      setVerifyResult(null);
      loadVisitRecords();
      setTimeout(() => setCheckInResult(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || '签到失败');
    }
  };

  const handleQuickEntry = async (e) => {
    e.preventDefault();
    try {
      const res = await visitRecordApi.quickEntry({
        ...quickEntryForm,
        exhibitionId: selectedExhibition
      });
      setCheckInResult(res);
      setQuickEntryForm({ visitorName: '', visitorPhone: '', numberOfPeople: 1 });
      loadVisitRecords();
      setTimeout(() => setCheckInResult(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || '登记失败');
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await visitRecordApi.checkOut({ id });
      loadVisitRecords();
    } catch (err) {
      alert(err.response?.data?.error || '签退失败');
    }
  };

  const tabs = [
    { key: 'appointments', name: '预约记录', icon: '📋' },
    { key: 'timeslots', name: '时段管理', icon: '⏰' },
    { key: 'templates', name: '提醒文案', icon: '✉️' },
    { key: 'entry', name: '展厅入口', icon: '🚪' }
  ];

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="appointment-admin">
      <div className="admin-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span>←</span> 返回首页
        </button>
        <div className="header-content">
          <h1>访客预约管理</h1>
          <div className="exhibition-selector">
            <label>选择展厅：</label>
            <select
              value={selectedExhibition}
              onChange={(e) => setSelectedExhibition(e.target.value)}
              className="form-input"
            >
              {exhibitions.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'appointments' && (
          <div className="appointments-section">
            {apptStats && (
              <div className="stats-grid">
                <div className="stat-card"><span className="stat-label">总预约</span><span className="stat-value">{apptStats.total}</span></div>
                <div className="stat-card warning"><span className="stat-label">待确认</span><span className="stat-value">{apptStats.pending}</span></div>
                <div className="stat-card info"><span className="stat-label">已确认</span><span className="stat-value">{apptStats.confirmed}</span></div>
                <div className="stat-card success"><span className="stat-label">已完成</span><span className="stat-value">{apptStats.completed}</span></div>
                <div className="stat-card danger"><span className="stat-label">已取消</span><span className="stat-value">{apptStats.cancelled}</span></div>
                <div className="stat-card purple"><span className="stat-label">访客总数</span><span className="stat-value">{apptStats.totalVisitors}</span></div>
              </div>
            )}

            <div className="filter-bar">
              <select
                value={apptFilters.status}
                onChange={(e) => setApptFilters(f => ({ ...f, status: e.target.value }))}
                className="form-input"
              >
                <option value="">全部状态</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={apptFilters.date}
                onChange={(e) => setApptFilters(f => ({ ...f, date: e.target.value }))}
                className="form-input"
              />
              <button className="btn-primary" onClick={loadAppointments}>筛选</button>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>访客姓名</th>
                    <th>联系电话</th>
                    <th>预约日期</th>
                    <th>时段</th>
                    <th>人数</th>
                    <th>关系/目的</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="loading-cell">加载中...</td></tr>
                  ) : appointments.length === 0 ? (
                    <tr><td colSpan="8" className="empty-cell">暂无预约记录</td></tr>
                  ) : appointments.map(apt => (
                    <tr key={apt.id}>
                      <td>{apt.visitorName}</td>
                      <td>{apt.visitorPhone}</td>
                      <td>{apt.appointmentDate}</td>
                      <td>{apt.timeSlotLabel}</td>
                      <td>{apt.numberOfPeople}</td>
                      <td>
                        {apt.relation && <span className="tag">{apt.relation}</span>}
                        {apt.purpose && <span className="tag tag-alt">{apt.purpose}</span>}
                      </td>
                      <td>
                        <span className="status-badge" style={{ background: STATUS_MAP[apt.status]?.color + '33', color: STATUS_MAP[apt.status]?.color }}>
                          {STATUS_MAP[apt.status]?.label}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {apt.status === 'pending' && (
                          <>
                            <button className="btn-link" onClick={() => handleApptAction(apt.id, 'confirm')}>确认</button>
                            <button className="btn-link danger" onClick={() => handleApptAction(apt.id, 'cancel')}>取消</button>
                          </>
                        )}
                        {apt.status === 'confirmed' && (
                          <>
                            <button className="btn-link" onClick={() => handleApptAction(apt.id, 'complete')}>完成</button>
                            <button className="btn-link danger" onClick={() => handleApptAction(apt.id, 'noShow')}>未到</button>
                          </>
                        )}
                        <button className="btn-link danger" onClick={() => {
                          if (confirm('确定删除？')) handleApptAction(apt.id, 'remove');
                        }}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'timeslots' && (
          <div className="timeslots-section">
            <div className="section-actions">
              <button className="btn-primary" onClick={() => setShowSlotModal(true)}>+ 单个添加</button>
              <button className="btn-secondary" onClick={() => setShowBatchModal(true)}>+ 批量生成</button>
              <button className="btn-danger" onClick={async () => {
                if (confirm('确定清理所有过期时段？')) {
                  await timeSlotApi.cleanupExpired();
                  loadTimeSlots();
                }
              }}>清理过期</button>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>时段</th>
                    <th>最大容量</th>
                    <th>已预约</th>
                    <th>剩余</th>
                    <th>状态</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="loading-cell">加载中...</td></tr>
                  ) : timeSlots.length === 0 ? (
                    <tr><td colSpan="8" className="empty-cell">暂无时段，请先添加</td></tr>
                  ) : timeSlots.map(slot => (
                    <tr key={slot.id}>
                      <td>{slot.date}</td>
                      <td>{slot.startTime} - {slot.endTime}</td>
                      <td>{slot.maxCapacity}</td>
                      <td>{slot.bookedCount}</td>
                      <td className={slot.availableCount === 0 ? 'text-danger' : 'text-success'}>{slot.availableCount}</td>
                      <td>
                        <span className={`status-badge ${slot.isActive ? 'active' : 'inactive'}`}>
                          {slot.isActive ? '开放' : '关闭'}
                        </span>
                      </td>
                      <td>{slot.note || '-'}</td>
                      <td className="actions-cell">
                        <button className="btn-link" onClick={() => handleToggleSlot(slot.id)}>
                          {slot.isActive ? '关闭' : '开启'}
                        </button>
                        <button className="btn-link danger" onClick={() => handleDeleteSlot(slot.id)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="templates-section">
            <div className="section-actions">
              <button className="btn-primary" onClick={() => {
                setTemplateForm({ type: 'confirm', name: '', content: '', enabled: true });
                setPreviewText('');
                setShowTemplateModal(true);
              }}>+ 新建模板</button>
            </div>

            <div className="templates-grid">
              {templates.map(tpl => (
                <div key={tpl.id} className={`template-card ${!tpl.enabled ? 'disabled' : ''}`}>
                  <div className="template-header">
                    <div>
                      <h4>{tpl.name}</h4>
                      <span className="tag tag-alt">{tpl.type}</span>
                    </div>
                    <div className="template-actions">
                      <button className="btn-link" onClick={() => {
                        setTemplateForm(tpl);
                        setPreviewText('');
                        setShowTemplateModal(true);
                      }}>编辑</button>
                      <button className="btn-link" onClick={() => handleToggleTemplate(tpl.id)}>
                        {tpl.enabled ? '停用' : '启用'}
                      </button>
                      <button className="btn-link danger" onClick={() => handleDeleteTemplate(tpl.id)}>删除</button>
                    </div>
                  </div>
                  <p className="template-content">{tpl.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="entry-section">
            {visitStats && (
              <div className="stats-grid">
                <div className="stat-card"><span className="stat-label">总签到</span><span className="stat-value">{visitStats.totalCheckIns}</span></div>
                <div className="stat-card info"><span className="stat-label">在场中</span><span className="stat-value">{visitStats.inVisit}</span></div>
                <div className="stat-card success"><span className="stat-label">访客总数</span><span className="stat-value">{visitStats.totalVisitors}</span></div>
                <div className="stat-card purple"><span className="stat-label">平均时长</span><span className="stat-value">{visitStats.avgDurationMinutes}分钟</span></div>
              </div>
            )}

            {checkInResult && (
              <div className="checkin-welcome">
                <div className="welcome-icon">✦</div>
                <h3>欢迎 {checkInResult.visitorName}</h3>
                {checkInResult.welcomeMessage && <p>{checkInResult.welcomeMessage}</p>}
              </div>
            )}

            <div className="entry-panels">
              <div className="entry-panel">
                <h3>📱 预约签到</h3>
                <div className="form-group">
                  <label>预约ID（可选）</label>
                  <input
                    type="text"
                    value={checkInForm.appointmentId}
                    onChange={(e) => setCheckInForm(f => ({ ...f, appointmentId: e.target.value }))}
                    placeholder="输入预约ID"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>手机号{!checkInForm.appointmentId && ' *'}</label>
                  <input
                    type="tel"
                    value={checkInForm.visitorPhone}
                    onChange={(e) => setCheckInForm(f => ({ ...f, visitorPhone: e.target.value }))}
                    placeholder="输入手机号查找今日预约"
                    className="form-input"
                  />
                </div>
                <div className="panel-actions">
                  <button className="btn-secondary" onClick={handleVerify}>验证预约</button>
                  <button className="btn-primary" onClick={handleCheckIn}>确认签到</button>
                </div>
                {verifyResult && (
                  <div className={`verify-result ${verifyResult.canCheckIn ? 'success' : 'error'}`}>
                    {verifyResult.message}
                    {verifyResult.appointment && (
                      <div className="verify-info">
                        <p>访客：{verifyResult.appointment.visitorName}</p>
                        <p>时段：{verifyResult.appointment.appointmentDate} {verifyResult.appointment.timeSlotLabel}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="entry-panel">
                <h3>🚶 现场快速登记</h3>
                <form onSubmit={handleQuickEntry}>
                  <div className="form-group">
                    <label>访客姓名 *</label>
                    <input
                      type="text"
                      value={quickEntryForm.visitorName}
                      onChange={(e) => setQuickEntryForm(f => ({ ...f, visitorName: e.target.value }))}
                      placeholder="请输入姓名"
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>手机号</label>
                    <input
                      type="tel"
                      value={quickEntryForm.visitorPhone}
                      onChange={(e) => setQuickEntryForm(f => ({ ...f, visitorPhone: e.target.value }))}
                      placeholder="可选"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>人数</label>
                    <select
                      value={quickEntryForm.numberOfPeople}
                      onChange={(e) => setQuickEntryForm(f => ({ ...f, numberOfPeople: parseInt(e.target.value, 10) }))}
                      className="form-input"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} 人</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary full">快速登记入场</button>
                </form>
              </div>
            </div>

            <div className="data-table" style={{ marginTop: 24 }}>
              <h3>今日访问记录</h3>
              <table>
                <thead>
                  <tr>
                    <th>访客姓名</th>
                    <th>联系电话</th>
                    <th>人数</th>
                    <th>签到时间</th>
                    <th>签退时间</th>
                    <th>时长</th>
                    <th>类型</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="loading-cell">加载中...</td></tr>
                  ) : visitRecords.length === 0 ? (
                    <tr><td colSpan="8" className="empty-cell">暂无访问记录</td></tr>
                  ) : visitRecords.map(record => (
                    <tr key={record.id}>
                      <td>{record.visitorName}</td>
                      <td>{record.visitorPhone || '-'}</td>
                      <td>{record.numberOfPeople}</td>
                      <td>{new Date(record.checkInTime).toLocaleString('zh-CN')}</td>
                      <td>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleString('zh-CN') : '-'}</td>
                      <td>{record.durationMinutes ? `${record.durationMinutes}分钟` : '-'}</td>
                      <td>
                        <span className={`tag ${record.isQuickEntry ? 'tag-alt' : ''}`}>
                          {record.isQuickEntry ? '现场' : '预约'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {!record.checkOutTime && (
                          <button className="btn-link" onClick={() => handleCheckOut(record.id)}>签退</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showSlotModal && (
        <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>添加时段</h3>
            <form onSubmit={handleCreateSlot}>
              <div className="form-group">
                <label>日期 *</label>
                <input type="date" value={slotForm.date} min={today}
                  onChange={(e) => setSlotForm(f => ({ ...f, date: e.target.value }))} required
                  className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>开始时间 *</label>
                  <input type="time" value={slotForm.startTime}
                    onChange={(e) => setSlotForm(f => ({ ...f, startTime: e.target.value }))} required
                    className="form-input" />
                </div>
                <div className="form-group">
                  <label>结束时间 *</label>
                  <input type="time" value={slotForm.endTime}
                    onChange={(e) => setSlotForm(f => ({ ...f, endTime: e.target.value }))} required
                    className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>最大容量 *</label>
                <input type="number" min="1" value={slotForm.maxCapacity}
                  onChange={(e) => setSlotForm(f => ({ ...f, maxCapacity: parseInt(e.target.value, 10) }))} required
                  className="form-input" />
              </div>
              <div className="form-group">
                <label>备注</label>
                <input type="text" value={slotForm.note}
                  onChange={(e) => setSlotForm(f => ({ ...f, note: e.target.value }))}
                  className="form-input" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSlotModal(false)}>取消</button>
                <button type="submit" className="btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>批量生成时段</h3>
            <form onSubmit={handleBatchCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>开始日期 *</label>
                  <input type="date" value={batchForm.startDate} min={today}
                    onChange={(e) => setBatchForm(f => ({ ...f, startDate: e.target.value }))} required
                    className="form-input" />
                </div>
                <div className="form-group">
                  <label>结束日期 *</label>
                  <input type="date" value={batchForm.endDate} min={today}
                    onChange={(e) => setBatchForm(f => ({ ...f, endDate: e.target.value }))} required
                    className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>每天时段</label>
                {batchForm.timeRanges.map((r, i) => (
                  <div key={i} className="form-row">
                    <input type="time" value={r.startTime}
                      onChange={(e) => {
                        const ranges = [...batchForm.timeRanges];
                        ranges[i].startTime = e.target.value;
                        setBatchForm(f => ({ ...f, timeRanges: ranges }));
                      }} className="form-input" />
                    <input type="time" value={r.endTime}
                      onChange={(e) => {
                        const ranges = [...batchForm.timeRanges];
                        ranges[i].endTime = e.target.value;
                        setBatchForm(f => ({ ...f, timeRanges: ranges }));
                      }} className="form-input" />
                    <button type="button" className="btn-link danger"
                      onClick={() => setBatchForm(f => ({ ...f, timeRanges: f.timeRanges.filter((_, idx) => idx !== i) }))}>
                      移除
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-link" onClick={() => setBatchForm(f => ({
                  ...f, timeRanges: [...f.timeRanges, { startTime: '10:00', endTime: '11:00' }]
                }))}>+ 添加时段</button>
              </div>
              <div className="form-group">
                <label>最大容量 *</label>
                <input type="number" min="1" value={batchForm.maxCapacity}
                  onChange={(e) => setBatchForm(f => ({ ...f, maxCapacity: parseInt(e.target.value, 10) }))} required
                  className="form-input" />
              </div>
              <div className="form-group">
                <label>选择星期</label>
                <div className="weekdays">
                  {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
                    <label key={i} className="weekday-label">
                      <input type="checkbox" checked={batchForm.weekdays.includes(i)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchForm(f => ({ ...f, weekdays: [...f.weekdays, i] }));
                          } else {
                            setBatchForm(f => ({ ...f, weekdays: f.weekdays.filter(w => w !== i) }));
                          }
                        }} />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowBatchModal(false)}>取消</button>
                <button type="submit" className="btn-primary">生成</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h3>{templateForm.id ? '编辑模板' : '新建模板'}</h3>
            <form onSubmit={handleSaveTemplate}>
              <div className="form-row">
                <div className="form-group">
                  <label>模板类型 *</label>
                  <select value={templateForm.type}
                    onChange={(e) => setTemplateForm(f => ({ ...f, type: e.target.value }))}
                    className="form-input">
                    <option value="confirm">预约确认</option>
                    <option value="reminder">预约提醒</option>
                    <option value="cancel">取消通知</option>
                    <option value="checkin">签到欢迎</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>模板名称 *</label>
                  <input type="text" value={templateForm.name}
                    onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} required
                    className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>模板内容 * <span className="hint">可用变量：{'{visitorName}'} {'{exhibitionTitle}'} {'{appointmentDate}'} {'{timeSlot}'}</span></label>
                <textarea rows={4} value={templateForm.content}
                  onChange={(e) => setTemplateForm(f => ({ ...f, content: e.target.value }))} required
                  className="form-textarea" />
              </div>
              <div className="form-group">
                <button type="button" className="btn-secondary" onClick={handlePreview}>预览效果</button>
                {previewText && <div className="preview-box">{previewText}</div>}
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={templateForm.enabled}
                    onChange={(e) => setTemplateForm(f => ({ ...f, enabled: e.target.checked }))} />
                  启用此模板
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTemplateModal(false)}>取消</button>
                <button type="submit" className="btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentAdmin;
