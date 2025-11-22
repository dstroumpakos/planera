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
        textAlign: "center",
    },
    subtitle: {
        fontSize: 18,
        color: "#8E8E93",
        textAlign: "center",
        marginBottom: 40,
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
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    button: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
    },
    buttonIcon: {
        marginRight: 10,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    googleButton: {
        backgroundColor: "#DB4437",
    },
    emailButton: {
        backgroundColor: "#34C759",
    },
    guestButton: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#007AFF",
    },
    guestButtonText: {
        color: "#007AFF",
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
