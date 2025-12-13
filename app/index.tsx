import { Text, View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Redirect } from "expo-router";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Planora Colors
const COLORS = {
    primary: "#FFE500", // Bright Yellow
    primaryDark: "#E6CF00",
    background: "#FAF9F6", // Cream/Off-white
    backgroundDark: "#F5F3EE",
    text: "#1A1A1A", // Near black
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    success: "#4CAF50",
    error: "#EF4444",
};

export default function Index() {
    const [currentStep, setCurrentStep] = useState(0); // 0: splash, 1: onboarding, 2: auth
    const [onboardingPage, setOnboardingPage] = useState(0);
    const [isEmailAuth, setIsEmailAuth] = useState(false);
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

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
        setOauthLoading("google");
        try {
            await authClient.signIn.social({ provider: "google" });
        } catch (error: any) {
            Alert.alert("Error", "Google sign in failed");
        } finally {
            setOauthLoading(null);
        }
    };

    const handleAppleSignIn = async () => {
        setOauthLoading("apple");
        try {
            await authClient.signIn.social({ provider: "apple" });
        } catch (error: any) {
            Alert.alert("Error", "Apple sign in failed");
        } finally {
            setOauthLoading(null);
        }
    };

    const handleGuestExplore = async () => {
        setOauthLoading("guest");
        try {
            await authClient.signIn.anonymous();
        } catch (error: any) {
            Alert.alert("Error", "Guest sign in failed");
        } finally {
            setOauthLoading(null);
        }
    };

    const onboardingData = [
        {
            title: "Plan Smarter,\nTravel Further",
            subtitle: "Experience the future of travel planning with our intelligent tools.",
            features: [
                { icon: "help-circle", title: "AI Trip Planner", desc: "Generate personalized itineraries in seconds based on your unique interests." },
                { icon: "git-compare", title: "Multi-City Routing", desc: "Seamlessly connect destinations with the most efficient travel paths." },
                { icon: "star", title: "Smart Recommendations", desc: "Discover hidden gems and top-rated spots curated just for you." },
            ]
        }
    ];

    // Splash Screen
    const renderSplash = () => (
        <View style={styles.splashContainer}>
            <View style={styles.splashContent}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoIconWrapper}>
                        <Ionicons name="globe-outline" size={48} color={COLORS.primary} />
                        <View style={styles.logoSparkle}>
                            <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                        </View>
                    </View>
                </View>
                <Text style={styles.splashTitle}>PLANERA</Text>
                <Text style={styles.splashSubtitle}>AI-Powered Journeys, tailored{"\n"}just for you.</Text>
            </View>
            
            <View style={styles.splashBottom}>
                <TouchableOpacity 
                    style={styles.getStartedButton}
                    onPress={() => setCurrentStep(1)}
                >
                    <Text style={styles.getStartedText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setCurrentStep(2)}>
                    <Text style={styles.loginLink}>
                        Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Onboarding Screen
    const renderOnboarding = () => (
        <View style={styles.onboardingContainer}>
            <Text style={styles.onboardingBrand}>PLANERA</Text>
            
            <View style={styles.onboardingContent}>
                <Text style={styles.onboardingTitle}>{onboardingData[0].title}</Text>
                <Text style={styles.onboardingSubtitle}>{onboardingData[0].subtitle}</Text>
                
                <View style={styles.featuresContainer}>
                    {onboardingData[0].features.map((feature, index) => (
                        <View key={index} style={styles.featureCard}>
                            <View style={styles.featureIconWrapper}>
                                <Ionicons name={feature.icon as any} size={24} color={COLORS.text} />
                            </View>
                            <View style={styles.featureTextContainer}>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDesc}>{feature.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
            
            <View style={styles.onboardingBottom}>
                <View style={styles.dotsContainer}>
                    <View style={[styles.dot, styles.dotInactive]} />
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                </View>
                
                <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={() => setCurrentStep(2)}
                >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Auth Screen
    const renderAuth = () => (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.authKeyboard}
        >
            <ScrollView contentContainerStyle={styles.authScrollContent}>
                <Text style={styles.authBrand}>PLANERA</Text>
                
                {/* Hero Image */}
                <View style={styles.authHeroContainer}>
                    <View style={styles.authHeroImage}>
                        <View style={styles.wavesContainer}>
                            {[...Array(8)].map((_, i) => (
                                <View 
                                    key={i} 
                                    style={[
                                        styles.wave, 
                                        { 
                                            top: i * 35,
                                            backgroundColor: i % 2 === 0 ? '#7BA3A3' : '#8FB5B5',
                                            opacity: 0.7 + (i * 0.03)
                                        }
                                    ]} 
                                />
                            ))}
                        </View>
                    </View>
                </View>
                
                <Text style={styles.authTitle}>Unlock Smart Travel</Text>
                <Text style={styles.authSubtitle}>Plan complex trips in seconds with AI-powered routing.</Text>
                
                {isEmailAuth ? (
                    <View style={styles.formContainer}>
                        {isSignUp && (
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor={COLORS.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={COLORS.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={COLORS.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        
                        <TouchableOpacity 
                            style={styles.primaryButton} 
                            onPress={handleEmailAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.text} />
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
                            <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.backText}>Back to options</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.authOptionsContainer}>
                        <TouchableOpacity 
                            style={styles.socialButton} 
                            onPress={handleGoogleSignIn}
                            disabled={oauthLoading !== null}
                        >
                            {oauthLoading === "google" ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <>
                                    <View style={styles.googleIcon}>
                                        <Text style={styles.googleG}>G</Text>
                                    </View>
                                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.socialButton} 
                            onPress={handleAppleSignIn}
                            disabled={oauthLoading !== null}
                        >
                            {oauthLoading === "apple" ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <>
                                    <Ionicons name="logo-apple" size={20} color={COLORS.text} style={styles.socialIcon} />
                                    <Text style={styles.socialButtonText}>Continue with Apple</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.primaryButton} 
                            onPress={() => setIsEmailAuth(true)}
                        >
                            <Ionicons name="mail-outline" size={20} color={COLORS.text} style={styles.socialIcon} />
                            <Text style={styles.primaryButtonText}>Sign Up with Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.guestButton} 
                            onPress={handleGuestExplore}
                            disabled={oauthLoading !== null}
                        >
                            {oauthLoading === "guest" ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <>
                                    <Ionicons name="eye-outline" size={20} color={COLORS.text} style={styles.socialIcon} />
                                    <Text style={styles.guestButtonText}>Explore as Guest</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setIsEmailAuth(true); setIsSignUp(false); }}>
                            <Text style={styles.memberText}>
                                Already a member? <Text style={styles.memberTextBold}>Log In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                <Text style={styles.termsText}>
                    By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and{"\n"}<Text style={styles.termsLink}>Privacy Policy</Text>.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    return (
        <View style={styles.container}>
            <AuthLoading>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </AuthLoading>

            <Unauthenticated>
                <SafeAreaView style={styles.safeArea}>
                    {currentStep === 0 && renderSplash()}
                    {currentStep === 1 && renderOnboarding()}
                    {currentStep === 2 && renderAuth()}
                </SafeAreaView>
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
        backgroundColor: COLORS.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    
    // Splash Styles
    splashContainer: {
        flex: 1,
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    splashContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoIconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logoSparkle: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    splashTitle: {
        fontSize: 36,
        fontWeight: "900",
        color: COLORS.text,
        letterSpacing: 4,
        marginBottom: 16,
    },
    splashSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 24,
    },
    splashBottom: {
        gap: 20,
    },
    getStartedButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    getStartedText: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    loginLink: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
    },
    loginLinkBold: {
        fontWeight: "700",
        color: COLORS.text,
    },
    
    // Onboarding Styles
    onboardingContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    onboardingBrand: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textSecondary,
        letterSpacing: 3,
        textAlign: "center",
        marginBottom: 32,
    },
    onboardingContent: {
        flex: 1,
    },
    onboardingTitle: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 12,
        lineHeight: 40,
    },
    onboardingSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 32,
        lineHeight: 24,
    },
    featuresContainer: {
        gap: 16,
    },
    featureCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    featureIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    onboardingBottom: {
        paddingVertical: 24,
        gap: 24,
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: COLORS.primary,
    },
    dotInactive: {
        width: 8,
        backgroundColor: COLORS.border,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    
    // Auth Styles
    authKeyboard: {
        flex: 1,
    },
    authScrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    authBrand: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.textSecondary,
        letterSpacing: 3,
        textAlign: "center",
        marginBottom: 24,
    },
    authHeroContainer: {
        marginBottom: 24,
    },
    authHeroImage: {
        height: 200,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#5A8A8A",
    },
    wavesContainer: {
        flex: 1,
        position: "relative",
    },
    wave: {
        position: "absolute",
        left: -20,
        right: -20,
        height: 60,
        borderRadius: 30,
    },
    authTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.text,
        textAlign: "center",
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    authOptionsContainer: {
        gap: 12,
    },
    formContainer: {
        gap: 12,
    },
    input: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    socialButton: {
        backgroundColor: COLORS.white,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    googleIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    googleG: {
        fontSize: 16,
        fontWeight: "700",
        color: "#4285F4",
    },
    socialIcon: {
        marginRight: 12,
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },
    guestButton: {
        backgroundColor: COLORS.white,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    guestButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    memberText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 8,
    },
    memberTextBold: {
        fontWeight: "700",
        color: COLORS.text,
        textDecorationLine: "underline",
    },
    switchButton: {
        alignItems: "center",
        marginTop: 8,
    },
    switchText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    switchTextBold: {
        color: COLORS.text,
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
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    termsText: {
        color: COLORS.textMuted,
        fontSize: 12,
        textAlign: "center",
        marginTop: 32,
        lineHeight: 18,
    },
    termsLink: {
        color: COLORS.textSecondary,
        textDecorationLine: "underline",
    },
});
