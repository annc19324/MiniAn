// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

import Layout from './components/layout/Layout';
import AdminDashboard from './pages/AdminDashboard'; // Import

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/chat" element={<div className="glass-card min-h-[500px] flex items-center justify-center text-slate-400">Chat Feature Coming Soon</div>} />
          <Route path="/profile/:id" element={<div className="glass-card min-h-[500px] flex items-center justify-center text-slate-400">Profile Feature Coming Soon</div>} />
          <Route path="/notifications" element={<div className="glass-card min-h-[500px] flex items-center justify-center text-slate-400">Notifications Feature Coming Soon</div>} />
          <Route path="/create" element={<div className="glass-card min-h-[500px] flex items-center justify-center text-slate-400">Create Post Feature Coming Soon</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}