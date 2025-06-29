import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import './Rooms.css';

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'markdown',
  'sql',
  'yaml',
  'xml',
];

const CreateRoom: React.FC = () => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const room = await roomService.createRoom({
        name,
        language,
        isPrivate,
        requiresApproval,
      });
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      console.log('Create room error:', err);
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-container">
      <div className="create-room-card">
        <div className="create-room-header">
          <h1>Create New Room</h1>
          <p>Start a new collaborative coding session</p>
        </div>

        <form onSubmit={handleSubmit} className="create-room-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Room Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter room name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">Programming Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className="checkmark"></span>
              Private Room (Only invited users can join)
            </label>
          </div>

          {isPrivate && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                />
                <span className="checkmark"></span>
                Require approval for join requests (Google Meet style)
              </label>
            </div>
          )}

          <div className="form-actions">
            <Link to="/" className="cancel-button">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="create-button">
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom; 