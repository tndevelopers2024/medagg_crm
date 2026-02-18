import { Platform } from "react-native";

// Use the actual local IP to allow access from physical devices on the same network
const LOCAL_IP = "192.168.0.112";
const PORT = "5013";

export const API_BASE = `https://medagg.online/api/v1`;
export const WS_BASE = `https://medagg.online`; // Socket.io base
