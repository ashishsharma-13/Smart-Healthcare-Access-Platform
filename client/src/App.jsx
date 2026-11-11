import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { UIProvider } from './context/UIContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HospitalsListPage } from './pages/public/HospitalsListPage';

// Patient Pages
import { DoctorSearchPage } from './pages/patient/DoctorSearchPage';
import { DoctorProfilePage } from './pages/patient/DoctorProfilePage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { AppointmentsPage } from './pages/patient/AppointmentsPage';
import { EmergencyActivatePage } from './pages/patient/EmergencyActivatePage';
import { EmergencyBroadcastPage } from './pages/patient/EmergencyBroadcastPage';
import { EmergencyResponsesPage } from './pages/patient/EmergencyResponsesPage';
import { EmergencyReservedPage } from './pages/patient/EmergencyReservedPage';
import { EmergencyTrackingPage } from './pages/patient/EmergencyTrackingPage';
import { EmergencyHistoryPage } from './pages/patient/EmergencyHistoryPage';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPresencePage } from './pages/doctor/DoctorPresencePage';
import { DoctorSchedulePage } from './pages/doctor/DoctorSchedulePage';
import { DoctorAffiliationsPage } from './pages/doctor/DoctorAffiliationsPage';

// Organization Pages
import { OrganizationDashboard } from './pages/organization/OrganizationDashboard';
import { OrganizationResourcesPage } from './pages/organization/OrganizationResourcesPage';
import { OrganizationQrDeskPage } from './pages/organization/OrganizationQrDeskPage';
import { OrganizationDoctorsPage } from './pages/organization/OrganizationDoctorsPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminEmergencyMonitor } from './pages/admin/AdminEmergencyMonitor';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-xs text-slate-400">Authenticating...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (user?.role === 'organization') return <Navigate to="/organization/dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/patient/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <UIProvider>
          <Router>
            <Routes>
            {/* Public Layout */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/doctors" element={<DoctorSearchPage />} />
              <Route path="/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/hospitals" element={<HospitalsListPage />} />
            </Route>

            {/* Authenticated Dashboard Layout */}
            <Route element={<DashboardLayout />}>
              {/* General Dashboard Redirect */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Patient */}
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/appointments"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <AppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/activate"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'organization', 'admin']}>
                    <EmergencyActivatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/broadcast/:id"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'organization', 'admin']}>
                    <EmergencyBroadcastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/responses/:id"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'organization', 'admin']}>
                    <EmergencyResponsesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/reserved/:id"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'organization', 'admin']}>
                    <EmergencyReservedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/tracking/:id"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'doctor', 'organization', 'admin']}>
                    <EmergencyTrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency/history"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'admin']}>
                    <EmergencyHistoryPage />
                  </ProtectedRoute>
                }
              />

              {/* Doctor */}
              <Route
                path="/doctor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/affiliations"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorAffiliationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/presence"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorPresencePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/schedule"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorSchedulePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/appointments"
                element={
                  <ProtectedRoute allowedRoles={['doctor']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Organization */}
              <Route
                path="/organization/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['organization']}>
                    <OrganizationDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/resources"
                element={
                  <ProtectedRoute allowedRoles={['organization']}>
                    <OrganizationResourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/qr-code"
                element={
                  <ProtectedRoute allowedRoles={['organization']}>
                    <OrganizationQrDeskPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/doctors"
                element={
                  <ProtectedRoute allowedRoles={['organization']}>
                    <OrganizationDoctorsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/doctors"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organizations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/emergencies"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminEmergencyMonitor />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </UIProvider>
    </SocketProvider>
  </AuthProvider>
  );
}
