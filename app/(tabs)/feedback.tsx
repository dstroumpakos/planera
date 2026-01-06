import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    background: "#2C2C2E",
    backgroundLight: "#FAF9F6",
    text: "#1A1A1A",
    textLight: "#FFFFFF",
    textMuted: "#8E8E93",
    inactive: "#8E8E93",
    error: "#FF3B30",
    success: "#34C759",
};

const FEEDBACK_TYPES = [
    { id: "bug", label: "Bug Report", icon: "bug" },
    { id: "feature", label: "Feature Request", icon: "lightbulb" },
    { id: "improvement", label: "Improvement", icon: "star" },
    { id: "other", label: "Other", icon: "chatbubble" },
];

export default function FeedbackScreen() {
    const [selectedType, setSelectedType] = useState<string>("feature");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const submitFeedback = useMutation(api.feedback.submitFeedback);

    const handleSubmit = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert("Missing Information", "Please fill in both title and message");
            return;
        }

        setIsLoading(true);
        try {
            await submitFeedback({
                type: selectedType,
                title: title.trim(),
                message: message.trim(),
                email: email.trim() || undefined,
            });

            Alert.alert("Thank You!", "Your feedback has been submitted successfully");
            setTitle("");
            setMessage("");
            setEmail("");
            setSelectedType("feature");
        } catch (error) {
            console.error("Feedback submission error:", error);
            Alert.alert("Error", "Failed to submit feedback. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Send Us Feedback</Text>
                    <Text style={styles.subtitle}>Help us improve Planera</Text>
                </View>

                {/* Feedback Type Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What's your feedback about?</Text>
                    <View style={styles.typeGrid}>
                        {FEEDBACK_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.typeButton,
                                    selectedType === type.id && styles.typeButtonActive,
                                ]}
                                onPress={() => setSelectedType(type.id)}
                            >
                                <Ionicons
                                    name={type.icon as any}
                                    size={24}
                                    color={selectedType === type.id ? COLORS.text : COLORS.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.typeLabel,
                                        selectedType === type.id && styles.typeLabelActive,
                                    ]}
                                >
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Title Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Brief summary of your feedback"
                        placeholderTextColor={COLORS.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                    <Text style={styles.charCount}>{title.length}/100</Text>
                </View>

                {/* Message Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <TextInput
                        style={[styles.input, styles.messageInput]}
                        placeholder="Tell us more about your feedback..."
                        placeholderTextColor={COLORS.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length}/500</Text>
                </View>

                {/* Email Input (Optional) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Email (Optional)</Text>
                    <Text style={styles.sectionSubtitle}>So we can follow up with you</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.text} />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color={COLORS.text} />
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        We read every piece of feedback and use it to make Planera better.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    header: {
        marginTop: 24,
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textMuted,
        fontWeight: "500",
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 12,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    typeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    typeButton: {
        flex: 1,
        minWidth: "45%",
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    typeButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
        marginTop: 8,
        textAlign: "center",
    },
    typeLabelActive: {
        color: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.textLight,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    messageInput: {
        minHeight: 120,
        paddingTop: 12,
    },
    charCount: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 6,
        textAlign: "right",
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    footer: {
        paddingVertical: 20,
        alignItems: "center",
    },
    footerText: {
        fontSize: 13,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 20,
    },
});
