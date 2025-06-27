import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';
import './Rooms.css';

interface JoinRequest {
  userId: string;
  username: string;
  requestedAt: string;
}

interface JoinRequestsProps {
  roomId: string;
  onClose: () => void;
  onRequestHandled: () => void;
}

const JoinRequests: React.FC<JoinRequestsProps> = ({ roomId, onClose, onRequestHandled }) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, [roomId]);

  const fetchRequests = async () => {
    try {
      const data = await roomService.getPendingRequests(roomId);
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestUserId: string) => {
    try {
      await roomService.approveJoinRequest(roomId, requestUserId);
      setRequests(prev => prev.filter(req => req.userId !== requestUserId));
      onRequestHandled();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestUserId: string) => {
    try {
      await roomService.rejectJoinRequest(roomId, requestUserId);
      setRequests(prev => prev.filter(req => req.userId !== requestUserId));
      onRequestHandled();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="join-requests-overlay">
        <div className="join-requests-modal">
          <div className="loading">Loading requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-requests-overlay">
      <div className="join-requests-modal">
        <div className="join-requests-header">
          <h2>Join Requests</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="join-requests-content">
          {error && <div className="error-message">{error}</div>}

          {requests.length === 0 ? (
            <div className="no-requests">
              <p>No pending join requests</p>
            </div>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request.userId} className="request-item">
                  <div className="request-info">
                    <div className="request-user">
                      <span className="user-avatar">
                        {request.username.charAt(0).toUpperCase()}
                      </span>
                      <div className="user-details">
                        <span className="username">{request.username}</span>
                        <span className="request-time">
                          Requested {formatTime(request.requestedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button
                      onClick={() => handleApprove(request.userId)}
                      className="approve-button"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.userId)}
                      className="reject-button"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRequests; 