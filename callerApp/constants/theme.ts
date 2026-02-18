export const COLORS = {
    primary: "#322554", // Deep Violet
    primaryLight: "#4A3878", // Lighter violet for hover/active states
    primaryDark: "#231A3D", // Darker violet for emphasis
    secondary: "#ff2e6e", // Pink/Red
    accent: "#E9296A", // Accent pink
    background: "#F8FAFC", // Slate 50
    card: "#FFFFFF",
    text: "#1E293B", // Slate 800
    textSecondary: "#64748B", // Slate 500
    textMuted: "#94A3B8", // Slate 400
    border: "#E2E8F0", // Slate 200
    success: "#10B981", // Emerald 500
    error: "#EF4444", // Red 500
    warning: "#F59E0B", // Amber 500
    info: "#3B82F6", // Blue 500
};

export const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    large: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const FONTS = {
    header: { fontSize: 24, fontWeight: "800" as "800", color: COLORS.text },
    subHeader: { fontSize: 18, fontWeight: "600" as "600", color: COLORS.text },
    body: { fontSize: 14, color: COLORS.textSecondary },
};
