import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import TrackSubmission from '../components/TrackSubmission';
import GameScreen from '../components/GameScreen';
import VotingScreen from '../components/VotingScreen';
import ResultsScreen from '../components/ResultsScreen';
import GameOverScreen from '../components/GameOverScreen';

const Lobby: React.FC = () => {

    const { socket, room, setRoom } = useSocket();
    const navigate = useNavigate();

    // Local settings state for host inputs
    const [localSettings, setLocalSettings] = useState({
        tracksPerPlayer: 1,
        roundDuration: 30
    });

    useEffect(() => {
        if (!socket) return;
        if (!room) {
            navigate('/');
            return;
        }

        // Listen for kick
        socket.on('kicked', () => {
            alert("Vous avez été exclu de la partie.");
            setRoom(null);
            navigate('/');
        });

        return () => {
            socket.off('kicked');
        };
    }, [room, socket, navigate, setRoom]);

    // Sync local settings when room updates (if not host, or initial load)
    useEffect(() => {
        if (room && room.settings) {
            // If I am host, I only update if I haven't touched them recently? 
            // Actually, let's just keep them in sync. 
            // To avoid jitter, we might want to debounce updates to server, 
            // but for now let's just update local state if it differs significantly or on load.
            setLocalSettings(room.settings);
        }
    }, [room?.settings]);

    if (!room) return <div className="text-center">Chargement...</div>;

    const isHost = socket?.id === room.hostId;

    const handleSettingsChange = (key: string, value: number) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        if (socket && isHost) {
            socket.emit('update_settings', { roomId: room.id, settings: { ...room.settings, ...newSettings } });
        }
    };

    const startGame = () => {
        if (socket) {
            if (room.players.length < 3) {
                alert("Il faut au moins 3 joueurs pour commencer !");
                return;
            }
            socket.emit('start_game', { roomId: room.id });
        }
    };

    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave_room', { roomId: room.id });
            setRoom(null);
            navigate('/');
        }
    };

    const kickPlayer = (targetId: string) => {
        if (socket && isHost) {
            if (confirm("Voulez-vous vraiment exclure ce joueur ?")) {
                socket.emit('kick_player', { roomId: room.id, targetId });
            }
        }
    };

    // Game Phase Rendering
    if (room.phase === 'SUBMISSION') return <TrackSubmission />;
    if (room.phase === 'PLAYING') return <GameScreen />;
    if (room.phase === 'VOTING') return <VotingScreen />;
    if (room.phase === 'RESULTS') return <ResultsScreen />;
    if (room.phase === 'GAME_OVER') return <GameOverScreen />;

    return (
        <div className="lobby-container animate-pop">
            <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h1>LOBBY</h1>
                <button onClick={leaveRoom} className="btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
                    Quitter
                </button>
            </div>

            <div className="card text-center mb-2">
                <p style={{ fontSize: '1.2rem', color: '#888' }}>Code de la salle</p>
                <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '5px' }}>
                    {room.id}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Players List */}
                <div className="card">
                    <h2>Joueurs ({room.players.length})</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {room.players.map(p => (
                            <div key={p.id} className="player-item">
                                <span style={{ fontSize: '1.5rem' }}>{p.avatar}</span>
                                <span style={{ flex: 1, textAlign: 'left' }}>{p.nickname}</span>
                                {p.isHost && <span style={{ fontSize: '0.8rem', background: 'var(--accent-color)', color: '#000', padding: '2px 8px', borderRadius: '10px' }}>HOST</span>}
                                {isHost && !p.isHost && (
                                    <button
                                        onClick={() => kickPlayer(p.id)}
                                        style={{ background: 'var(--danger-color)', padding: '0.2rem 0.5rem', fontSize: '0.8rem', minWidth: 'auto' }}
                                        title="Exclure"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings */}
                <div className="card">
                    <h2>Paramètres</h2>
                    {isHost ? (
                        <div style={{ textAlign: 'left' }}>
                            <div className="mb-1">
                                <label>Musiques par joueur: <strong>{localSettings.tracksPerPlayer}</strong></label>
                                <input
                                    type="range" min="1" max="5"
                                    value={localSettings.tracksPerPlayer}
                                    onChange={e => handleSettingsChange('tracksPerPlayer', parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                                />
                            </div>
                            <div className="mb-1">
                                <label>Durée (sec): <strong>{localSettings.roundDuration}s</strong></label>
                                <input
                                    type="range" min="15" max="60" step="5"
                                    value={localSettings.roundDuration}
                                    onChange={e => handleSettingsChange('roundDuration', parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p>En attente de l'hôte...</p>
                            <div className="mt-1" style={{ opacity: 0.7 }}>
                                <p>Musiques: <strong>{room.settings.tracksPerPlayer}</strong></p>
                                <p>Durée: <strong>{room.settings.roundDuration}s</strong></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isHost && (
                <div className="mt-2 text-center">
                    <button
                        onClick={startGame}
                        className="btn-primary"
                        style={{ fontSize: '1.5rem', padding: '1rem 4rem' }}
                        disabled={room.players.length < 3}
                    >
                        LANCER LA PARTIE
                    </button>
                    {room.players.length < 3 && (
                        <p style={{ color: 'var(--danger-color)', marginTop: '0.5rem' }}>
                            Il faut au moins 3 joueurs
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Lobby;
