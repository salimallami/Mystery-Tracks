import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room } from '../types';

interface SocketContextType {
    socket: Socket | null;
    room: Room | null;
    setRoom: (room: Room | null) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    room: null,
    setRoom: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [room, setRoom] = useState<Room | null>(null);

    useEffect(() => {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const newSocket = io(serverUrl);
        setSocket(newSocket);

        newSocket.on('room_updated', (updatedRoom: Room) => {
            setRoom(updatedRoom);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, room, setRoom }}>
            {children}
        </SocketContext.Provider>
    );
};
