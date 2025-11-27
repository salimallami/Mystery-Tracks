import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

interface TrackInput {
    id: number;
    url: string;
    title: string;
    loading: boolean;
    error: string;
}

const TrackSubmission: React.FC = () => {
    const { socket, room } = useSocket();
    const [inputs, setInputs] = useState<TrackInput[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [globalError, setGlobalError] = useState('');

    if (!room) return <div>Chargement...</div>;

    const tracksNeeded = room.settings.tracksPerPlayer;

    // Initialize inputs based on settings
    useEffect(() => {
        if (inputs.length === 0) {
            const initialInputs = Array.from({ length: tracksNeeded }, (_, i) => ({
                id: i,
                url: '',
                title: '',
                loading: false,
                error: ''
            }));
            setInputs(initialInputs);
        }
    }, [tracksNeeded]);

    const validateUrl = (input: string) => {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com)\/.+$/;
        return youtubeRegex.test(input) || spotifyRegex.test(input);
    };

    const handleUrlChange = (id: number, url: string) => {
        const newInputs = inputs.map(inp => inp.id === id ? { ...inp, url, error: '' } : inp);
        setInputs(newInputs);
    };

    const handleBlur = (id: number) => {
        const input = inputs.find(i => i.id === id);
        if (!input || !input.url) return;

        if (!validateUrl(input.url)) {
            setInputs(inputs.map(i => i.id === id ? { ...i, error: 'Lien invalide' } : i));
            return;
        }

        // Fetch metadata
        setInputs(inputs.map(i => i.id === id ? { ...i, loading: true, error: '' } : i));

        if (socket) {
            socket.emit('get_metadata', { url: input.url }, (response: any) => {
                if (response.success) {
                    setInputs(prev => prev.map(i => i.id === id ? {
                        ...i,
                        loading: false,
                        title: response.title || "Titre inconnu"
                    } : i));
                } else {
                    setInputs(prev => prev.map(i => i.id === id ? {
                        ...i,
                        loading: false,
                        error: 'Impossible de trouver le titre'
                    } : i));
                }
            });
        }
    };

    const handleSubmit = () => {
        // Validate all
        const allValid = inputs.every(i => i.url && !i.error && i.title);
        if (!allValid) {
            setGlobalError("Remplissez tous les champs correctement !");
            return;
        }

        if (socket) {
            const tracks = inputs.map(i => ({
                url: i.url,
                title: i.title,
                platform: i.url.includes('spotify') ? 'spotify' : 'youtube' as 'spotify' | 'youtube'
            }));

            socket.emit('submit_tracks', {
                roomId: room.id,
                tracks
            });
            setSubmitted(true);
            setGlobalError('');
        }
    };

    if (submitted) {
        return (
            <div className="card text-center animate-pop">
                <h2 style={{ color: 'var(--primary-color)' }}>Musiques envoyées !</h2>
                <p className="mb-2">En attente des autres joueurs...</p>
                <div className="avatar-grid">
                    {room.players.map(p => (
                        <div key={p.id} style={{ opacity: p.submittedTracks?.length ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                            <div className="avatar-btn flex-center" style={{ background: p.submittedTracks?.length ? 'var(--primary-color)' : '#eee' }}>
                                {p.avatar}
                            </div>
                            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{p.nickname}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card animate-pop">
            <h2 className="text-center mb-2">Propose tes musiques ({tracksNeeded})</h2>

            {inputs.map((input, index) => (
                <div key={input.id} className="mb-2" style={{ textAlign: 'left' }}>
                    <label className="mb-1" style={{ display: 'block', fontWeight: 'bold' }}>Musique #{index + 1}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Lien YouTube / Spotify"
                            value={input.url}
                            onChange={e => handleUrlChange(input.id, e.target.value)}
                            onBlur={() => handleBlur(input.id)}
                            style={{ flex: 1, borderColor: input.error ? 'var(--danger-color)' : '#E0E0E0' }}
                        />
                    </div>
                    {input.loading && <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>Recherche du titre...</p>}
                    {input.title && <p style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginTop: '0.2rem', fontWeight: 'bold' }}>🎵 {input.title}</p>}
                    {input.error && <p style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.2rem' }}>{input.error}</p>}
                </div>
            ))}

            {globalError && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontWeight: 'bold' }}>{globalError}</p>}

            <button
                onClick={handleSubmit}
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={inputs.some(i => !i.title || i.loading)}
            >
                ENVOYER
            </button>
        </div>
    );
};

export default TrackSubmission;
