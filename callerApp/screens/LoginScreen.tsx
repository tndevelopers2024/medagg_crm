import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  ScrollView,
} from "react-native";
import axios from "axios";
import { COLORS, FONTS, SHADOWS, SPACING } from "../constants/theme";
import { API_BASE } from "../constants/config";

interface Props {
  onLogin: (token: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/auth/login`, { email, password });
      onLogin(r.data.token);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Dark Top Section */}
          <View style={styles.darkSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logo}
              />
            </View>
            <Text style={styles.appName}>MedAgg Caller</Text>
            <Text style={styles.subtitle}>Sign in to start calling</Text>
          </View>

          {/* White Form Card — overlaps dark section */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Text style={styles.inputIconText}>@</Text>
                </View>
                <TextInput
                  placeholder="name@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Text style={styles.inputIconText}>*</Text>
                </View>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={login}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Powered by Prasanna Works
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  darkSection: {
    backgroundColor: COLORS.primary,
    paddingTop: 80,
    paddingBottom: 80,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  logo: {
    width: 64,
    height: 64,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: -48,
    ...SHADOWS.large,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  inputIcon: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  inputIconText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
