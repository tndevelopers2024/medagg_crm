import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import CallRecordingService from '../services/CallRecordingService';

interface RecordingStatusIndicatorProps {
    visible?: boolean;
}

const RecordingStatusIndicator: React.FC<RecordingStatusIndicatorProps> = ({ visible = true }) => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState<string>('');

    useEffect(() => {
        loadStatus();
        loadDeviceInfo();

        const interval = setInterval(loadStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadStatus = async () => {
        try {
            const status = await CallRecordingService.getRecordingStatus();
            setIsServiceRunning(status.isServiceRunning);
        } catch (error) {
            console.error('Error loading status:', error);
        }
    };

    const loadDeviceInfo = async () => {
        try {
            const capability = await CallRecordingService.getDeviceCapabilities();
            if (capability) {
                const sources = capability.preferredSources.join(', ');
                setDeviceInfo(`${capability.manufacturer} ${capability.model} - Sources: ${sources}`);
            }
        } catch (error) {
            console.error('Error loading device info:', error);
        }
    };

    if (!visible) return null;

    const isActive = isServiceRunning;

    return (
        <View style={[styles.container, isActive ? styles.activeContainer : styles.inactiveContainer]}>
            <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusText}>
                {isActive ? 'Recording Active' : 'Recording Inactive'}
            </Text>
            {deviceInfo ? (
                <Text style={styles.deviceText} numberOfLines={1}>{deviceInfo}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    activeContainer: {
        backgroundColor: '#E8F5E9',
    },
    inactiveContainer: {
        backgroundColor: '#FFF3E0',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: SPACING.sm,
    },
    dotActive: {
        backgroundColor: COLORS.success,
    },
    dotInactive: {
        backgroundColor: COLORS.warning,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text,
    },
    deviceText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
        flex: 1,
    },
});

export default RecordingStatusIndicator;
