import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../services/roomService';
import './Rooms.css';
import { io, Socket } from 'socket.io-client';

interface WaitingRoomProps {
  roomId: string;
  onApproved: () => void;
  onRejected: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ roomId, onApproved, onRejected }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    // Fetch room info
    const fetchRoomInfo = async () => {
      try {
        const room = await roomService.getRoomById(roomId);
        setRoomInfo(room);
      } catch (err: any) {
        setError('Failed to load room information');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomInfo();
  }, [roomId]);

  useEffect(() => {
    // Setup socket connection for real-time updates
    const token = localStorage.getItem('token');
    const socketInstance = io('http://localhost:3001', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      // Join user-specific room for direct events
      if (user && user.id) {
        socketInstance.emit('join-user-room', { userId: user.id });
      }
    });

    socketInstance.on('join_request_approved', (data) => {
      if (data.roomId === roomId) {
        if (onApproved) onApproved();
        navigate(`/rooms/${roomId}`);
      }
    });

    socketInstance.on('join_request_rejected', (data) => {
      if (data.roomId === roomId) {
        setRejected(true);
        if (onRejected) onRejected();
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleCancelRequest = async () => {
    try {
      setCancelling(true);
      await roomService.cancelJoinRequest(roomId);
      // Navigate back to rooms list
      navigate('/');
    } catch (err: any) {
      setError('Failed to cancel request');
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="waiting-room-container">
        <div className="waiting-room-card">
          <div className="loading">Loading room information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="waiting-room-container">
        <div className="waiting-room-card">
          <div className="error-message">{error}</div>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="waiting-room-container">
        <div className="waiting-room-card">
          <div className="error-message">Your join request was rejected by the host.</div>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-card">
        <div className="waiting-room-header">
          <h2>Waiting for Approval</h2>
          <div className="waiting-animation">
            <div className="spinner"></div>
          </div>
        </div>

        <div className="room-info">
          <h3>{roomInfo?.name || 'Unknown Room'}</h3>
          <p className="room-language">{roomInfo?.language || 'Unknown Language'}</p>
          <p className="room-owner">
            Host: {roomInfo?.owner?.username || 'Unknown'}
          </p>
        </div>

        <div className="waiting-message">
          <p>Your request to join this room has been sent to the host.</p>
          <p>Please wait while they review your request...</p>
        </div>

        <div className="waiting-actions">
          <button 
            onClick={handleCancelRequest}
            className="cancel-request-button"
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </div>

        <div className="waiting-tips">
          <h4>Tips:</h4>
          <ul>
            <li>Make sure you have a stable internet connection</li>
            <li>The host will be notified of your request</li>
            <li>You'll be automatically redirected once approved</li>
            <li>You can cancel your request at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom; 