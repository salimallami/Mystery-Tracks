import { useEffect, useState } from 'react';
import YouTube from 'react-youtube';
import { useSocket } from '../context/SocketContext';

const GameScreen: React.FC = () => {
    const { room } = useSocket();
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!room || !room.currentRound) return;

        const roundEndTime = room.currentRound.startTime + (room.settings.roundDuration * 1000);

        const interval = setInterval(() => {
            const remaining = Math.ceil((roundEndTime - Date.now()) / 1000);
            setTimeLeft(Math.max(0, remaining));

            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [room]);

    if (!room || !room.currentRound) return <div>Chargement du jeu...</div>;

    const currentTrack = room.tracks.find(t => t.id === room.currentRound!.trackId);
    if (!currentTrack) return <div>Erreur: Piste introuvable</div>;

    // Extract YouTube ID
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeId(currentTrack.url);

    // Helper for Spotify URL
    const getSpotifyEmbedUrl = (url: string) => {
        try {
            // Handle: https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=...
            // Handle: https://open.spotify.com/intl-fr/track/4uLU6hMCjMI75M1A2tKUQC
            // Goal: https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC

            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const trackIndex = pathParts.indexOf('track');
            if (trackIndex !== -1 && pathParts[trackIndex + 1]) {
                return `https://open.spotify.com/embed/track/${pathParts[trackIndex + 1]}`;
            }
            return url.replace('open.spotify.com', 'open.spotify.com/embed');
        } catch (_) {
            return url;
        }
    };

    return (
        <div className="game-container animate-pop">
            <div className="card text-center">
                <h2 style={{ fontSize: '3rem', color: 'var(--primary-color)' }}>{timeLeft}s</h2>
                <p className="mb-2">Écoutez bien...</p>

                <div className="mb-2" style={{ pointerEvents: 'none', opacity: 0.8 }}>
                    {/* Visualizer Placeholder */}
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        {[...Array(10)].map((_, i) => (
                            <div key={i} style={{
                                width: '10px',
                                height: '50px',
                                background: 'var(--secondary-color)',
                                animation: `popIn 0.5s infinite alternate ${i * 0.1}s`
                            }} />
                        ))}
                    </div>
                </div>

                {/* Hidden Player (Visible for Spotify interaction) */}
                <div style={{
                    position: 'relative',
                    opacity: currentTrack.platform === 'spotify' ? 1 : 0,
                    pointerEvents: currentTrack.platform === 'spotify' ? 'auto' : 'none',
                    marginTop: '2rem'
                }}>
                    {currentTrack.platform === 'youtube' && videoId && (
                        <YouTube
                            videoId={videoId}
                            opts={{
                                height: '0',
                                width: '0',
                                playerVars: {
                                    autoplay: 1,
                                    controls: 0,
                                    start: 0
                                }
                            }}
                        />
                    )}
                    {currentTrack.platform === 'spotify' && (
                        <iframe
                            src={getSpotifyEmbedUrl(currentTrack.url)}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title="Spotify"
                            style={{ pointerEvents: 'auto' }}
                        ></iframe>
                    )}
                </div>

                {currentTrack.platform === 'spotify' && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#222', borderRadius: '10px' }}>
                        <p style={{ fontSize: '0.9rem', color: '#fff' }}>
                            ⚠️ <strong>Spotify</strong> : Le lancement automatique est souvent bloqué par le navigateur.
                            <br />Cliquez sur "Play" ci-dessus si ça ne démarre pas !
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameScreen;
