import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
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
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    fetchRequests();

    // Setup socket connection for real-time updates
    const token = localStorage.getItem('token');
    const socketInstance = io('http://localhost:3001', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('Connected to join requests socket');
    });

    // Listen for new join requests
    socketInstance.on('join_request_received', (data) => {
      console.log('New join request received:', data);
      // Add the new request to the list
      setRequests(prev => [...prev, {
        userId: data.userId,
        username: data.username,
        requestedAt: data.requestedAt
      }]);
    });

    // Listen for processed requests (when approved/rejected)
    socketInstance.on('join_request_processed', (data) => {
      console.log('Join request processed:', data);
      // Remove the processed request from the list
      setRequests(prev => prev.filter(req => req.userId !== data.userId));
    });

    socketInstance.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [roomId]);

  const fetchRequests = async () => {
    try {
      const data = await roomService.getPendingRequests(roomId);
      console.log('Pending requests data:', data);
      setRequests(data.map((req: any) => ({
        ...req,
        userId: typeof req.userId === 'object' && req.userId._id ? req.userId._id : req.userId
      })));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestUserId: string) => {
    try {
      console.log('Approved join request:', requestUserId);
      console.log('Room ID:', roomId);
      
      // Call the API - backend will handle socket events
      await roomService.approveJoinRequest(roomId, requestUserId);
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.userId !== requestUserId));
      onRequestHandled();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (requestUserId: string) => {
    try {
      // Call the API - backend will handle socket events
      await roomService.rejectJoinRequest(roomId, requestUserId);
      
      // Remove from local state
      setRequests(prev => prev.filter(req => req.userId !== requestUserId));
      onRequestHandled();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject request');
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