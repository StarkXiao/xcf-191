import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.scss';

function Header() {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">星屑纪念馆</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">展厅列表</Link>
          <Link to="/family-albums" className="nav-link">家庭纪念册</Link>
          <Link to="/family-members" className="nav-link">家庭成员</Link>
          <Link to="/backup" className="nav-link">备份管理</Link>
          <button className="nav-btn create-btn" onClick={() => navigate('/create')}>
            <span className="btn-icon">+</span>
            创建展厅
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
