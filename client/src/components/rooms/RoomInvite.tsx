import React, { useState } from 'react';
import { roomService } from '../../services/roomService';
import './Rooms.css';

interface RoomInviteProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

const RoomInvite: React.FC<RoomInviteProps> = ({ roomId, roomName, onClose }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateJoinCode = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await roomService.generateJoinCode(roomId);
      setJoinCode(result.joinCode);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate join code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.log('Failed to copy to clipboard');
    }
  };

  const getInviteLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${joinCode}`;
  };

  return (
    <div className="room-invite-overlay">
      <div className="room-invite-modal">
        <div className="room-invite-header">
          <h2>Invite to {roomName}</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="room-invite-content">
          {!joinCode ? (
            <div className="generate-code-section">
              <p>Generate a join code to invite others to your room.</p>
              <button
                onClick={generateJoinCode}
                className="generate-code-button"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Join Code'}
              </button>
              {error && <div className="error-message">{error}</div>}
            </div>
          ) : (
            <div className="share-section">
              <div className="join-code-display">
                <h3>Join Code</h3>
                <div className="code-container">
                  <span className="join-code">{joinCode}</span>
                  <button
                    onClick={() => copyToClipboard(joinCode)}
                    className="copy-button"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="invite-link-section">
                <h3>Invite Link</h3>
                <div className="link-container">
                  <input
                    type="text"
                    value={getInviteLink()}
                    readOnly
                    className="invite-link-input"
                  />
                  <button
                    onClick={() => copyToClipboard(getInviteLink())}
                    className="copy-button"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="share-options">
                <h3>Share via</h3>
                <div className="share-buttons">
                  <button
                    onClick={() => {
                      const text = `Join my coding room "${roomName}" using code: ${joinCode}`;
                      copyToClipboard(text);
                    }}
                    className="share-button"
                  >
                    Copy Message
                  </button>
                  <button
                    onClick={() => {
                      const url = getInviteLink();
                      if (navigator.share) {
                        navigator.share({
                          title: `Join ${roomName}`,
                          text: `Join my coding room using code: ${joinCode}`,
                          url: url,
                        });
                      } else {
                        copyToClipboard(url);
                      }
                    }}
                    className="share-button"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomInvite; 