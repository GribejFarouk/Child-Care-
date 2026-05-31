import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
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

/* ── Growth Charts ── */
import GrowthChartsPage from './pages/growth/GrowthChartsPage';

/* ── Assistant ── */
import AssistantPage from './pages/assistant/AssistantPage';

/* ── Calendar ── */
import HealthCalendarPage from './pages/calendar/HealthCalendarPage';

/* ── Doctor Collaboration (Parent side) ── */
import DoctorCollaborationPage from './pages/collaboration/DoctorCollaborationPage';

/* ── Alerts ── */
import AlertsCenterPage from './pages/alerts/AlertsCenterPage';

/* ── Notifications ── */
import NotificationsPage from './pages/notifications/NotificationsPage';

/* ── OCR ── */
import OcrImportPage from './pages/ocr/OcrImportPage';

/* ── Settings & Security ── */
import SettingsPage from './pages/settings/SettingsPage';
import ActivityJournalPage from './pages/activity/ActivityJournalPage';

/* ── Doctor Interface ── */
import DoctorLayout from './layouts/DoctorLayout';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import DoctorPatientsPage from './pages/doctor/DoctorPatientsPage';
import DoctorPatientDetailPage from './pages/doctor/DoctorPatientDetailPage';
import DoctorMessagesPage from './pages/doctor/DoctorMessagesPage';

import { useAuth } from './contexts/AuthContext';

function AuthRedirect({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (user) {
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AuthRedirect><LandingPage /></AuthRedirect>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Parent Routes (Wrapped in MainLayout) */}
          <Route element={<ProtectedRoute allowedRole="parent"><MainLayout /></ProtectedRoute>}>
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

            {/* Assistant */}
            <Route path="/assistant" element={<AssistantPage />} />

            {/* Calendar */}
            <Route path="/calendar" element={<HealthCalendarPage />} />

            {/* Doctor Collaboration */}
            <Route path="/collaboration" element={<DoctorCollaborationPage />} />

            {/* Alerts */}
            <Route path="/alerts" element={<AlertsCenterPage />} />

            {/* Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* OCR */}
            <Route path="/ocr" element={<OcrImportPage />} />

            {/* Settings & Security */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/activity" element={<ActivityJournalPage />} />
          </Route>

          {/* Doctor Routes (Wrapped in DoctorLayout) */}
          <Route element={<ProtectedRoute allowedRole="doctor"><DoctorLayout /></ProtectedRoute>}>
            <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
            <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
            <Route path="/doctor/patients/:id" element={<DoctorPatientDetailPage />} />
            <Route path="/doctor/messages" element={<DoctorMessagesPage />} />
            <Route path="/doctor/notifications" element={<NotificationsPage />} />
            <Route path="/doctor/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
