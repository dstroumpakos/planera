import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#4F6DF5",
                tabBarInactiveTintColor: "#A1AEC6",
                tabBarStyle: {
                    borderTopWidth: 0,
                    borderTopColor: "#E2E8F0",
                    backgroundColor: "#FFFFFF",
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 65,
                    shadowColor: "#1A2433",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "My Trips",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="airplane" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="deals"
                options={{
                    title: "Deals",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="pricetag" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
