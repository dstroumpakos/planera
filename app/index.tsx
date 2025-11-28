import { Text, View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

// Import the new logo
import logoImage from "@/assets/bloom/images/image-1dbiuq.png";

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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00BFA6" />
                </View>
            </AuthLoading>

            <Unauthenticated>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.authContainer}>
                            {/* Hero Section with Logo */}
                            <View style={styles.heroSection}>
                                <Image source={logoImage} style={styles.logo} resizeMode="contain" />
                                <Text style={styles.title}>Voyage Buddy</Text>
                                <Text style={styles.subtitle}>Your AI-powered travel companion.{"\n"}Plan your dream vacation in seconds.</Text>
                            </View>
                            
                            {isEmailAuth ? (
                                <View style={styles.formContainer}>
                                    {isSignUp && (
                                        <View style={styles.inputContainer}>
                                            <Ionicons name="person-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Full Name"
                                                placeholderTextColor="#90A4AE"
                                                value={name}
                                                onChangeText={setName}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                    )}
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="mail-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Email"
                                            placeholderTextColor="#90A4AE"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Password"
                                            placeholderTextColor="#90A4AE"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                        />
                                    </View>
                                    
                                    <TouchableOpacity 
                                        style={styles.primaryButton} 
                                        onPress={handleEmailAuth}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>
                                                {isSignUp ? "Create Account" : "Sign In"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
                                        <Text style={styles.switchText}>
                                            {isSignUp ? "Already have an account? " : "Don't have an account? "}
                                            <Text style={styles.switchTextBold}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setIsEmailAuth(false)} style={styles.backButton}>
                                        <Ionicons name="arrow-back" size={16} color="#78909C" />
                                        <Text style={styles.backText}>Back to options</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.optionsContainer}>
                                    <TouchableOpacity 
                                        style={styles.socialButton} 
                                        onPress={handleGoogleSignIn}
                                    >
                                        <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.buttonIcon} />
                                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.primaryButton} 
                                        onPress={() => setIsEmailAuth(true)}
                                    >
                                        <Ionicons name="mail" size={20} color="white" style={styles.buttonIcon} />
                                        <Text style={styles.primaryButtonText}>Continue with Email</Text>
                                    </TouchableOpacity>

                                    <View style={styles.divider}>
                                        <View style={styles.dividerLine} />
                                        <Text style={styles.dividerText}>or</Text>
                                        <View style={styles.dividerLine} />
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.guestButton} 
                                        onPress={() => authClient.signIn.anonymous()}
                                    >
                                        <Ionicons name="compass-outline" size={20} color="#00BFA6" style={styles.buttonIcon} />
                                        <Text style={styles.guestButtonText}>Explore as Guest</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <Text style={styles.termsText}>
                                By continuing, you agree to our Terms of Service and Privacy Policy
                            </Text>
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
        backgroundColor: "#F0FFFE",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
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
        padding: 24,
        alignItems: "center",
    },
    heroSection: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 180,
        height: 180,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 12,
        color: "#0D9488",
        textAlign: "center",
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: "#5EEAD4",
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
    },
    optionsContainer: {
        width: "100%",
        gap: 14,
    },
    formContainer: {
        width: "100%",
        gap: 14,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#99F6E4",
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: "#134E4A",
    },
    primaryButton: {
        backgroundColor: "#14B8A6",
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: 16,
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    socialButton: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: 16,
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#CCFBF1",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    socialButtonText: {
        color: "#134E4A",
        fontSize: 16,
        fontWeight: "600",
    },
    buttonIcon: {
        marginRight: 10,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#99F6E4",
    },
    dividerText: {
        color: "#5EEAD4",
        fontSize: 14,
        marginHorizontal: 16,
        fontWeight: "500",
    },
    guestButton: {
        backgroundColor: "transparent",
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderRadius: 16,
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#14B8A6",
        borderStyle: "dashed",
    },
    guestButtonText: {
        color: "#14B8A6",
        fontSize: 16,
        fontWeight: "600",
    },
    switchButton: {
        alignItems: "center",
        marginTop: 8,
    },
    switchText: {
        color: "#5EEAD4",
        fontSize: 14,
    },
    switchTextBold: {
        color: "#0D9488",
        fontWeight: "700",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        gap: 6,
    },
    backText: {
        color: "#5EEAD4",
        fontSize: 14,
    },
    termsText: {
        color: "#99F6E4",
        fontSize: 12,
        textAlign: "center",
        marginTop: 32,
        lineHeight: 18,
    },
});
