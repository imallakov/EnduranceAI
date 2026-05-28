import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import CookieConsentBanner from './components/legal/CookieConsentBanner';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import ActivityDetail from './pages/ActivityDetail';
import Predictions from './pages/Predictions';
import Plan from './pages/Plan';
import Marathons from './pages/Marathons';
import MarathonDetail from './pages/MarathonDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import CookiePolicy from './pages/legal/CookiePolicy';

const App: React.FC = () => (
  <>
    <Routes>
      {/* Public landing — no AppShell */}
      <Route path="/" element={<Landing />} />

      {/* Auth pages — no AppShell, no protection */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Onboarding — protected but no AppShell */}
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />

      {/* Legal pages — public, no AppShell */}
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<TermsOfService />} />
      <Route path="/legal/cookies" element={<CookiePolicy />} />

      {/* Protected app pages — inside AppShell */}
      <Route element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/activities/:id" element={<ActivityDetail />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/marathons" element={<Marathons />} />
        <Route path="/marathons/:id" element={<MarathonDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
    {/* Cookie consent banner — shown on all pages except /legal/* */}
    <CookieConsentBanner />
  </>
);

export default App;
