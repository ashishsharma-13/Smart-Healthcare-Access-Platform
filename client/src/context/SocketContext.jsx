import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [incomingEmergency, setIncomingEmergency] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to real-time server with id:', newSocket.id);
    });

    newSocket.on('emergency:incoming_beep', (emergencyData) => {
      console.log('[Socket Alert] Incoming Emergency Beep Received!', emergencyData);
      setIncomingEmergency(emergencyData);
      // Play alert chime
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const clearIncomingEmergency = () => setIncomingEmergency(null);

  return (
    <SocketContext.Provider value={{ socket, incomingEmergency, clearIncomingEmergency }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

