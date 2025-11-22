import { Text, View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
    const [isEmailAuth, setIsEmailAuth] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async () => {
        if (!email || !password || (isSignUp && !name)) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await authClient.signUp.email({ email, password, name });
            } else {
                await authClient.signIn.email({ email, password });
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await authClient.signIn.social({ provider: "google" });
        } catch (error: any) {
            Alert.alert("Error", "Google sign in failed");
        }
    };

    return (
        <View style={styles.container}>
            <AuthLoading>
                <ActivityIndicator size="large" color="#007AFF" />
            </AuthLoading>

            <Unauthenticated>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.authContainer}>
                            <Image source={require("../assets/images/adaptive-icon.png")} style={styles.logo} />
                            <Text style={styles.title}>AI Trip Generator</Text>
                            <Text style={styles.subtitle}>Plan your dream vacation in seconds.</Text>
                            
                            {isEmailAuth ? (
                                <View style={styles.formContainer}>
                                    {isSignUp && (
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Full Name"
                                            value={name}
                                            onChangeText={setName}
                                            autoCapitalize="words"
                                        />
                                    )}
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                    
                                    <TouchableOpacity 
                                        style={styles.button} 
                                        onPress={handleEmailAuth}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text style={styles.buttonText}>
                                                {isSignUp ? "Sign Up" : "Sign In"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
                                        <Text style={styles.switchText}>
                                            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setIsEmailAuth(false)} style={styles.backButton}>
                                        <Text style={styles.backText}>Back to options</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.optionsContainer}>
                                    <TouchableOpacity 
                                        style={[styles.button, styles.googleButton]} 
                                        onPress={handleGoogleSignIn}
                                    >
                                        <Ionicons name="logo-google" size={20} color="white" style={styles.buttonIcon} />
                                        <Text style={styles.buttonText}>Continue with Google</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.button, styles.emailButton]} 
                                        onPress={() => setIsEmailAuth(true)}
                                    >
                                        <Ionicons name="mail" size={20} color="white" style={styles.buttonIcon} />
                                        <Text style={styles.buttonText}>Continue with Email</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.button, styles.guestButton]} 
                                        onPress={() => authClient.signIn.anonymous()}
                                    >
                                        <Ionicons name="person" size={20} color="#007AFF" style={styles.buttonIcon} />
                                        <Text style={[styles.buttonText, styles.guestButtonText]}>Continue as Guest</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
    },
    authContainer: {
        width: "100%",
        padding: 20,
        alignItems: "center",
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 30,
        borderRadius: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: "300", // Lighter, more elegant font weight
        marginBottom: 8,
        color: "#1B3F92", // Aegean Blue
        textAlign: "center",
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: "#546E7A",
        textAlign: "center",
        marginBottom: 48,
        lineHeight: 24,
    },
    optionsContainer: {
        width: "100%",
        gap: 16,
    },
    formContainer: {
        width: "100%",
        gap: 16,
    },
    input: {
        backgroundColor: "white",
        padding: 16,
        borderRadius: 4, // Sharper corners
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#CFD8DC",
        color: "#1C1C1E",
    },
    button: {
        backgroundColor: "#1B3F92", // Aegean Deep Blue
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 4, // Sharper corners like Aegean
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        shadowColor: "#1B3F92",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: 10,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700", // Bolder text
        letterSpacing: 0.5,
    },
    googleButton: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    emailButton: {
        backgroundColor: "#1B3F92", // Aegean Blue
    },
    guestButton: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#1B3F92",
        borderRadius: 4,
    },
    guestButtonText: {
        color: "#1B3F92",
        fontWeight: "600",
    },
    switchButton: {
        alignItems: "center",
        marginTop: 8,
    },
    switchText: {
        color: "#007AFF",
        fontSize: 14,
    },
    backButton: {
        alignItems: "center",
        marginTop: 8,
    },
    backText: {
        color: "#8E8E93",
        fontSize: 14,
    },
});
