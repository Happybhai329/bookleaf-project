import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@bookleaf/shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { AuthorDashboardPage } from '@/pages/author/AuthorDashboardPage';
import { AuthorBooksPage } from '@/pages/author/AuthorBooksPage';
import { AuthorTicketsPage } from '@/pages/author/AuthorTicketsPage';
import { AuthorSubmitTicketPage } from '@/pages/author/AuthorSubmitTicketPage';
import { AuthorTicketDetailPage } from '@/pages/author/AuthorTicketDetailPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminTicketsPage } from '@/pages/admin/AdminTicketsPage';
import { AdminTicketDetailPage } from '@/pages/admin/AdminTicketDetailPage';
import { AdminAuthorsPage } from '@/pages/admin/AdminAuthorsPage';
import { AdminBooksPage } from '@/pages/admin/AdminBooksPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking authentication session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to their respective home
    const target = user.role === UserRole.ADMIN ? '/admin/dashboard' : '/author/dashboard';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading BookLeaf..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === UserRole.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/author/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Protected App Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Author Routes */}
        <Route
          path="/author/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
              <AuthorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/books"
          element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
              <AuthorBooksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/tickets"
          element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
              <AuthorTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/tickets/new"
          element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
              <AuthorSubmitTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/tickets/:ticketId"
          element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
              <AuthorTicketDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets/:ticketId"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminTicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/authors"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminAuthorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/books"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminBooksPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
