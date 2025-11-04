import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import LoginPage from './components/auth/LoginPage';
import RoleSelection from './components/auth/RoleSelection';
import TermsOfService from './components/legal/TermsOfService';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import LocationsPage from './components/locations/LocationsPage';
import LocationDetail from './components/locations/LocationDetail';
import ItemsPage from './components/items/ItemsPage';
import OrdersPage from './components/orders/OrdersPage';
import GlobalView from './components/global/GlobalView';
import LocationManagement from './components/admin/LocationManagement';
import AuditLogPage from './components/audit/AuditLogPage';
import SettingsPage from './components/settings/SettingsPage';
import ModuleSelector from './components/hotel/ModuleSelector';
import FrontDeskLayout from './components/hotel/frontdesk/FrontDeskLayout';
import FinanceLayout from './components/hotel/finance/FinanceLayout';
import { NFCCleanRoomPage } from './components/testing/NFCCleanRoomPage';
import { AdminTestingPage } from './components/testing/AdminTestingPage';
import { ToastProvider } from './components/ui/toast';
import { Toaster } from './components/Toaster';
import { Analytics } from "@vercel/analytics/react"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
}

function RequiresProfile({ children }: { children: React.ReactNode }) {
  const { user, loading, hasProfile, profileLoading } = useAuth();

  console.log('RequiresProfile:', { loading, profileLoading, hasProfile, userEmail: user?.email })

  if (loading || profileLoading) {
    console.log('RequiresProfile: Showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log('RequiresProfile: No user, redirecting to login')
    return <Navigate to="/login" replace />;
  }

  // If user exists but no profile, redirect to onboarding
  if (!hasProfile) {
    console.log('RequiresProfile: No profile, redirecting to onboarding')
    return <Navigate to="/onboarding" replace />;
  }

  console.log('RequiresProfile: All checks passed, rendering children')
  return <>{children}</>;
}

function RoleSelectionWrapper() {
  const { user, hasProfile, profileLoading, refreshProfile } = useAuth();

  console.log('RoleSelectionWrapper:', { profileLoading, hasProfile, userEmail: user?.email })

  if (profileLoading) {
    console.log('RoleSelectionWrapper: Showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user has a profile, redirect to module selector
  if (hasProfile) {
    console.log('RoleSelectionWrapper: Has profile, redirecting to module selector')
    return <Navigate to="/hotel/module-selector" replace />;
  }

  // If no profile, show role selection
  console.log('RoleSelectionWrapper: No profile, showing role selection')
  return <RoleSelection user={user} onRoleSelected={refreshProfile} />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/onboarding" replace /> : <LoginPage />
      } />

      {/* Legal Pages - No authentication required */}
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* Role Selection / Onboarding Route */}
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <RoleSelectionWrapper />
        </ProtectedRoute>
      } />

      {/* NFC Room Cleaning Route - Public (no auth required for NFC tags) */}
      <Route path="/nfc/clean" element={<NFCCleanRoomPage />} />

      {/* Hotel Management Routes */}
      <Route path="/hotel/module-selector" element={
        <RequiresProfile>
          <ModuleSelector />
        </RequiresProfile>
      } />
      <Route path="/hotel/front-desk/*" element={
        <RequiresProfile>
          <FrontDeskLayout />
        </RequiresProfile>
      } />
      <Route path="/hotel/finance/*" element={
        <RequiresProfile>
          <FinanceLayout />
        </RequiresProfile>
      } />

      {/* Existing Inventory System Routes */}
      <Route path="/" element={
        <RequiresProfile>
          <Layout />
        </RequiresProfile>
      }>
        <Route index element={<Navigate to="/hotel/module-selector" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="locations/:id" element={<LocationDetail />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="global" element={<GlobalView />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin/locations" element={<LocationManagement />} />
        <Route path="admin/audit" element={<AuditLogPage />} />
        <Route path="admin/testing" element={<AdminTestingPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/hotel/module-selector" replace />} />
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