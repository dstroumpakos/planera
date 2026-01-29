// BOOT_01: Module load start
console.log("[BOOT_01] _layout.tsx module loading...");

import { useEffect, useState, useRef } from "react";
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

// Environment validation - safe at module scope (just reads process.env)
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

console.log("[BOOT_06] Module scope complete - no native calls made");

// CRITICAL: Do NOT create Convex client at module scope!
// This will be done inside the component after mount.

export default function RootLayout() {
    console.log("[BOOT_07] RootLayout function called");
    
    const [envCheck, setEnvCheck] = useState<{ valid: boolean; errors: string[] } | null>(null);
    const [convex, setConvex] = useState<ConvexReactClient | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const initRef = useRef(false);

    useEffect(() => {
        // Prevent double initialization in strict mode
        if (initRef.current) return;
        initRef.current = true;
        
        console.log("[BOOT_08] RootLayout useEffect - initializing...");
        
        // Validate environment
        const result = validateEnvironment();
        setEnvCheck(result);
        
        if (!result.valid) {
            console.error("[BOOT_08a] Environment validation failed:", result.errors);
            return;
        }
        
        console.log("[BOOT_09] Environment valid, creating Convex client...");
        
        // Create Convex client inside useEffect (after mount)
        try {
            const client = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
                unsavedChangesWarning: false,
            });
            setConvex(client);
            console.log("[BOOT_10] Convex client created successfully");
        } catch (error) {
            console.error("[BOOT_10_ERROR] Failed to create Convex client:", error);
            setInitError(error instanceof Error ? error.message : "Unknown error");
        }
    }, []);

    // Show loading while checking environment
    if (envCheck === null || (envCheck.valid && convex === null && !initError)) {
        console.log("[BOOT] Showing loading screen...");
        return (
            <View style={{ flex: 1, backgroundColor: "#FFF8E7", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#666", fontSize: 16 }}>Loading...</Text>
            </View>
        );
    }

    // Show error if environment is invalid
    if (!envCheck.valid) {
        console.log("[BOOT] Showing environment error screen");
        return <EnvironmentError errors={envCheck.errors} />;
    }

    // Show error if Convex client failed to create
    if (initError || !convex) {
        console.log("[BOOT] Showing init error screen");
        return <EnvironmentError errors={[initError || "Failed to initialize app"]} />;
    }

    console.log("[BOOT] Rendering app with providers");
    
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
