import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import io from "socket.io-client";
import axios, { AxiosInstance } from "axios";
import SendIntentAndroid from "react-native-send-intent";
import CallLogs, { CallLog } from "react-native-call-log";
import RNFS from "react-native-fs";
import { COLORS, FONTS, SHADOWS, SPACING } from "../constants/theme";
import RecordingStatusIndicator from "../components/RecordingStatusIndicator";
import CallRecordingService from "../services/CallRecordingService";
import SystemRecordingService from "../services/SystemRecordingService";
import LeadDetailsScreen from "./LeadDetailsScreen";
import { API_BASE, WS_BASE } from "../constants/config";
import { storage } from "../utils/storage";

interface Task {
  taskId: number;
  phoneNumber: string;
  leadId?: number;
}

interface Props {
  token: string;
  onLogout: () => void;
  navigation?: any;
}

const DashboardScreen: React.FC<Props> = ({ token, onLogout, navigation }) => {
  const [status, setStatus] = useState("Disconnected");
  const [lastTask, setLastTask] = useState<Task | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [callsToday, setCallsToday] = useState(0);
  const [showDetailsLeadId, setShowDetailsLeadId] = useState<number | null>(null);
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [recordingServiceActive, setRecordingServiceActive] = useState(false);
  const [recordingFolder, setRecordingFolder] = useState<string | null>(null);

  const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    const socket = io(WS_BASE, { transports: ["websocket"], auth: { token } });

    socket.on("connect", () => {
      setStatus("Connected");
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => setStatus("Disconnected"));

    socket.on("call:request", (newTask) => {
      console.log("New call task received:", newTask);
      setLastTask({
        taskId: newTask.taskId,
        phoneNumber: newTask.phoneNumber,
        leadId: newTask.leadId,
      });
      console.log("Showing lead details for:", newTask.phoneNumber);
      if (newTask.leadId) {
        setIsAutoCall(true);
        setShowDetailsLeadId(newTask.leadId);
      } else {
        checkAndDial(newTask);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const checkAndDial = async (task: Task) => {
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
      if (granted) {
        onCallPress(task);
      } else {
        console.log("CALL_PHONE permission not granted, waiting for user interaction");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchPending();
    initializeCallRecording();
    storage.getRecordingDir().then(dir => {
      if (dir) setRecordingFolder(dir);
    });
  }, []);

  const initializeCallRecording = async () => {
    try {
      const hasStoragePermissions = await SystemRecordingService.requestStoragePermissions();
      if (!hasStoragePermissions) {
        Alert.alert(
          'Storage Permission Required',
          'This app needs storage access to find and upload call recordings from your device.',
          [{ text: 'OK' }]
        );
        return;
      }
      setRecordingServiceActive(true);
    } catch (error) {
      console.error('[ERROR] Failed to initialize recording permissions:', error);
    }
  };

  const handleSelectRecordingFolder = async () => {
    try {
      const path = await SystemRecordingService.pickRecordingFolder();
      if (path) {
        await storage.saveRecordingDir(path);
        setRecordingFolder(path);
      }
    } catch (err) {
      console.error('Error selecting recording folder:', err);
      Alert.alert('Error', 'Failed to select recording folder');
    }
  };

  const handleClearRecordingFolder = async () => {
    await storage.removeRecordingDir();
    setRecordingFolder(null);
  };

  const fetchPending = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get("/calls/tasks/pending");
      setPendingTasks(res.data.data);
    } catch (err) {
      console.error("Fetch pending error:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const completeTask = async (
    task: Task,
    startedAt: Date,
    endedAt: Date,
    durationSec: number,
    outcome: string
  ) => {
    try {
      await api.patch(`/calls/tasks/${task.taskId}/complete`, {
        startedAt,
        endedAt,
        durationSec,
        outcome,
      });
      setLastTask(null);
      fetchPending();
      setCallsToday((prev) => prev + 1);
    } catch (err: any) {
      console.error("Complete task error:", err);
    }
  };

  const onCallPress = async (task: Task) => {
    try {
      console.log("Dialing...", task.phoneNumber);
      SendIntentAndroid.sendPhoneCall(task.phoneNumber, true);
      const callStartTime = Date.now();

      const target = task.phoneNumber.replace(/[^\d]/g, "").slice(-10);
      const checkInterval = setInterval(async () => {
        try {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
          );
          if (!granted) return;

          const logs = await CallLogs.load(10);
          const match = logs.find(
            (c: any) =>
              c.phoneNumber.replace(/[^\d]/g, "").slice(-10) === target &&
              c.type.toUpperCase() === "OUTGOING" &&
              Number(c.timestamp) > callStartTime
          );

          if (match) {
            console.log("Call log match found:", match);
            clearInterval(checkInterval);

            const durationSec = Number(match.duration || 0);
            const endedAt = new Date(Number(match.timestamp));
            const startedAt = new Date(endedAt.getTime() - durationSec * 1000);
            const outcome = durationSec > 0 ? "connected" : "no_answer";

            let recordingFilePath = '';
            let recordingDuration = durationSec;

            console.log("[Recording] Call ended. Searching for recording...");
            console.log("[Recording] Call start:", startedAt.toISOString(), "end:", endedAt.toISOString(), "duration:", durationSec, "s");

            if (recordingFolder) {
              await new Promise<void>(resolve => setTimeout(resolve, 3000));

              const retryDelays = [0, 3000, 5000, 8000];
              try {
                for (let attempt = 0; attempt < retryDelays.length; attempt++) {
                  if (retryDelays[attempt] > 0) {
                    console.log(`[Recording] Retry ${attempt + 1}, waiting ${retryDelays[attempt]}ms...`);
                    await new Promise<void>(resolve => setTimeout(resolve, retryDelays[attempt]));
                  }

                  const result = await SystemRecordingService.findRecordingInDirectory(
                    recordingFolder,
                    task.phoneNumber,
                    endedAt.getTime()
                  );

                  if (result) {
                    recordingFilePath = result;
                    console.log(`[Recording] Found on attempt ${attempt + 1}:`, recordingFilePath);
                    break;
                  }
                  console.log(`[Recording] Attempt ${attempt + 1}/${retryDelays.length}: not found yet`);
                }

                if (!recordingFilePath) {
                  console.warn("[Recording] Recording not found in selected folder after all attempts");
                }
              } catch (recErr: any) {
                console.error("[Recording] Error searching for recording:", recErr);
              }
            } else {
              console.warn("[Recording] No recording folder selected — skipping recording fetch");
            }

            if (recordingFilePath) {
              await new Promise<void>(resolve => setTimeout(resolve, 500));
              await uploadRecording(recordingFilePath, recordingDuration || durationSec, task);
            }

            await completeTask(task, startedAt, endedAt, durationSec, outcome);
          }
        } catch (err: any) {
          console.warn("Call log fetch error:", err.message);
        }
      }, 3000);
    } catch (err: any) {
      Alert.alert("Call failed", err.message);
    }
  };

  const uploadRecording = async (filePath: string, duration: number, task: Task) => {
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        console.error('Recording file not found at:', filePath);
        Alert.alert('Upload Error', 'Recording file not found. The recording may have been interrupted.');
        return;
      }

      const fileStat = await RNFS.stat(filePath);
      console.log('Recording file size:', fileStat.size, 'bytes');

      if (Number(fileStat.size) === 0) {
        console.error('Recording file is empty');
        Alert.alert('Upload Error', 'Recording file is empty. The call may not have been recorded.');
        return;
      }

      console.log('Reading recording as base64...');
      const base64Data = await RNFS.readFile(filePath, 'base64');
      console.log('Base64 length:', base64Data.length);

      const filename = `call_${task.taskId}_${Date.now()}.mp4`;

      console.log('Uploading recording via JSON to backend...');
      const response = await api.post('/calls/recordings/upload', {
        recordingBase64: base64Data,
        recordingFilename: filename,
        taskId: task.taskId.toString(),
        leadId: task.leadId?.toString() || '',
        duration: duration.toString(),
        phoneNumber: task.phoneNumber,
      });

      console.log('Upload response:', response.data);

      if (response.data.success) {
        Alert.alert('Recording Saved', `Duration: ${response.data.data?.duration || 0}s`);
      } else {
        Alert.alert('Upload Failed', response.data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Upload error:', err?.response?.data || err.message);
      Alert.alert('Upload Error', err?.response?.data?.error || err.message || 'Unknown error');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const requiredGranted =
        granted["android.permission.READ_CALL_LOG"] === PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.CALL_PHONE"] === PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.RECORD_AUDIO"] === PermissionsAndroid.RESULTS.GRANTED;

      if (Platform.Version >= 33) {
        const notifGranted = granted["android.permission.POST_NOTIFICATIONS"] === PermissionsAndroid.RESULTS.GRANTED;
        if (!notifGranted) {
          console.warn("POST_NOTIFICATIONS not granted - foreground service notification may not show");
        }
      }

      return requiredGranted;
    }
    return true;
  };

  const isConnected = status === "Connected";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Dark Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isConnected ? styles.statusPillActive : styles.statusPillInactive]}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ADE80' : '#F87171' }]} />
              <Text style={styles.statusPillText}>{status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
        
          <TouchableOpacity style={styles.headerIconBtn} onPress={onLogout}>
            <Text style={styles.headerIconText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loadingTasks} onRefresh={fetchPending} />}
      >
        {/* Recording Status */}
        <RecordingStatusIndicator visible={recordingServiceActive} />

        {/* Recording Folder Card */}
        <View style={styles.folderCard}>
          <View style={styles.folderRow}>
            <View style={styles.folderIconCircle}>
              <Text style={{ fontSize: 16, color: COLORS.primary, fontWeight: '800' }}>F</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.folderLabel} numberOfLines={1}>
                {recordingFolder || 'No folder selected'}
              </Text>
              {!recordingFolder && (
                <Text style={styles.folderHint}>Select your recording folder</Text>
              )}
            </View>
            <View style={styles.folderActions}>
              <TouchableOpacity style={styles.folderActionBtn} onPress={handleSelectRecordingFolder}>
                <Text style={styles.folderActionText}>{recordingFolder ? 'Change' : 'Select'}</Text>
              </TouchableOpacity>
              {recordingFolder && (
                <TouchableOpacity style={[styles.folderActionBtn, styles.folderActionBtnClear]} onPress={handleClearRecordingFolder}>
                  <Text style={[styles.folderActionText, { color: COLORS.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderTopColor: COLORS.primary }]}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{pendingTasks.length}</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.success }]}>
            <Text style={styles.statLabel}>Calls Today</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{callsToday}</Text>
          </View>
        </View>

        {/* Current Task */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Task</Text>
          <View style={styles.currentTaskCard}>
            {lastTask ? (
              <>
                <Text style={styles.currentTaskLabel}>Lead #{lastTask.leadId}</Text>
                <Text style={styles.currentTaskPhone}>{lastTask.phoneNumber}</Text>
                <TouchableOpacity
                  style={styles.callNowBtn}
                  onPress={async () => {
                    const hasPerm = await requestPermissions();
                    if (hasPerm) onCallPress(lastTask);
                    else Alert.alert("Permissions missing");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callNowText}>📞  Call Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyCurrentTask}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyCurrentText}>Waiting for calls...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending List</Text>
            <TouchableOpacity onPress={fetchPending}>
              <Text style={styles.linkText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {pendingTasks.map((t) => (
            <View key={t.taskId} style={styles.taskRow}>
              <View style={styles.taskAccent} />
              <TouchableOpacity
                style={styles.taskInfo}
                onPress={() => {
                  setLastTask(t);
                  setShowDetailsLeadId(t.leadId || null);
                }}
              >
                <Text style={styles.taskPhone}>{t.phoneNumber}</Text>
                <Text style={styles.taskSub}>Lead #{t.leadId}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.taskCallBtn}
                onPress={async () => {
                  const hasPerm = await requestPermissions();
                  if (hasPerm) {
                    setLastTask(t);
                    checkAndDial(t);
                  } else Alert.alert("Permissions missing");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>📞</Text>
              </TouchableOpacity>
            </View>
          ))}
          {pendingTasks.length === 0 && (
            <View style={styles.emptyPending}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>✅</Text>
              <Text style={styles.emptyPendingText}>No pending tasks</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {showDetailsLeadId && (
        <View style={StyleSheet.absoluteFill}>
          <LeadDetailsScreen
            leadId={showDetailsLeadId}
            token={token}
            autoCall={isAutoCall}
            onBack={() => {
              setShowDetailsLeadId(null);
              setIsAutoCall(false);
            }}
            onCall={async () => {
              setShowDetailsLeadId(null);
              if (lastTask && lastTask.leadId === showDetailsLeadId) {
                const hasPerm = await requestPermissions();
                if (hasPerm) onCallPress(lastTask);
                else Alert.alert("Permissions missing");
              }
            }}
          />
        </View>
      )}
    </View>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ── Header ──
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: "rgba(74,222,128,0.2)",
  },
  statusPillInactive: {
    backgroundColor: "rgba(248,113,113,0.2)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconText: {
    fontSize: 18,
  },
  // ── Scroll ──
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // ── Folder Card ──
  folderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  folderLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  folderHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  folderActions: {
    flexDirection: "row",
    gap: 6,
  },
  folderActionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  folderActionBtnClear: {
    borderColor: COLORS.error + "40",
    backgroundColor: COLORS.error + "08",
  },
  folderActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  // ── Stats ──
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 3,
    ...SHADOWS.small,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  // ── Sections ──
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
  },
  // ── Current Task ──
  currentTaskCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 24,
    ...SHADOWS.large,
  },
  currentTaskLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  currentTaskPhone: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  callNowBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  callNowText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyCurrentTask: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyCurrentText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  // ── Pending Tasks ──
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  taskAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
  },
  taskInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
  },
  taskPhone: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  taskSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  taskCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyPending: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyPendingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
});
