import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './RoomManager';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const roomManager = new RoomManager();

app.get('/', (req, res) => {
    res.send('Mystery Tracks Server is running');
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ nickname, avatar }, callback) => {
        const room = roomManager.createRoom(socket.id, nickname, avatar);
        socket.join(room.id);
        callback({ success: true, roomId: room.id, room });
    });

    socket.on('join_room', ({ roomId, nickname, avatar }, callback) => {
        const room = roomManager.joinRoom(roomId, socket.id, nickname, avatar);
        if (room) {
            socket.join(roomId);
            io.to(roomId).emit('room_updated', room);
            callback({ success: true, room });
        } else {
            callback({ success: false, error: 'Salle introuvable ou partie déjà commencée' });
        }
    });

    socket.on('leave_room', ({ roomId }) => {
        const room = roomManager.leaveRoom(roomId, socket.id);
        if (room) {
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('kick_player', ({ roomId, targetId }) => {
        const room = roomManager.kickPlayer(roomId, socket.id, targetId);
        if (room) {
            io.to(roomId).emit('room_updated', room);
            const targetSocket = io.sockets.sockets.get(targetId);
            if (targetSocket) {
                targetSocket.leave(roomId);
                targetSocket.emit('kicked');
            }
        }
    });

    socket.on('update_settings', ({ roomId, settings }) => {
        const room = roomManager.updateSettings(roomId, socket.id, settings);
        if (room) {
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('get_metadata', async ({ url }, callback) => {
        try {
            let oembedUrl = '';
            if (url.includes('spotify')) {
                oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
            } else if (url.includes('youtube') || url.includes('youtu.be')) {
                oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            }

            if (oembedUrl) {
                const response = await fetch(oembedUrl);
                const data = await response.json();
                callback({ success: true, title: data.title, author_name: data.author_name });
            } else {
                callback({ success: false, error: 'URL non supportée' });
            }
        } catch (error) {
            console.error('Metadata fetch error:', error);
            callback({ success: false, error: 'Impossible de récupérer les infos' });
        }
    });

    socket.on('vote', ({ roomId, guessedPlayerId }, callback) => {
        console.log(`[Socket] Vote received from ${socket.id} for room ${roomId}`);
        const room = roomManager.submitVote(roomId, socket.id, guessedPlayerId);
        if (room) {
            io.to(roomId).emit('room_updated', room);
            if (callback) callback({ success: true });
        } else {
            console.log(`[Socket] Vote rejected by RoomManager`);
            if (callback) callback({ success: false, error: 'Vote rejected' });
        }
    });

    socket.on('debug_room', ({ roomId }) => {
        const room = roomManager.rooms.get(roomId);
        if (room) {
            console.log(`[Debug] Room ${roomId} State:`);
            console.log(`- Players: ${room.players.map(p => `${p.nickname} (${p.id})`).join(', ')}`);
            console.log(`- Phase: ${room.phase}`);
            console.log(`- Current Round:`, room.currentRound);
            console.log(`- Tracks: ${room.tracks.length}`);
        }
    });

    // Helper to manage round timers
    const roundTimers = new Map<string, NodeJS.Timeout>();

    const startRoundTimer = (roomId: string, duration: number) => {
        if (roundTimers.has(roomId)) {
            clearTimeout(roundTimers.get(roomId)!);
        }

        const timer = setTimeout(() => {
            const room = roomManager.endPlayback(roomId);
            if (room) {
                io.to(roomId).emit('room_updated', room);
            }
        }, duration * 1000);

        roundTimers.set(roomId, timer);
    };

    socket.on('start_game', ({ roomId }) => {
        const room = roomManager.startGame(roomId);
        if (room) {
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('submit_tracks', ({ roomId, tracks }) => {
        const room = roomManager.submitTracks(roomId, socket.id, tracks);
        if (room) {
            const oldPhase = room.phase;
            roomManager.checkAllSubmitted(room);
            // If phase changed to PLAYING, start timer
            if (room.phase === 'PLAYING' && oldPhase !== 'PLAYING') {
                startRoundTimer(roomId, room.settings.roundDuration);
            }
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('next_round', ({ roomId }) => {
        const room = roomManager.nextRound(roomId);
        if (room) {
            if (room.phase === 'PLAYING') {
                startRoundTimer(roomId, room.settings.roundDuration);
            }
            io.to(roomId).emit('room_updated', room);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Iterate all rooms to find where this socket was
        roomManager.rooms.forEach(room => {
            if (room.players.find(p => p.id === socket.id)) {
                roomManager.leaveRoom(room.id, socket.id);
                io.to(room.id).emit('room_updated', room);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
