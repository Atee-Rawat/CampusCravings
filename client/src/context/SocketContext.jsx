import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true
        });

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated]);

    // Join order room for tracking
    const joinOrderRoom = useCallback((orderId) => {
        if (socket && isConnected) {
            socket.emit('join-order-room', { orderId });
            console.log(`Joined order room: ${orderId}`);
        }
    }, [socket, isConnected]);

    // Leave order room
    const leaveOrderRoom = useCallback((orderId) => {
        if (socket && isConnected) {
            socket.emit('leave-order-room', { orderId });
            console.log(`Left order room: ${orderId}`);
        }
    }, [socket, isConnected]);

    // Join outlet room (for admin)
    const joinOutletRoom = useCallback((outletId) => {
        if (socket && isConnected) {
            socket.emit('join-outlet-room', { outletId });
            console.log(`Joined outlet room: ${outletId}`);
        }
    }, [socket, isConnected]);

    // Leave outlet room
    const leaveOutletRoom = useCallback((outletId) => {
        if (socket && isConnected) {
            socket.emit('leave-outlet-room', { outletId });
            console.log(`Left outlet room: ${outletId}`);
        }
    }, [socket, isConnected]);

    // Request timer sync
    const requestTimerSync = useCallback((orderId) => {
        if (socket && isConnected) {
            socket.emit('request-timer-sync', { orderId });
        }
    }, [socket, isConnected]);

    // Subscribe to socket events
    const on = useCallback((event, callback) => {
        if (socket) {
            socket.on(event, callback);
            return () => socket.off(event, callback);
        }
        return () => { };
    }, [socket]);

    // Unsubscribe from socket events
    const off = useCallback((event, callback) => {
        if (socket) {
            socket.off(event, callback);
        }
    }, [socket]);

    const value = {
        socket,
        isConnected,
        joinOrderRoom,
        leaveOrderRoom,
        joinOutletRoom,
        leaveOutletRoom,
        requestTimerSync,
        on,
        off
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
