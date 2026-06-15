import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppointmentForm from '../components/AppointmentForm.jsx';
import './AppointmentBooking.scss';

function AppointmentBooking() {
  const { exhibitionId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="appointment-booking">
      <div className="booking-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span>←</span> 返回首页
        </button>
        <div className="booking-title-wrap">
          <span className="title-icon">✿</span>
          <h1>访客追思预约</h1>
          <p className="booking-subtitle">预约您的专属追思时光，静享与TA独处的温馨时刻</p>
        </div>
      </div>

      <div className="booking-content">
        <div className="booking-info">
          <div className="info-card">
            <h3>预约须知</h3>
            <ul>
              <li>请提前选择合适的日期和时段进行预约</li>
              <li>预约成功后，请保持手机畅通，我们将发送确认信息</li>
              <li>请在预约时间准时到达，如需取消请提前告知</li>
              <li>馆内请保持安静，共同营造肃穆温馨的追思氛围</li>
              <li>每位访客可携带随行人员，总人数请如实填写</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>温馨提示</h3>
            <ul>
              <li>追思是一种缅怀，更是一种心灵的慰藉</li>
              <li>愿您在此找到与TA重逢的温暖</li>
              <li>如有特殊需求，请在留言中说明</li>
              <li>客服电话：400-888-8888</li>
            </ul>
          </div>
        </div>

        <div className="booking-form-wrap">
          <AppointmentForm exhibitionId={exhibitionId} />
        </div>
      </div>
    </div>
  );
}

export default AppointmentBooking;
