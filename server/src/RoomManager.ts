import { Room, Player, GameSettings, Track } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    public rooms: Map<string, Room> = new Map();

    createRoom(hostId: string, nickname: string, avatar: string): Room {
        const roomId = this.generateRoomCode();
        const host: Player = {
            id: hostId,
            nickname,
            avatar,
            score: 0,
            isHost: true,
            isReady: false,
            submittedTracks: []
        };

        const newRoom: Room = {
            id: roomId,
            hostId,
            players: [host],
            phase: 'LOBBY',
            settings: {
                tracksPerPlayer: 1,
                roundDuration: 30,
                fastMode: false,
                allowSkip: true
            },
            tracks: [],
            roundHistory: []
        };

        this.rooms.set(roomId, newRoom);
        return newRoom;
    }

    joinRoom(roomId: string, playerId: string, nickname: string, avatar: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        if (room.phase !== 'LOBBY') return null;

        const newPlayer: Player = {
            id: playerId,
            nickname,
            avatar,
            score: 0,
            isHost: false,
            isReady: false,
            submittedTracks: []
        };

        room.players.push(newPlayer);
        return room;
    }

    leaveRoom(roomId: string, playerId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        room.players = room.players.filter(p => p.id !== playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return null;
        }

        if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
        }

        return room;
    }

    kickPlayer(roomId: string, hostId: string, targetId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        if (room.hostId !== hostId) return null;
        if (hostId === targetId) return null;

        room.players = room.players.filter(p => p.id !== targetId);
        return room;
    }

    updateSettings(roomId: string, hostId: string, settings: GameSettings): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        if (room.hostId !== hostId) return null;

        room.settings = settings;
        return room;
    }

    submitTracks(roomId: string, playerId: string, tracks: { url: string; platform: 'spotify' | 'youtube'; title?: string }[]): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return null;

        const newTracks: Track[] = tracks.map(t => ({
            id: uuidv4(),
            url: t.url,
            platform: t.platform,
            title: t.title,
            ownerId: playerId,
            played: false
        }));

        player.submittedTracks = newTracks;
        return room;
    }

    checkAllSubmitted(room: Room) {
        const allSubmitted = room.players.every(p => p.submittedTracks && p.submittedTracks.length >= room.settings.tracksPerPlayer);

        if (allSubmitted && room.phase === 'SUBMISSION') {
            let allTracks: Track[] = [];
            room.players.forEach(p => {
                if (p.submittedTracks) {
                    allTracks = [...allTracks, ...p.submittedTracks];
                }
            });

            room.tracks = allTracks.sort(() => Math.random() - 0.5);

            room.phase = 'PLAYING';
            this.startNextRound(room);
        }
    }

    startGame(roomId: string, settings?: GameSettings): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (settings) {
            room.settings = settings;
        }

        if (room.phase === 'LOBBY') {
            room.phase = 'SUBMISSION';
        }

        return room;
    }

    startNextRound(room: Room) {
        const unplayedTracks = room.tracks.filter(t => !t.played);

        if (unplayedTracks.length === 0) {
            room.phase = 'GAME_OVER';
            return;
        }

        const nextTrack = unplayedTracks[0];
        nextTrack.played = true;

        room.currentRound = {
            trackId: nextTrack.id,
            startTime: Date.now(),
            votes: {},
            skipVotes: []
        };

        room.phase = 'PLAYING';
    }

    endPlayback(roomId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        if (room.phase !== 'PLAYING') return null;

        room.phase = 'VOTING';
        return room;
    }

    submitVote(roomId: string, voterId: string, guessedPlayerId: string): Room | null {
        console.log(`[RoomManager] submitVote called. Room: ${roomId}, Voter: ${voterId}`);
        const room = this.rooms.get(roomId);
        if (!room) {
            console.log(`[RoomManager] Room not found`);
            return null;
        }
        if (!room.currentRound) {
            console.log(`[RoomManager] No current round`);
            return null;
        }

        const currentTrack = room.tracks.find(t => t.id === room.currentRound!.trackId);
        if (currentTrack?.ownerId === voterId) {
            console.log(`[RoomManager] Voter is owner, cannot vote`);
            return null;
        }

        room.currentRound.votes[voterId] = guessedPlayerId;

        const eligibleVoters = room.players.filter(p => p.id !== currentTrack?.ownerId);
        const votesCast = Object.keys(room.currentRound.votes).length;

        console.log(`[Vote] Room ${roomId}: ${votesCast}/${eligibleVoters.length} votes. Voter: ${voterId}`);

        if (votesCast >= eligibleVoters.length) {
            console.log(`[Vote] All votes received. Ending round.`);
            this.endRound(room);
        }

        return room;
    }

    private endRound(room: Room) {
        if (!room.currentRound) return;

        const currentTrack = room.tracks.find(t => t.id === room.currentRound!.trackId);
        if (!currentTrack) return;

        console.log(`[EndRound] Track: ${currentTrack.title}, Owner: ${currentTrack.ownerId}`);

        const correctGuessers: string[] = [];
        const eligibleVoters = room.players.filter(p => p.id !== currentTrack.ownerId);

        for (const [voterId, guessedId] of Object.entries(room.currentRound.votes)) {
            if (guessedId === currentTrack.ownerId) {
                correctGuessers.push(voterId);
                const voter = room.players.find(p => p.id === voterId);
                if (voter) voter.score += 1;
            }
        }

        const owner = room.players.find(p => p.id === currentTrack.ownerId);
        let ownerPoints = 0;
        if (owner) {
            ownerPoints = eligibleVoters.length - correctGuessers.length;
            owner.score += ownerPoints;
        }

        room.roundHistory.push({
            track: currentTrack,
            correctGuessers,
            ownerPoints
        });

        room.phase = 'RESULTS';
    }

    nextRound(roomId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        if (room.phase === 'RESULTS') {
            this.startNextRound(room);
            return room;
        }
        return null;
    }

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }
}
