import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import LoginPage from './components/auth/LoginPage';
import RoleSelection from './components/auth/RoleSelection';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import LocationsPage from './components/locations/LocationsPage';
import LocationDetail from './components/locations/LocationDetail';
import ItemsPage from './components/items/ItemsPage';
import GlobalView from './components/global/GlobalView';
import LocationManagement from './components/admin/LocationManagement';
import AuditLogPage from './components/audit/AuditLogPage';
import { ToastProvider } from './components/ui/toast';
import { Toaster } from './components/Toaster';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    const handleRoleSelected = () => {
      // Force a re-render by reloading the page
      window.location.reload();
    };
    return <RoleSelection user={user} onRoleSelected={handleRoleSelected} />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="locations/:id" element={<LocationDetail />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="global" element={<GlobalView />} />
        <Route path="admin/locations" element={<LocationManagement />} />
        <Route path="admin/audit" element={<AuditLogPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;