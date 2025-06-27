import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CodeEditor from './components/editor/CodeEditor';
import RoomList from './components/rooms/RoomList';
import CreateRoom from './components/rooms/CreateRoom';
import JoinRoom from './components/rooms/JoinRoom';
import InviteLink from './components/rooms/InviteLink';
import './App.css';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
                <JoinRoom />
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
