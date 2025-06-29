import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import { useAuth } from '../../contexts/AuthContext';
import './Rooms.css';

const InviteLink: React.FC = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!joinCode) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    const handleInviteLink = async () => {
      try {
        const room = await roomService.getRoomByJoinCode(joinCode);
        if (room) {
          setRoomInfo(room);
        } else {
          setError('Room not found or invite link is invalid');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load room information');
      } finally {
        setLoading(false);
      }
    };

    handleInviteLink();
  }, [joinCode]);

  const handleJoinRoom = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/join/${joinCode}`);
      return;
    }

    setLoading(true);
    try {
      const room = await roomService.joinRoomWithCode(joinCode!);
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      // Check if it's an approval required error
      if (err.response?.status === 403 && 
          (err.response?.data?.requiresApproval || 
           err.response?.data?.message?.includes('approval'))) {
        try {
          // Get room info by code to get the roomId
          const roomInfo = await roomService.getRoomByJoinCode(joinCode!);
          await roomService.requestJoinRoom(roomInfo.id);
          setError('Join request sent! The room owner will be notified.');
        } catch (requestErr: any) {
          setError(requestErr.response?.data?.error || 'Failed to send join request');
        }
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to join room');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="invite-link-container">
        <div className="invite-link-card">
          <div className="loading">Loading room information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-link-container">
        <div className="invite-link-card">
          <h2>Invalid Invite Link</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => navigate('/')} className="back-button">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-link-container">
      <div className="invite-link-card">
        <h2>You're invited!</h2>
        <div className="room-preview">
          <h3>{roomInfo.name}</h3>
          <p className="room-language">{roomInfo.language}</p>
          <p className="room-participants">
            {roomInfo.participants.length} participant{roomInfo.participants.length !== 1 ? 's' : ''}
          </p>
          <p className="room-owner">
            Created by {roomInfo.owner?.username || 'Unknown'}
          </p>
        </div>

        <div className="join-actions">
          {isAuthenticated ? (
            <button
              onClick={handleJoinRoom}
              className="join-button"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          ) : (
            <div className="auth-required">
              <p>You need to be logged in to join this room</p>
              <button
                onClick={() => navigate(`/login?redirect=/join/${joinCode}`)}
                className="login-button"
              >
                Log In
              </button>
              <button
                onClick={() => navigate(`/register?redirect=/join/${joinCode}`)}
                className="register-button"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/')} className="back-button">
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default InviteLink; 