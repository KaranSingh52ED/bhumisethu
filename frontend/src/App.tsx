import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { CustomCursor } from './components/CustomCursor';
import { MainNav } from './components/MainNav';
import { ScrollToTop } from './components/ScrollToTop';
import { useAuth } from './context/AuthContext';
import { CompleteRegistrationPage } from './pages/CompleteRegistrationPage';
import { DashboardPage } from './pages/DashboardPage';
import { DealRoomPage } from './pages/DealRoomPage';
import { HomePage } from './pages/HomePage';
import { AddListingPage } from './pages/AddListingPage';
import { ListingsPage } from './pages/ListingsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

function RegistrationGate() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || !user || user.registrationComplete) {
    return null;
  }
  if (location.pathname === '/complete-registration') {
    return null;
  }
  return <Navigate to="/complete-registration" replace />;
}

function ProtectedRoute({
  children,
  requireApproval = true,
}: {
  children: ReactElement;
  requireApproval?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user.registrationComplete) {
    return <Navigate to="/complete-registration" replace />;
  }

  if (requireApproval && user.role !== 'admin' && !user.isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RegistrationGate />
      <CustomCursor />
      <MainNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requireApproval={false}>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listings"
          element={
            <ProtectedRoute requireApproval={false}>
              <ListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listings/new"
          element={
            <ProtectedRoute>
              <AddListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deal-room"
          element={
            <ProtectedRoute>
              <DealRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deal-room/:listingId"
          element={
            <ProtectedRoute>
              <DealRoomPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
