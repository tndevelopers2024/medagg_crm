import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { Recorder } from '@react-native-community/audio-toolkit';
import { COLORS } from '../constants/theme';

interface CallRecorderProps {
    taskId: number;
    phoneNumber: string;
    autoStart?: boolean;
    onRecordingComplete: (filePath: string, duration: number) => void;
}

export interface CallRecorderHandle {
    stopRecording: () => Promise<{ filePath: string; duration: number }>;
}

const CallRecorder = forwardRef((props: CallRecorderProps, ref: React.Ref<CallRecorderHandle>) => {
    const {
        taskId,
        autoStart = false,
        onRecordingComplete,
    } = props;
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
    const [recorder, setRecorder] = useState<Recorder | null>(null);

    const hasStarted = React.useRef(false);

    // Auto-start effect
    useEffect(() => {
        if (autoStart && !isRecording && !hasStarted.current) {
            hasStarted.current = true;
            startRecording();
        }
    }, [autoStart, isRecording]);

    useEffect(() => {
        return () => {
            if (timer) {
                clearInterval(timer);
            }
            if (recorder) {
                try {
                    recorder.destroy();
                } catch (e) {
                    console.warn('Cleanup error:', e);
                }
            }
        };
    }, [timer, recorder]);

    const requestAudioPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'App needs access to your microphone to record calls.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    },
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const startRecording = async () => {
        const hasPermission = await requestAudioPermission();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Cannot record audio without microphone permission');
            return;
        }

        try {
            console.log('CallRecorder: Starting audio-toolkit recording...');
            const filename = `call_${taskId}_${Date.now()}.mp4`;

            const rec = new Recorder(filename, {
                bitrate: 256000,
                channels: 2,
                sampleRate: 44100,
                quality: 'max',
                format: 'mp4',
                encoder: 'aac',
            });

            rec.prepare((err: any) => {
                if (err) {
                    console.error('Prepare error:', err);
                    Alert.alert('Recording Error', 'Failed to prepare recorder: ' + err.message);
                    return;
                }

                rec.record((err: any) => {
                    if (err) {
                        console.error('Record error:', err);
                        Alert.alert('Recording Error', 'Failed to start recording: ' + err.message);
                        return;
                    }

                    console.log('CallRecorder: Recording started successfully');
                    setRecorder(rec);
                    setIsRecording(true);
                    setDuration(0);

                    const intervalId = setInterval(() => {
                        setDuration((prev) => prev + 1);
                    }, 1000);
                    setTimer(intervalId);
                });
            });
        } catch (error: any) {
            console.error('Start recording error:', error);
            Alert.alert('Recording Failure', error.message || 'Unknown error starting recorder');
        }
    };

    // Exposed method for parent to stop recording
    useImperativeHandle(ref, () => ({
        stopRecording: () => {
            return new Promise(async (resolve, reject) => {
                try {
                    if (!recorder) {
                        console.warn('No recorder instance to stop');
                        resolve({ filePath: '', duration: 0 });
                        return;
                    }

                    recorder.stop((err: any) => {
                        if (err) {
                            console.error('Stop recording error:', err);
                            reject(err);
                            return;
                        }

                        const filePath = recorder.fsPath || '';
                        console.log('CallRecorder: Recording stopped. Path:', filePath);

                        setIsRecording(false);
                        if (timer) {
                            clearInterval(timer);
                            setTimer(null);
                        }

                        const currentDuration = duration;
                        onRecordingComplete(filePath, currentDuration);

                        // Cleanup
                        try {
                            recorder.destroy();
                        } catch (e) {
                            console.warn('Destroy error:', e);
                        }
                        setRecorder(null);
                        setDuration(0);

                        resolve({ filePath, duration: currentDuration });
                    });
                } catch (err) {
                    console.error('Stop recording error:', err);
                    reject(err);
                }
            });
        }
    }));

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {isRecording ? (
                <View style={styles.recordingContainer}>
                    <View style={styles.dot} />
                    <Text style={styles.recordingText}>
                        Call Recording... {formatTime(duration)}
                    </Text>
                </View>
            ) : (
                <Text style={styles.waitingText}>Initializing Call Recorder...</Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginVertical: 12,
    },
    recordingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#FFEBEB',
        borderRadius: 20,
        paddingHorizontal: 16,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.error,
        marginRight: 8,
    },
    recordingText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 14,
    },
    waitingText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
});

export default CallRecorder;
