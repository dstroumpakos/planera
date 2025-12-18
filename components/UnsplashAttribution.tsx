import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";

interface UnsplashAttributionProps {
    photographerName: string;
    photographerUrl: string;
    style?: object;
    textColor?: string;
}

/**
 * Unsplash Attribution Component
 * Required by Unsplash API guidelines when displaying photos
 * Must include: photographer name with link, and Unsplash link
 */
export default function UnsplashAttribution({
    photographerName,
    photographerUrl,
    style,
    textColor = "#FFFFFF",
}: UnsplashAttributionProps) {
    const handlePhotographerPress = () => {
        Linking.openURL(photographerUrl);
    };

    const handleUnsplashPress = () => {
        Linking.openURL("https://unsplash.com/?utm_source=planera&utm_medium=referral");
    };

    return (
        <View style={[styles.container, style]}>
            <Text style={[styles.text, { color: textColor }]}>
                Photo by{" "}
                <Text style={styles.link} onPress={handlePhotographerPress}>
                    {photographerName}
                </Text>
                {" "}on{" "}
                <Text style={styles.link} onPress={handleUnsplashPress}>
                    Unsplash
                </Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 4,
    },
    text: {
        fontSize: 11,
        fontWeight: "400",
    },
    link: {
        textDecorationLine: "underline",
        fontWeight: "500",
    },
});
