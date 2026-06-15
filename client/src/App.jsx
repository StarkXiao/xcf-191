import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import CreateExhibition from './pages/CreateExhibition.jsx';
import ExhibitionDetail from './pages/ExhibitionDetail.jsx';
import TimelinePlayer from './pages/TimelinePlayer.jsx';
import ShareLanding from './pages/ShareLanding.jsx';
import FamilyAlbumHome from './pages/FamilyAlbumHome.jsx';
import FamilyAlbumDetail from './pages/FamilyAlbumDetail.jsx';
import CreateFamilyAlbum from './pages/CreateFamilyAlbum.jsx';
import FamilyMemberManager from './pages/FamilyMemberManager.jsx';
import FamilyTimeline from './pages/FamilyTimeline.jsx';
import BackupManager from './components/BackupManager.jsx';
import AppointmentAdmin from './pages/AppointmentAdmin.jsx';
import AppointmentBooking from './pages/AppointmentBooking.jsx';
import MemorialRitualList from './pages/MemorialRitualList.jsx';
import MemorialRitualManager from './pages/MemorialRitualManager.jsx';
import MemorialRitualPlayer from './pages/MemorialRitualPlayer.jsx';
import CollectionHome from './pages/CollectionHome.jsx';
import CollectionEditor from './pages/CollectionEditor.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import './styles/App.scss';

function App() {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith('/share/');

  if (isSharePage) {
    return (
      <Routes>
        <Route path="/share/:code" element={<ShareLanding />} />
      </Routes>
    );
  }

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
          <Route path="/share/:code" element={<ShareLanding />} />
          <Route path="/family-albums" element={<FamilyAlbumHome />} />
          <Route path="/family-albums/create" element={<CreateFamilyAlbum />} />
          <Route path="/family-albums/:id" element={<FamilyAlbumDetail />} />
          <Route path="/family-albums/:id/edit" element={<CreateFamilyAlbum />} />
          <Route path="/family-albums/:id/timeline" element={<FamilyTimeline />} />
          <Route path="/family-members" element={<FamilyMemberManager />} />
          <Route path="/backup" element={<BackupManager />} />
          <Route path="/appointments" element={<AppointmentAdmin />} />
          <Route path="/appointment/book" element={<AppointmentBooking />} />
          <Route path="/appointment/book/:exhibitionId" element={<AppointmentBooking />} />
          <Route path="/memorial-rituals" element={<MemorialRitualList />} />
          <Route path="/memorial-rituals/create" element={<MemorialRitualManager />} />
          <Route path="/memorial-rituals/:id/edit" element={<MemorialRitualManager />} />
          <Route path="/memorial-rituals/:id/player" element={<MemorialRitualPlayer />} />
          <Route path="/collections" element={<CollectionHome />} />
          <Route path="/collections/create" element={<CollectionEditor />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/collections/:id/edit" element={<CollectionEditor />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
