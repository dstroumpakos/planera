import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.brandHeader}>
                    <View style={styles.logoContainer}><Ionicons name="airplane" size={20} color="#FFE500" /></View>
                    <Text style={styles.brandName}>PLANERA</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Data We Collect</Text>
                    <Text style={styles.paragraph}>We may collect:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>• Name or username</Text>
                        <Text style={styles.bulletItem}>• Email address</Text>
                        <Text style={styles.bulletItem}>• Travel preferences and inputs</Text>
                        <Text style={styles.bulletItem}>• App usage data</Text>
                        <Text style={styles.bulletItem}>• Subscription status</Text>
                    </View>
                    <Text style={styles.paragraph}>We do not collect payment card details.</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. How We Use Data</Text>
                    <Text style={styles.paragraph}>Your data is used to:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>• Generate personalized travel plans</Text>
                        <Text style={styles.bulletItem}>• Improve AI performance</Text>
                        <Text style={styles.bulletItem}>• Manage subscriptions</Text>
                        <Text style={styles.bulletItem}>• Provide customer support</Text>
                        <Text style={styles.bulletItem}>• Comply with legal obligations</Text>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. AI & Third-Party Processing</Text>
                    <Text style={styles.paragraph}>Planera uses third-party AI and infrastructure providers to generate content.</Text>
                    <Text style={styles.paragraph}>Your data may be processed securely by:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>• AI service providers</Text>
                        <Text style={styles.bulletItem}>• Cloud hosting providers</Text>
                        <Text style={styles.bulletItem}>• Analytics services</Text>
                    </View>
                    <Text style={styles.paragraph}>All providers comply with GDPR or equivalent standards.</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Data Sharing</Text>
                    <Text style={styles.paragraph}>We do not sell personal data.</Text>
                    <Text style={styles.paragraph}>Data may be shared only when necessary to:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>• Provide the service</Text>
                        <Text style={styles.bulletItem}>• Comply with law</Text>
                        <Text style={styles.bulletItem}>• Protect legal rights</Text>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Data Retention</Text>
                    <Text style={styles.paragraph}>Data is retained only for as long as necessary to provide the service or comply with legal requirements.</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. User Rights (GDPR)</Text>
                    <Text style={styles.paragraph}>You have the right to:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>• Access your data</Text>
                        <Text style={styles.bulletItem}>• Request correction or deletion</Text>
                        <Text style={styles.bulletItem}>• Withdraw consent</Text>
                        <Text style={styles.bulletItem}>• Request data portability</Text>
                    </View>
                    <View style={styles.contactBox}>
                        <Text style={styles.contactLabel}>Requests can be sent to:</Text>
                        <View style={styles.emailRow}><Ionicons name="mail-outline" size={16} color="#FFD900" /><Text style={styles.emailText}>privacy@planera.app</Text></View>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Data Security</Text>
                    <Text style={styles.paragraph}>We implement technical and organizational measures to protect user data.</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>8. Changes</Text>
                    <Text style={styles.paragraph}>This policy may be updated periodically. Continued use implies acceptance.</Text>
                </View>
                <View style={styles.footer}><Text style={styles.footerText}>© 2026 Planera. All rights reserved.</Text></View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAF9F6" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E8E6E1" },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
    placeholder: { width: 40 },
    content: { flex: 1, paddingHorizontal: 20 },
    brandHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 32 },
    logoContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
    brandName: { fontSize: 20, fontWeight: "800", letterSpacing: 3, color: "#1A1A1A" },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
    paragraph: { fontSize: 15, lineHeight: 24, color: "#4A4A4A", marginBottom: 8 },
    bulletList: { marginLeft: 8, marginBottom: 12 },
    bulletItem: { fontSize: 15, lineHeight: 26, color: "#4A4A4A" },
    contactBox: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#E8E6E1" },
    contactLabel: { fontSize: 14, color: "#757575", marginBottom: 8 },
    emailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    emailText: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
    footer: { paddingVertical: 32, alignItems: "center" },
    footerText: { fontSize: 13, color: "#9E9E9E" },
});
