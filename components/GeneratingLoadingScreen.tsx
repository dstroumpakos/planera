import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface Props { onCancel?: () => void; }

export default function GeneratingLoadingScreen({ onCancel }: Props) {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing AI...");
    const spinAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])).start();
    }, []);

    useEffect(() => {
        const stages = [
            { progress: 15, text: "Analyzing preferences..." },
            { progress: 30, text: "Searching flights..." },
            { progress: 45, text: "Finding accommodations..." },
            { progress: 60, text: "Discovering activities..." },
            { progress: 75, text: "Optimizing itinerary..." },
            { progress: 85, text: "Checking restaurants..." },
            { progress: 95, text: "Finalizing trip..." },
        ];
        let i = 0;
        const interval = setInterval(() => { if (i < stages.length) { setProgress(stages[i].progress); setStatusText(stages[i].text); i++; } }, 2500);
        return () => clearInterval(interval);
    }, []);

    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}><View style={s.brand}><View style={s.logo}><Ionicons name="airplane" size={14} color="#FFE500" /></View><Text style={s.brandText}>PLANERA</Text></View></View>
            <View style={s.main}>
                <View style={s.visual}>
                    <View style={s.ring}>
                        <View style={s.inner}><LinearGradient colors={["#FFF8E1", "#FFE500", "#FFF8E1"]} style={StyleSheet.absoluteFill} /></View>
                        <View style={[s.dot, { top: "30%", left: "22%" }]} />
                        <View style={[s.dot, { bottom: "30%", right: "22%" }]} />
                        <Animated.View style={[s.center, { transform: [{ scale: pulseAnim }] }]}><Ionicons name="airplane" size={32} color="#FFD900" /></Animated.View>
                    </View>
                </View>
                <View style={s.headlines}><Text style={s.title}>Generating your next era...</Text><Text style={s.subtitle}>Optimizing routes and checking availability.</Text></View>
                <View style={s.progressBox}>
                    <View style={s.progressHead}><View style={s.progressLabel}><Animated.View style={{ transform: [{ rotate: spin }] }}><Ionicons name="sync" size={16} color="#757575" /></Animated.View><Text style={s.labelText}>AI Processing</Text></View><Text style={s.percent}>{progress}%</Text></View>
                    <View style={s.bar}><View style={[s.fill, { width: `${progress}%` }]} /></View>
                    <Text style={s.status}>{statusText}</Text>
                </View>
            </View>
            <View style={s.footer}><TouchableOpacity style={s.cancel} onPress={onCancel}><Text style={s.cancelText}>Cancel Generation</Text></TouchableOpacity></View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAF9F6" },
    header: { alignItems: "center", paddingTop: 24, paddingBottom: 16 },
    brand: { flexDirection: "row", alignItems: "center", gap: 8 },
    logo: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
    brandText: { fontSize: 14, fontWeight: "700", letterSpacing: 2, color: "#1A1A1A" },
    main: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    visual: { width: 280, height: 280, marginBottom: 40, alignItems: "center", justifyContent: "center" },
    ring: { width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: "#E8E6E1", backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    inner: { width: 220, height: 220, borderRadius: 110, overflow: "hidden", backgroundColor: "#FFF8E1" },
    dot: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFD900", borderWidth: 3, borderColor: "white" },
    center: { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    headlines: { alignItems: "center", marginBottom: 48 },
    title: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", textAlign: "center", marginBottom: 12 },
    subtitle: { fontSize: 16, color: "#757575", textAlign: "center", maxWidth: 280 },
    progressBox: { width: "100%", maxWidth: 300 },
    progressHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    progressLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
    labelText: { fontSize: 14, fontWeight: "500", color: "#1A1A1A" },
    percent: { fontSize: 14, fontWeight: "700", color: "#FFD900" },
    bar: { height: 8, backgroundColor: "#E8E6E1", borderRadius: 4, overflow: "hidden" },
    fill: { height: "100%", backgroundColor: "#FFD900", borderRadius: 4 },
    status: { fontSize: 12, color: "#757575", marginTop: 8 },
    footer: { paddingHorizontal: 24, paddingBottom: 40, alignItems: "center" },
    cancel: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    cancelText: { fontSize: 14, fontWeight: "500", color: "#757575" },
});
