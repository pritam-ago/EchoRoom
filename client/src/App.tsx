import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AuthGuard from './components/auth/AuthGuard';
import CodeEditor from './components/editor/CodeEditor';
import RoomList from './components/rooms/RoomList';
import CreateRoom from './components/rooms/CreateRoom';
import JoinRoom from './components/rooms/JoinRoom';
import InviteLink from './components/rooms/InviteLink';
import './App.css';
import './components/auth/Auth.css';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="loading-spinner"></div>
            <h2 style={{ margin: 0, color: '#333' }}>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={
              <AuthGuard>
                <Login />
              </AuthGuard>
            } />
            <Route path="/register" element={
              <AuthGuard>
                <Register />
              </AuthGuard>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <RoomList />
              </ProtectedRoute>
            } />
            <Route path="/create-room" element={
              <ProtectedRoute>
                <CreateRoom />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId" element={
              <ProtectedRoute>
                <CodeEditor />
              </ProtectedRoute>
            } />
            <Route path="/join-room" element={
              <ProtectedRoute>
                <JoinRoom onClose={function (): void {
                  throw new Error('Function not implemented.');
                } } />
              </ProtectedRoute>
            } />
            <Route path="/join/:joinCode" element={<InviteLink />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
