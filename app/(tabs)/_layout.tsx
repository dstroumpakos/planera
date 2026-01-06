import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    background: "#2C2C2E",
    backgroundLight: "#FAF9F6",
    text: "#1A1A1A",
    textLight: "#FFFFFF",
    textMuted: "#8E8E93",
    inactive: "#8E8E93",
};

export default function TabLayout() {
    const router = useRouter();
    
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.inactive,
                tabBarStyle: {
                    backgroundColor: COLORS.background,
                    borderTopWidth: 0,
                    paddingTop: 8,
                    paddingBottom: 24,
                    height: 80,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    position: "absolute",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 4,
                },
                tabBarItemStyle: {
                    paddingTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconContainer : undefined}>
                            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="trips"
                options={{
                    title: "Trips",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "map" : "map-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: "",
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.createButton}>
                            <Ionicons name="add" size={28} color={COLORS.text} />
                        </View>
                    ),
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        router.push("/create-trip");
                    },
                }}
            />
            <Tabs.Screen
                name="insights"
                options={{
                    title: "Insights",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "bulb" : "bulb-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIconContainer: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 8,
        marginBottom: -4,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginTop: -20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
});
