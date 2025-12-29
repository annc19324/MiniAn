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

import Search from './pages/Search'; // Import
import Notifications from './pages/Notifications'; // Import

import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import Settings from './pages/Settings';
import PostDetails from './pages/PostDetails';

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
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<Search />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/post/:id" element={<PostDetails />} />
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