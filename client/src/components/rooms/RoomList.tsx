import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../services/roomService';
import JoinRoom from './JoinRoom';
import './Rooms.css';

interface Room {
  id: string;
  name: string;
  language: string;
  participants: Array<{
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  }>;
  createdAt: string;
  roomType: 'public' | 'private' | 'request_to_join';
}

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const roomsData = await roomService.getRooms();
      setRooms(roomsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="rooms-container">
        <div className="loading">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="rooms-container">
      <header className="rooms-header">
        <div className="header-content">
          <h1>EchoRoom</h1>
          <p>Collaborative Code Editor</p>
        </div>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="rooms-main">
        <div className="rooms-header-section">
          <h2>Available Rooms</h2>
          <div className="room-actions">
            <button
              onClick={() => setShowJoinModal(true)}
              className="join-with-code-button"
            >
              Join with Code
            </button>
            <Link to="/create-room" className="create-room-button">
              Create New Room
            </Link>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="rooms-grid">
          {rooms.length === 0 ? (
            <div className="no-rooms">
              <p>No rooms available. Create the first one!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p className="room-language">{room.language}</p>
                  <p className="room-participants">
                    {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                  </p>
                  <p className="room-date">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="room-actions">
                  <Link to={`/room/${room.id}`} className="join-room-button">
                    Join Room
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showJoinModal && (
        <JoinRoom onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
};

export default RoomList; 