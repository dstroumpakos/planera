// BOOT_01: Module load start
console.log("[BOOT_01] _layout.tsx module loading...");

import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

console.log("[BOOT_02] React Native imports loaded");

import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";

console.log("[BOOT_03] Convex and Expo Router loaded");

import { ThemeProvider } from "@/lib/ThemeContext";

console.log("[BOOT_04] ThemeProvider loaded");

// Platform-specific import
// On native, this resolves to ConvexAuthProvider.native.tsx
// On web, this resolves to ConvexAuthProvider.tsx (uses better-auth)
import { ConvexNativeAuthProvider } from "@/lib/ConvexAuthProvider";

console.log("[BOOT_05] ConvexNativeAuthProvider loaded");

// Environment validation
function validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
        errors.push("EXPO_PUBLIC_CONVEX_URL is not set");
    }
    
    if (!process.env.EXPO_PUBLIC_CONVEX_SITE_URL) {
        errors.push("EXPO_PUBLIC_CONVEX_SITE_URL is not set");
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

// Error screen for missing environment
function EnvironmentError({ errors }: { errors: string[] }) {
    return (
        <View style={envStyles.container}>
            <Text style={envStyles.title}>Configuration Error</Text>
            <Text style={envStyles.subtitle}>
                The app is missing required configuration:
            </Text>
            {errors.map((error, index) => (
                <Text key={index} style={envStyles.error}>
                    • {error}
                </Text>
            ))}
            <Text style={envStyles.hint}>
                Please check your environment variables.
            </Text>
        </View>
    );
}

const envStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#FFF8E7",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1a1a1a",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 16,
        textAlign: "center",
    },
    error: {
        fontSize: 14,
        color: "#d32f2f",
        marginBottom: 8,
    },
    hint: {
        fontSize: 14,
        color: "#666",
        marginTop: 16,
        textAlign: "center",
    },
});

// Create Convex client with error handling
let convex: ConvexReactClient | null = null;
try {
    if (process.env.EXPO_PUBLIC_CONVEX_URL) {
        convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL, {
            unsavedChangesWarning: false,
        });
    }
} catch (error) {
    console.error("[App] Failed to create Convex client:", error);
}

export default function RootLayout() {
    const [envCheck, setEnvCheck] = useState<{ valid: boolean; errors: string[] } | null>(null);

    useEffect(() => {
        // Validate environment on mount
        const result = validateEnvironment();
        setEnvCheck(result);
        
        if (!result.valid) {
            console.error("[App] Environment validation failed:", result.errors);
        }
    }, []);

    // Show loading while checking environment
    if (envCheck === null) {
        return (
            <View style={{ flex: 1, backgroundColor: "#FFF8E7" }} />
        );
    }

    // Show error if environment is invalid
    if (!envCheck.valid || !convex) {
        return <EnvironmentError errors={envCheck.errors} />;
    }

    // Render app with unified auth provider
    // ConvexNativeAuthProvider resolves to:
    // - Native: lib/ConvexAuthProvider.native.tsx (no better-auth imports)
    // - Web: lib/ConvexAuthProvider.tsx (uses @convex-dev/better-auth/react)
    return (
        <ConvexNativeAuthProvider client={convex}>
            <ThemeProvider>
                <Stack screenOptions={{ headerShown: false }} />
            </ThemeProvider>
        </ConvexNativeAuthProvider>
    );
}
