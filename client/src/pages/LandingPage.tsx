import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];

const LandingPage: React.FC = () => {
    const { socket, setRoom } = useSocket();
    const navigate = useNavigate();
    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState(AVATARS[0]);
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState<'create' | 'join'>('create');

    const handleCreate = () => {
        if (!socket || !nickname) return;
        socket.emit('create_room', { nickname, avatar }, (response: any) => {
            if (response.success) {
                setRoom(response.room);
                navigate(`/lobby/${response.roomId}`);
            }
        });
    };

    const handleJoin = () => {
        if (!socket || !nickname || !roomCode) return;
        socket.emit('join_room', { roomId: roomCode.toUpperCase(), nickname, avatar }, (response: any) => {
            if (response.success) {
                setRoom(response.room);
                navigate(`/lobby/${response.room.id}`);
            } else {
                alert(response.error || "Erreur lors de la connexion");
            }
        });
    };

    return (
        <div className="landing-container animate-pop">
            <h1>MYSTERY TRACKS</h1>

            <div className="card">
                <div className="mb-2">
                    <h2>Choisis ton Avatar</h2>
                    <div className="avatar-grid">
                        {AVATARS.map(a => (
                            <button
                                key={a}
                                onClick={() => setAvatar(a)}
                                className={`avatar-btn ${avatar === a ? 'selected' : ''}`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-2">
                    <input
                        type="text"
                        placeholder="Ton Pseudo"
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                        maxLength={12}
                    />
                </div>

                <div className="flex-center gap-1 mb-2">
                    <button
                        onClick={() => setMode('create')}
                        className={mode === 'create' ? 'btn-secondary' : ''}
                        style={{ opacity: mode === 'create' ? 1 : 0.5 }}
                    >
                        Créer
                    </button>
                    <button
                        onClick={() => setMode('join')}
                        className={mode === 'join' ? 'btn-secondary' : ''}
                        style={{ opacity: mode === 'join' ? 1 : 0.5 }}
                    >
                        Rejoindre
                    </button>
                </div>

                {mode === 'join' && (
                    <div className="mb-2 animate-pop">
                        <input
                            type="text"
                            placeholder="Code de la salle (ex: ABCD)"
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value)}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                )}

                <button
                    onClick={mode === 'create' ? handleCreate : handleJoin}
                    disabled={!nickname || (mode === 'join' && !roomCode)}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '1.5rem' }}
                >
                    {mode === 'create' ? "C'EST PARTI !" : "REJOINDRE !"}
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
