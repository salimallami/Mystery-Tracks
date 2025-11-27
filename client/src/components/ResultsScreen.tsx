import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

const ResultsScreen: React.FC = () => {
    const { socket, room } = useSocket();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!room || room.roundHistory.length === 0) return <div>Chargement des résultats...</div>;

    const lastRound = room.roundHistory[room.roundHistory.length - 1];
    const owner = room.players.find(p => p.id === lastRound.track.ownerId);

    const handleNextRound = () => {
        if (socket && room.hostId === socket.id) {
            socket.emit('next_round', { roomId: room.id });
        }
    };

    return (
        <div className="game-container animate-pop">
            <h2 className="text-center mb-2">RÉSULTATS</h2>

            <div className="card text-center">
                <p style={{ fontSize: '1.2rem', color: '#888' }}>C'était la musique de...</p>
                <div style={{ fontSize: '5rem', margin: '1rem 0' }}>{owner?.avatar}</div>
                <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }}>{owner?.nickname}</h3>
                {/* @ts-ignore - title added in frontend but not in shared types yet */}
                {lastRound.track.title && <p style={{ fontSize: '1.2rem', marginTop: '0.5rem', fontStyle: 'italic' }}>"{lastRound.track.title}"</p>}
            </div>

            <div className="card">
                <h3 className="mb-1" style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', color: 'var(--text-main)' }}>Les génies (+1 pt)</h3>
                {lastRound.correctGuessers.length > 0 ? (
                    <div className="avatar-grid" style={{ justifyContent: 'flex-start' }}>
                        {lastRound.correctGuessers.map(id => {
                            const p = room.players.find(pl => pl.id === id);
                            return (
                                <div key={id} className="player-item" style={{ background: '#E8F8F5', border: '1px solid var(--primary-color)' }}>
                                    <span>{p?.avatar}</span>
                                    <span>{p?.nickname}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ color: '#888', fontStyle: 'italic' }}>Personne n'a trouvé ! 😱</p>
                )}
            </div>

            <div className="card text-center">
                <p>Points pour {owner?.nickname}: <span style={{ color: 'var(--secondary-color)', fontWeight: '900', fontSize: '1.5rem' }}>+{lastRound.ownerPoints}</span></p>
            </div>

            {socket?.id === room.hostId ? (
                <div className="text-center">
                    <button
                        onClick={handleNextRound}
                        className="btn-primary"
                        style={{ fontSize: '1.5rem' }}
                    >
                        SUIVANT ({countdown})
                    </button>
                </div>
            ) : (
                <p className="text-center">Le prochain round commence dans {countdown}...</p>
            )}
        </div>
    );
};

export default ResultsScreen;
