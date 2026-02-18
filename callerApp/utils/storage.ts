import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const RECORDING_DIR_KEY = '@recording_directory';

export const storage = {
    saveToken: async (token: string) => {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
            console.error('Error saving token', e);
        }
    },
    getToken: async () => {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (e) {
            console.error('Error getting token', e);
            return null;
        }
    },
    removeToken: async () => {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (e) {
            console.error('Error removing token', e);
        }
    },

    saveRecordingDir: async (path: string) => {
        try {
            await AsyncStorage.setItem(RECORDING_DIR_KEY, path);
        } catch (e) {
            console.error('Error saving recording directory', e);
        }
    },
    getRecordingDir: async (): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(RECORDING_DIR_KEY);
        } catch (e) {
            console.error('Error getting recording directory', e);
            return null;
        }
    },
    removeRecordingDir: async () => {
        try {
            await AsyncStorage.removeItem(RECORDING_DIR_KEY);
        } catch (e) {
            console.error('Error removing recording directory', e);
        }
    },
};
