export type GamePhase = 'LOBBY' | 'SUBMISSION' | 'PLAYING' | 'VOTING' | 'RESULTS' | 'GAME_OVER';

export interface Player {
    id: string; // Socket ID
    nickname: string;
    avatar: string;
    score: number;
    isHost: boolean;
    isReady: boolean;
    submittedTracks: Track[];
}

export interface Track {
    id: string;
    url: string;
    title?: string;
    platform: 'spotify' | 'youtube';
    ownerId: string;
    played: boolean;
}

export interface Room {
    id: string;
    hostId: string;
    players: Player[];
    phase: GamePhase;
    settings: GameSettings;
    tracks: Track[];
    currentRound?: Round;
    roundHistory: RoundResult[];
}

export interface GameSettings {
    tracksPerPlayer: number;
    roundDuration: number; // seconds
    fastMode: boolean;
    allowSkip: boolean;
}

export interface Round {
    trackId: string;
    startTime: number; // timestamp
    votes: Record<string, string>; // voterId -> guessedPlayerId
    skipVotes: string[]; // list of playerIds who voted to skip
}

export interface RoundResult {
    track: Track;
    correctGuessers: string[]; // playerIds
    ownerPoints: number;
}
