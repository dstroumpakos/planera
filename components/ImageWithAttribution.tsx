import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  unsplashUrl: string;
  style?: any;
  imageStyle?: any;
}

export function ImageWithAttribution({
  imageUrl,
  photographerName,
  unsplashUrl,
  style,
  imageStyle,
}: ImageWithAttributionProps) {
  const handleAttributionPress = () => {
    Linking.openURL(unsplashUrl);
  };

  return (
    <View style={[styles.container, style]}>
      <Image source={{ uri: imageUrl }} style={[styles.image, imageStyle]} />
      <TouchableOpacity
        style={styles.attributionOverlay}
        onPress={handleAttributionPress}
        activeOpacity={0.7}
      >
        <Text style={styles.attributionText}>
          Photo by {photographerName} on{" "}
          <Text style={styles.unsplashLink}>Unsplash</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  attributionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attributionText: {
    fontSize: 11,
    color: "white",
    fontWeight: "500",
  },
  unsplashLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
