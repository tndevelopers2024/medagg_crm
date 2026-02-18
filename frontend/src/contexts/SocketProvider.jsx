// src/contexts/SocketContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  initializeSocket,
  connectSocket,
  getSocket,
  setSocketToken,
} from "../utils/socket";

const SocketContext = createContext({ socket: null, isConnected: false });

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = initializeSocket();

    const onConnect = () => {
      setIsConnected(true);
      // sanity check: ask server who am i & what rooms
      s.emit("whoami", (info) => console.log("[socket] whoami", info));
    };
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // Explicit connect (reads token from localStorage by default)
    connectSocket();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  const value = useMemo(
    () => ({
      socket: getSocket(),
      isConnected,
      reconnectWithToken: (token) => connectSocket(token),
      setSocketToken,
    }),
    [isConnected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
