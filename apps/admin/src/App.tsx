import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin.js';
import AdminLayout from './components/AdminLayout.js';
import AdminDashboard from './components/AdminDashboard.js';
import AdminUsers from './components/AdminUsers.js';
import AdminQuests from './components/AdminQuests.js';
import { useAuth } from './hooks/useAuth.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (isAdmin === false) return <Navigate to="/login" replace />;
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-cy-cream flex items-center justify-center">
        <p className="text-cy-brown">권한 확인 중...</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="quests" element={<AdminQuests />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
