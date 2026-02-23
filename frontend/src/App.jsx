import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/dashboard/Dashboard';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Router basename="/Child-Care-/">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes (Wrapped in MainLayout) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
