import { Text, View, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Redirect } from "expo-router";

export default function Index() {
    return (
        <View style={styles.container}>
            <AuthLoading>
                <ActivityIndicator size="large" color="#007AFF" />
            </AuthLoading>

            <Unauthenticated>
                <View style={styles.authContainer}>
                    <Image source={require("../assets/images/adaptive-icon.png")} style={styles.logo} />
                    <Text style={styles.title}>AI Trip Generator</Text>
                    <Text style={styles.subtitle}>Plan your dream vacation in seconds.</Text>
                    
                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={() => authClient.signIn.anonymous()}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </Unauthenticated>

            <Authenticated>
                <Redirect href="/(tabs)" />
            </Authenticated>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
        justifyContent: "center",
        alignItems: "center",
    },
    authContainer: {
        width: "100%",
        padding: 20,
        alignItems: "center",
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
        borderRadius: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#1C1C1E",
    },
    subtitle: {
        fontSize: 18,
        color: "#8E8E93",
        textAlign: "center",
        marginBottom: 40,
    },
    button: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: "100%",
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
});
