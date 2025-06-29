import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner"></div>
              <h1>Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only render children if user is not authenticated
  return !isAuthenticated ? <>{children}</> : null;
};

export default AuthGuard; 