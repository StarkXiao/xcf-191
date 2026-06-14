import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import CreateExhibition from './pages/CreateExhibition.jsx';
import ExhibitionDetail from './pages/ExhibitionDetail.jsx';
import TimelinePlayer from './pages/TimelinePlayer.jsx';
import './styles/App.scss';

function App() {
  return (
    <div className="app">
      <div className="stars-bg">
        <div className="stars stars-1"></div>
        <div className="stars stars-2"></div>
        <div className="stars stars-3"></div>
      </div>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateExhibition />} />
          <Route path="/exhibition/:id" element={<ExhibitionDetail />} />
          <Route path="/exhibition/:id/player" element={<TimelinePlayer />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
