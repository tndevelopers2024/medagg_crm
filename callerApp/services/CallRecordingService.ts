import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { CallRecorderModule } = NativeModules;

export interface DeviceCapability {
    manufacturer: string;
    brand: string;
    model: string;
    androidVersion: number;
    supportsVoiceCall: boolean;
    requiresSpeakerFallback: boolean;
    preferredSources: string[];
}

export interface RecordingStatus {
    isServiceRunning: boolean;
    lastRecordingPath: string | null;
}

export interface PermissionStatus {
    hasRecordAudio: boolean;
    hasReadPhoneState: boolean;
    hasAllRequired: boolean;
}

class CallRecordingService {

    /**
     * Request all required permissions
     */
    async requestPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return false;
        }

        try {
            const permissionsToRequest = [
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            ];

            // Add POST_NOTIFICATIONS for Android 13+
            if (Platform.Version >= 33) {
                permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            }

            const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

            const allGranted =
                granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED &&
                granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED &&
                granted[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === PermissionsAndroid.RESULTS.GRANTED;

            if (Platform.Version >= 33) {
                const notifGranted = granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
                if (!notifGranted) {
                    console.warn('POST_NOTIFICATIONS not granted - service notification may not show');
                }
            }

            return allGranted;
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
        }
    }

    /**
     * Check permission status
     */
    async checkPermissions(): Promise<PermissionStatus> {
        try {
            return await CallRecorderModule.checkPermissions();
        } catch (error) {
            console.error('Error checking permissions:', error);
            return {
                hasRecordAudio: false,
                hasReadPhoneState: false,
                hasAllRequired: false,
            };
        }
    }

    /**
     * Start monitoring calls (starts foreground service)
     */
    async startMonitoring(): Promise<{ success: boolean; message: string }> {
        try {
            // Check permissions first
            const permStatus = await this.checkPermissions();
            if (!permStatus.hasAllRequired) {
                throw new Error('Required permissions not granted');
            }

            const result = await CallRecorderModule.startMonitoring();
            console.log('Call monitoring started:', result);
            return result;
        } catch (error: any) {
            console.error('Error starting monitoring:', error);
            throw error;
        }
    }

    /**
     * Stop monitoring calls (stops foreground service)
     */
    async stopMonitoring(): Promise<{ success: boolean; message: string }> {
        try {
            const result = await CallRecorderModule.stopMonitoring();
            console.log('Call monitoring stopped:', result);
            return result;
        } catch (error: any) {
            console.error('Error stopping monitoring:', error);
            throw error;
        }
    }

    /**
     * Get current recording status
     */
    async getRecordingStatus(): Promise<RecordingStatus> {
        try {
            return await CallRecorderModule.getRecordingStatus();
        } catch (error) {
            console.error('Error getting status:', error);
            return {
                isServiceRunning: false,
                lastRecordingPath: null,
            };
        }
    }

    /**
     * Get last recording file path
     */
    async getLastRecordingPath(): Promise<string | null> {
        try {
            const result = await CallRecorderModule.getLastRecordingPath();
            return result.filePath;
        } catch (error) {
            console.error('Error getting last recording:', error);
            return null;
        }
    }

    /**
     * Get device capabilities
     */
    async getDeviceCapabilities(): Promise<DeviceCapability | null> {
        try {
            return await CallRecorderModule.getDeviceCapabilities();
        } catch (error) {
            console.error('Error getting capabilities:', error);
            return null;
        }
    }
}

export default new CallRecordingService();
