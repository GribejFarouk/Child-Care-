import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import Dashboard from './pages/dashboard/Dashboard';
import MainLayout from './layouts/MainLayout';

/* ── Children ── */
import ChildrenListPage from './pages/children/ChildrenListPage';
import ChildDetailPage from './pages/children/ChildDetailPage';
import ChildFormPage from './pages/children/ChildFormPage';

/* ── Measurements ── */
import MeasurementFormPage from './pages/measurements/MeasurementFormPage';

/* ── Pregnancy ── */
import PregnancyTrackerPage from './pages/pregnancy/PregnancyTrackerPage';

/* ── Growth Charts ── */
import GrowthChartsPage from './pages/growth/GrowthChartsPage';

/* ── Alerts ── */
import AlertsCenterPage from './pages/alerts/AlertsCenterPage';

/* ── OCR ── */
import OcrImportPage from './pages/ocr/OcrImportPage';

/* ── Settings ── */
import SettingsPage from './pages/settings/SettingsPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Protected Routes (Wrapped in MainLayout) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Children */}
          <Route path="/children" element={<ChildrenListPage />} />
          <Route path="/children/add" element={<ChildFormPage />} />
          <Route path="/children/:id" element={<ChildDetailPage />} />
          <Route path="/children/:id/edit" element={<ChildFormPage />} />

          {/* Measurements */}
          <Route path="/children/:childId/measurements/add" element={<MeasurementFormPage />} />

          {/* Growth Charts */}
          <Route path="/growth" element={<GrowthChartsPage />} />
          <Route path="/children/:childId/growth" element={<GrowthChartsPage />} />

          {/* Pregnancy */}
          <Route path="/pregnancy" element={<PregnancyTrackerPage />} />

          {/* Alerts */}
          <Route path="/alerts" element={<AlertsCenterPage />} />

          {/* OCR */}
          <Route path="/ocr" element={<OcrImportPage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
