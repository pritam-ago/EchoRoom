import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import './Rooms.css';

const JoinRoom: React.FC = () => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const room = await roomService.joinRoomWithCode(joinCode.toUpperCase());
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJoinCode(text.toUpperCase());
    } catch (err) {
      console.log('Failed to read from clipboard');
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="join-room-container" onClick={handleBackdropClick}>
      <div className="join-room-card">
        <div className="join-room-header">
          <h2>Join Room</h2>
          <button onClick={handleClose} className="close-button">
            ×
          </button>
        </div>
        <p className="join-room-description">
          Enter a 6-character join code to join a room
        </p>

        <form onSubmit={handleJoinWithCode} className="join-room-form">
          <div className="input-group">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code (e.g., ABC123)"
              maxLength={6}
              className="join-code-input"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="paste-button"
              disabled={loading}
            >
              Paste
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="join-button"
            disabled={loading || !joinCode.trim()}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        <div className="join-room-info">
          <h3>How to get a join code:</h3>
          <ul>
            <li>Ask the room owner for the join code</li>
            <li>Use an invite link that contains the join code</li>
            <li>Room owners can generate join codes in their room settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom; 