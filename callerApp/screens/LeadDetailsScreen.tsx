import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import axios from "axios";
import { COLORS, FONTS, SHADOWS, SPACING } from "../constants/theme";
import { API_BASE } from "../constants/config";

interface LeadDetailsScreenProps {
    leadId: number;
    token: string;
    autoCall?: boolean;
    onBack: () => void;
    onCall: () => void;
}

const LeadDetailsScreen: React.FC<LeadDetailsScreenProps> = ({
    leadId,
    token,
    autoCall,
    onBack,
    onCall,
}) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [autoDialCountdown, setAutoDialCountdown] = useState<number | null>(null);

    const api = axios.create({
        baseURL: API_BASE,
        headers: { Authorization: `Bearer ${token}` },
    });

    useEffect(() => {
        fetchDetails();
    }, [leadId]);

    useEffect(() => {
        if (autoCall && data && !loading) {
            setAutoDialCountdown(3);
            const timer = setInterval(() => {
                setAutoDialCountdown((prev) => {
                    if (prev === null || prev <= 1) {
                        clearInterval(timer);
                        onCall();
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [autoCall, data, loading]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/leads/${leadId}`);
            setData(res.data);
        } catch (err) {
            console.error("Fetch lead details error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!data || !data.lead) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
                <Text style={styles.errorText}>Failed to load lead details</Text>
                <TouchableOpacity style={styles.backBtnAlt} onPress={onBack}>
                    <Text style={styles.backBtnAltText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { lead, activity } = data;

    const displayName = (() => {
        if (lead.name) return lead.name;
        if (lead.fullName) return lead.fullName;
        const nameField = lead.fieldData?.find((f: any) =>
            ['full_name', 'name', 'fullname', 'patient_name'].includes(f.name.toLowerCase())
        );
        if (nameField && nameField.values?.[0]) return nameField.values[0];
        return "Unnamed Lead";
    })();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

            {/* Dark Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lead Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Auto-dial alert */}
                {autoDialCountdown !== null && (
                    <View style={styles.autoDialBanner}>
                        <Text style={styles.autoDialText}>Auto-dialing in {autoDialCountdown}s...</Text>
                    </View>
                )}

                {/* Patient Info Card */}
                <View style={styles.patientCard}>
                    <Text style={styles.patientName}>{displayName}</Text>
                    <Text style={styles.patientId}>ID: #{lead.leadId}</Text>
                    <View style={styles.phoneRow}>
                        <View style={styles.phoneIcon}>
                            <Text style={{ fontSize: 14 }}>📞</Text>
                        </View>
                        <Text style={styles.patientPhone}>{lead.phone}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: COLORS.info + '15' }]}>
                            <Text style={[styles.badgeText, { color: COLORS.info }]}>{lead.status}</Text>
                        </View>
                        {lead.source && (
                            <View style={[styles.badge, { backgroundColor: COLORS.warning + '15' }]}>
                                <Text style={[styles.badgeText, { color: COLORS.warning }]}>{lead.source}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Field Data */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lead Information</Text>
                    <View style={styles.fieldsCard}>
                        {lead.fieldData && lead.fieldData.map((field: any, idx: number) => (
                            <View
                                key={idx}
                                style={[
                                    styles.fieldRow,
                                    idx % 2 === 0 && styles.fieldRowAlt,
                                    idx === lead.fieldData.length - 1 && { borderBottomWidth: 0 },
                                ]}
                            >
                                <Text style={styles.fieldLabel}>{field.name}</Text>
                                <Text style={styles.fieldValue}>{field.values?.join(", ") || "—"}</Text>
                            </View>
                        ))}
                        {(!lead.fieldData || lead.fieldData.length === 0) && (
                            <View style={styles.emptySection}>
                                <Text style={{ fontSize: 24, marginBottom: 6 }}>📋</Text>
                                <Text style={styles.emptyText}>No field data available</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Activity Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.timelineCard}>
                        {activity && activity.length > 0 ? (
                            activity.map((item: any, idx: number) => (
                                <View key={idx} style={styles.timelineItem}>
                                    {/* Vertical connector line */}
                                    {idx < activity.length - 1 && <View style={styles.timelineLine} />}
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineAction}>{item.action}</Text>
                                        <Text style={styles.timelineNote}>{item.note || "No notes"}</Text>
                                        <Text style={styles.timelineTime}>
                                            {new Date(item.createdAt).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptySection}>
                                <Text style={{ fontSize: 24, marginBottom: 6 }}>📜</Text>
                                <Text style={styles.emptyText}>No recent activity</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.callBtn} onPress={onCall} activeOpacity={0.8}>
                    <Text style={styles.callBtnText}>📞  CALL NOW</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LeadDetailsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    // ── Header ──
    header: {
        backgroundColor: COLORS.primary,
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    backArrow: {
        fontSize: 24,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    // ── Auto-dial ──
    autoDialBanner: {
        backgroundColor: COLORS.warning + "18",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.warning + "40",
        alignItems: "center",
    },
    autoDialText: {
        color: COLORS.warning,
        fontWeight: "700",
        fontSize: 14,
    },
    // ── Patient Card ──
    patientCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        ...SHADOWS.medium,
    },
    patientName: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
    },
    patientId: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
    },
    phoneIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.primary + "12",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    patientPhone: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.primary,
    },
    badgeRow: {
        flexDirection: "row",
        marginTop: 14,
        gap: 8,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    // ── Sections ──
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 10,
    },
    // ── Fields Table ──
    fieldsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        overflow: "hidden",
        ...SHADOWS.small,
    },
    fieldRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    fieldRowAlt: {
        backgroundColor: COLORS.background,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        flex: 1,
    },
    fieldValue: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
    },
    // ── Timeline ──
    timelineCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 16,
        ...SHADOWS.small,
    },
    timelineItem: {
        flexDirection: "row",
        paddingBottom: 20,
        position: "relative",
    },
    timelineLine: {
        position: "absolute",
        left: 5,
        top: 14,
        bottom: 0,
        width: 2,
        backgroundColor: COLORS.border,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        marginRight: 14,
        marginTop: 4,
        borderWidth: 2,
        borderColor: COLORS.primary + "30",
    },
    timelineContent: {
        flex: 1,
    },
    timelineAction: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.text,
    },
    timelineNote: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 3,
    },
    timelineTime: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    // ── Empty ──
    emptySection: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    // ── Footer ──
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 28,
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    callBtn: {
        backgroundColor: COLORS.success,
        borderRadius: 14,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        ...SHADOWS.medium,
    },
    callBtnText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    // ── Error State ──
    errorText: {
        fontSize: 15,
        color: COLORS.error,
        marginBottom: 20,
        fontWeight: "600",
    },
    backBtnAlt: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    backBtnAltText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
});
