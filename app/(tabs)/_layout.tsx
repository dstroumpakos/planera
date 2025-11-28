import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#00BFA6",
                tabBarInactiveTintColor: "#90A4AE",
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: "#E8EDF2",
                    backgroundColor: "white",
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 60,
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
