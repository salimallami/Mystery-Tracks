import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const VotingScreen: React.FC = () => {
    const { socket, room } = useSocket();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    if (!room || !room.currentRound) return <div>Chargement du vote...</div>;

    const currentTrack = room.tracks.find(t => t.id === room.currentRound!.trackId);
    const isOwner = currentTrack?.ownerId === socket?.id;

    const handleVote = () => {
        console.log(`[Client] Attempting to vote. Socket: ${!!socket}, Selected: ${selectedPlayerId}`);
        if (!selectedPlayerId || !socket) {
            console.error("[Client] Cannot vote: Missing socket or selection");
            return;
        }

        socket.emit('vote', { roomId: room.id, guessedPlayerId: selectedPlayerId }, (response: any) => {
            console.log(`[Client] Server acknowledged vote:`, response);
        });

        console.log(`[Client] Vote sent for ${selectedPlayerId}`);
        setHasVoted(true);
    };

    const handleDebug = () => {
        if (socket) socket.emit('debug_room', { roomId: room.id });
    };

    if (isOwner) {
        return (
            <div className="card text-center animate-pop">
                <h2 style={{ color: 'var(--primary-color)' }}>C'est ta musique !</h2>
                <p>Fais genre tu réfléchis...</p>
                <div style={{ fontSize: '5rem', marginTop: '2rem' }}>🤫</div>
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div className="card text-center animate-pop">
                <h2 style={{ color: 'var(--secondary-color)' }}>Vote enregistré !</h2>
                <p>On attend les retardataires...</p>
            </div>
        );
    }

    return (
        <div className="game-container animate-pop">
            <h2 className="text-center mb-2">Qui a mis ce son ?</h2>

            <div className="avatar-grid mb-2">
                {room.players.filter(p => p.id !== socket?.id).map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPlayerId(p.id)}
                        className={`avatar-btn ${selectedPlayerId === p.id ? 'selected' : ''}`}
                        style={{ width: '100px', height: '100px', fontSize: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <div>{p.avatar}</div>
                        <div style={{ fontSize: '1rem', color: '#333', fontWeight: 'bold' }}>{p.nickname}</div>
                    </button>
                ))}
            </div>

            <div className="text-center">
                <button
                    onClick={handleVote}
                    disabled={!selectedPlayerId}
                    className="btn-primary"
                    style={{ fontSize: '1.5rem', padding: '1rem 3rem' }}
                >
                    VALIDER
                </button>

                <div style={{ marginTop: '2rem' }}>
                    <button onClick={handleDebug} style={{ background: 'transparent', border: '1px solid #ccc', color: '#ccc', fontSize: '0.8rem' }}>
                        Debug Server State
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VotingScreen;
