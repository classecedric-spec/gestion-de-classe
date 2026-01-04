import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Groups from './pages/Groups';
import UserManagement from './pages/UserManagement';
import ActivitiesLayout from './pages/ActivitiesLayout';
import Branches from './pages/Branches';
import SubBranches from './pages/SubBranches';

import Modules from './pages/Modules';
import Activities from './pages/Activities';
import Niveaux from './pages/Niveaux';
import Materiels from './pages/Materiels';
import Settings from './pages/Settings';
import SuiviGlobal from './pages/SuiviGlobal';
import Adults from './pages/Adults';
import MobileSuivi from './pages/MobileSuivi';
import Features from './pages/Features';
import Privacy from './pages/Privacy';
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="suivi" element={<SuiviGlobal />} />
          <Route path="avancement" element={<Navigate to="/dashboard/suivi" replace />} />
          <Route path="user" element={<UserManagement />}>
            <Route index element={<Navigate to="groups" replace />} />
            <Route path="students" element={<Students />} />
            <Route path="groups" element={<Groups />} />
            <Route path="classes" element={<Classes />} />
            <Route path="niveaux" element={<Niveaux />} />
            <Route path="adults" element={<Adults />} />
          </Route>
          <Route path="activities" element={<ActivitiesLayout />}>
            <Route index element={<Navigate to="modules" replace />} />
            <Route path="branches" element={<Branches />} />
            <Route path="sub-branches" element={<SubBranches />} />
            <Route path="modules" element={<Modules />} />
            <Route path="materiels" element={<Materiels />} />
            <Route path="list" element={<Activities />} />
          </Route>
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/mobile-suivi/:groupId" element={<MobileSuivi />} />
      </Routes>
    </Router>
  );
}



export default App;

