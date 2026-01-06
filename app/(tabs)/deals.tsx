import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    background: "#FAF9F6",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    error: "#FF6B6B",
    success: "#4CAF50",
};

interface Message {
    id: string;
    type: "user" | "assistant";
    content: string;
    timestamp: number;
}

export default function AIAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const userPlan = useQuery(api.users.getPlan);
    const askAssistant = useAction(api.assistant.askAssistant);

    const isSubscriber = userPlan?.isSubscriptionActive;

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading || !isSubscriber) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: inputText,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText("");
        setError(null);
        setIsLoading(true);

        try {
            const response = await askAssistant({ question: inputText });
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: response.answer,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to get response";
            setError(errorMessage);
            // Remove the user message if there was an error
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    if (userPlan === undefined) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!isSubscriber) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Travel Assistant</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.lockedContainer}>
                    <View style={styles.lockIconContainer}>
                        <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.lockedTitle}>Premium Feature</Text>
                    <Text style={styles.lockedText}>
                        The AI Travel Assistant is only available for monthly or yearly subscribers.
                    </Text>
                    <Text style={styles.lockedSubtext}>
                        Get instant answers about weather, visa requirements, cultural tips, and more for your travel destinations.
                    </Text>
                    <TouchableOpacity style={styles.upgradeButton}>
                        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Travel Assistant</Text>
                        <Text style={styles.headerSubtitle}>Ask about weather, visas, and travel tips</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Start a Conversation</Text>
                        <Text style={styles.emptyText}>
                            Ask me anything about weather, visa requirements, cultural tips, or general travel information.
                        </Text>
                    </View>
                ) : (
                    <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
                        {messages.map((message) => (
                            <View
                                key={message.id}
                                style={[
                                    styles.messageWrapper,
                                    message.type === "user" ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.messageBubble,
                                        message.type === "user" ? styles.userMessage : styles.assistantMessage,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messageText,
                                            message.type === "user" ? styles.userMessageText : styles.assistantMessageText,
                                        ]}
                                    >
                                        {message.content}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {isLoading && (
                            <View style={styles.assistantMessageWrapper}>
                                <View style={styles.loadingBubble}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask me anything..."
                        placeholderTextColor={COLORS.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        editable={!isLoading}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={!inputText.trim() || isLoading ? COLORS.textMuted : COLORS.text}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardAvoid: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
    },
    headerSpacer: {
        width: 40,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    lockedContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    lockIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    lockedTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 12,
        textAlign: "center",
    },
    lockedText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 12,
        lineHeight: 24,
    },
    lockedSubtext: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 20,
    },
    upgradeButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        width: "100%",
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
        textAlign: "center",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 12,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 20,
    },
    messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    messageWrapper: {
        marginVertical: 8,
        flexDirection: "row",
    },
    userMessageWrapper: {
        justifyContent: "flex-end",
    },
    assistantMessageWrapper: {
        justifyContent: "flex-start",
    },
    messageBubble: {
        maxWidth: "80%",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
    },
    userMessage: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    assistantMessage: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userMessageText: {
        color: COLORS.text,
    },
    assistantMessageText: {
        color: COLORS.text,
    },
    loadingBubble: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFE5E5",
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    errorText: {
        fontSize: 13,
        color: COLORS.error,
        flex: 1,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.text,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.background,
    },
});
