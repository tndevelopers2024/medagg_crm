import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { CallRecorderModule } = NativeModules;

export interface SystemRecordingResult {
    filePath: string | null;
    found: boolean;
    attempts?: number;
}

export interface SystemRecordingCapability {
    hasCapability: boolean;
    directories: string[];
}

class SystemRecordingService {

    /**
     * Find system call recording for a specific call
     * @param phoneNumber Phone number of the call
     * @param callTimestamp Timestamp when call ended (in milliseconds)
     * @returns Recording file path if found, null otherwise
     */
    async findRecording(phoneNumber: string, callTimestamp: number): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null;
        }

        try {
            const result: SystemRecordingResult = await CallRecorderModule.findSystemRecording(
                phoneNumber,
                callTimestamp
            );

            if (result.found && result.filePath) {
                console.log('✓ System recording found:', result.filePath);
                return result.filePath;
            } else {
                console.log('✗ No system recording found');
                return null;
            }
        } catch (error) {
            console.error('Error finding system recording:', error);
            return null;
        }
    }

    /**
     * Find system call recording with native-level retry logic
     * Triggers MediaStore scan between attempts for better OEM file indexing
     * @param phoneNumber Phone number of the call
     * @param callTimestamp Timestamp when call ended (in milliseconds)
     * @param maxAttempts Number of retry attempts (default 4)
     * @returns Recording file path if found, null otherwise
     */
    async findRecordingWithRetry(phoneNumber: string, callTimestamp: number, maxAttempts: number = 4): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null;
        }

        try {
            const result: SystemRecordingResult = await CallRecorderModule.findSystemRecordingWithRetry(
                phoneNumber,
                callTimestamp,
                maxAttempts
            );

            if (result.found && result.filePath) {
                console.log(`[SystemRecording] Found after ${result.attempts} attempt(s):`, result.filePath);
                return result.filePath;
            } else {
                console.log(`[SystemRecording] Not found after ${result.attempts} attempts`);
                return null;
            }
        } catch (error) {
            console.error('[SystemRecording] Error in findRecordingWithRetry:', error);
            return null;
        }
    }

    /**
     * Trigger MediaStore scan on known recording directories
     */
    async triggerMediaScan(): Promise<void> {
        if (Platform.OS !== 'android') {
            return;
        }

        try {
            await CallRecorderModule.triggerMediaScan();
            console.log('[SystemRecording] MediaStore scan triggered');
        } catch (error) {
            console.error('[SystemRecording] Error triggering MediaStore scan:', error);
        }
    }

    /**
     * Check if device has system recording capability
     */
    async hasRecordingCapability(): Promise<SystemRecordingCapability> {
        if (Platform.OS !== 'android') {
            return { hasCapability: false, directories: [] };
        }

        try {
            return await CallRecorderModule.hasSystemRecordingCapability();
        } catch (error) {
            console.error('Error checking recording capability:', error);
            return { hasCapability: false, directories: [] };
        }
    }

    /**
     * Request storage permissions needed to access recordings
     */
    async requestStoragePermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return false;
        }

        try {
            // Android 13+ uses READ_MEDIA_AUDIO
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                // Android 12 and below use READ_EXTERNAL_STORAGE
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
        } catch (error) {
            console.error('Error requesting storage permissions:', error);
            return false;
        }
    }

    /**
     * Launch native folder picker (SAF) and return selected directory path
     */
    async pickRecordingFolder(): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null;
        }

        try {
            const result = await CallRecorderModule.pickRecordingFolder();
            if (result) {
                console.log('[SystemRecording] User picked folder:', result);
            } else {
                console.log('[SystemRecording] User cancelled folder picker');
            }
            return result;
        } catch (error) {
            console.error('[SystemRecording] Error picking folder:', error);
            return null;
        }
    }

    /**
     * Search ONLY a specific directory for a matching recording
     */
    async findRecordingInDirectory(dirPath: string, phoneNumber: string, callTimestamp: number): Promise<string | null> {
        if (Platform.OS !== 'android') {
            return null;
        }

        try {
            const result: SystemRecordingResult = await CallRecorderModule.findRecordingInDirectory(
                dirPath,
                phoneNumber,
                callTimestamp
            );

            if (result.found && result.filePath) {
                console.log('[SystemRecording] Found in user directory:', result.filePath);
                return result.filePath;
            }
            return null;
        } catch (error) {
            console.error('[SystemRecording] Error searching user directory:', error);
            return null;
        }
    }

    /**
     * Get all system call recordings
     */
    async getAllRecordings(): Promise<string[]> {
        if (Platform.OS !== 'android') {
            return [];
        }

        try {
            const result = await CallRecorderModule.getAllRecordings();
            return result.recordings || [];
        } catch (error) {
            console.error('Error getting all recordings:', error);
            return [];
        }
    }
}

export default new SystemRecordingService();
