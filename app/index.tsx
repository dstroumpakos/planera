import { authClient } from "@/lib/auth-client";
import { Unauthenticated, Authenticated, AuthLoading } from "convex/react";
import { Text, View, StyleSheet, Image, Pressable } from "react-native";

export default function Index() {
    return (
        <View style={styles.container}>
            <Unauthenticated>
                <Text>logged out</Text>
            </Unauthenticated>
            <Authenticated>
                <Text>Logged in</Text>
            </Authenticated>
            <AuthLoading>
                <Text>Loading...</Text>
            </AuthLoading>
            <View>
                <Pressable
                    onPress={async () => {
                        const user = await authClient.signIn.anonymous();
                        console.log(user);
                    }}
                >
                    <Text>Sign in anonymously</Text>
                </Pressable>
            </View>
            <View>
                <Pressable
                    onPress={async () => {
                        const data = await authClient.signIn.social({
                            provider: "google",
                        });
                        console.log(data);
                    }}
                >
                    <Text>Sign in with Google</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 32,
    },
    heading: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        color: "#181818", // equivalent to text-blue-400
    },
    text: {
        fontSize: 18,
        fontWeight: "medium",
        textAlign: "center",
        color: "#4D4D4D",
    },
    image: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
});
