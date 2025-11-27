import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const GameOverScreen: React.FC = () => {
    const { room, setRoom } = useSocket();
    const navigate = useNavigate();

    if (!room) return null;

    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    const handleHome = () => {
        setRoom(null);
        navigate('/');
    };

    return (
        <div className="game-container animate-pop">
            <h1 className="text-center" style={{ color: 'var(--text-light)', marginBottom: '3rem' }}>FIN DE PARTIE</h1>

            <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sortedPlayers.map((p, index) => (
                        <div
                            key={p.id}
                            className="player-item"
                            style={{
                                padding: '1.5rem',
                                background: index === 0 ? '#FFF9C4' : '#F5F5F5', // Gold for winner
                                border: index === 0 ? '3px solid #FFD700' : 'none',
                                transform: index === 0 ? 'scale(1.05)' : 'none',
                                boxShadow: index === 0 ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '2rem', fontWeight: '900', width: '50px', color: index === 0 ? '#FFD700' : '#888' }}>#{index + 1}</span>
                            <span style={{ fontSize: '2.5rem' }}>{p.avatar}</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', flex: 1, textAlign: 'left' }}>{p.nickname}</span>
                            <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-color)' }}>{p.score} pts</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={handleHome}
                    className="btn-secondary"
                    style={{ fontSize: '1.5rem' }}
                >
                    RETOUR ACCUEIL
                </button>
            </div>
        </div>
    );
};

export default GameOverScreen;
