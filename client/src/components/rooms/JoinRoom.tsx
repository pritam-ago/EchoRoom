import React, { useState } from 'react';
import './Rooms.css';
import { roomService } from '../../services/roomService';

interface JoinRoomProps {
  onClose: () => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onClose }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyParticipantRoomId, setAlreadyParticipantRoomId] = useState<string | null>(null);

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    setLoading(true);
    setError('');
    setAlreadyParticipantRoomId(null);

    try {
      const room = await roomService.joinRoomWithCode(joinCode.toUpperCase());
      window.location.href = `/room/${room.id}`;
    } catch (err: any) {
      console.log('Join room error:', err);
      if (err.response) {
        console.log('Backend error response:', err.response.data);
      }
      
      // Check if the room requires approval
      if (err.response?.status === 403 && 
          (err.response?.data?.requiresApproval || 
           err.response?.data?.message?.includes('approval'))) {
        try {
          const roomInfo = await roomService.getRoomByJoinCode(joinCode.toUpperCase());
          await roomService.requestJoinRoom(roomInfo.id);
          // Navigate to the room with waiting state - the CodeEditor will handle the waiting room
          window.location.href = `/room/${roomInfo.id}`;
        } catch (requestErr: any) {
          console.log('Join request error:', requestErr);
          if (requestErr.response) {
            console.log('Backend join request error response:', requestErr.response.data);
          }
          if (requestErr.response?.data?.error?.includes('already a participant')) {
            const roomInfo = await roomService.getRoomByJoinCode(joinCode.toUpperCase());
            setAlreadyParticipantRoomId(roomInfo.id);
            setError('You are already a participant in this room.');
          } else {
            setError(requestErr.response?.data?.error || 'Failed to send join request');
          }
        }
      } else if (err.response?.data?.error?.includes('already a participant')) {
        const roomInfo = await roomService.getRoomByJoinCode(joinCode.toUpperCase());
        setAlreadyParticipantRoomId(roomInfo.id);
        setError('You are already a participant in this room.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to join room');
      }
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
    onClose();
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
          {alreadyParticipantRoomId && (
            <button
              type="button"
              className="join-button"
              onClick={() => window.location.href = `/room/${alreadyParticipantRoomId}`}
            >
              Go to Room
            </button>
          )}

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