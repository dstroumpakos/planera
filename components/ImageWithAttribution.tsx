import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  unsplashUrl: string;
  photographerUrl?: string;
  style?: any;
  imageStyle?: any;
}

export function ImageWithAttribution({
  imageUrl,
  photographerName,
  unsplashUrl,
  photographerUrl,
  style,
  imageStyle,
}: ImageWithAttributionProps) {
  const handlePhotographerPress = () => {
    if (photographerUrl) {
      Linking.openURL(photographerUrl);
    }
  };

  const handleUnsplashPress = () => {
    Linking.openURL(unsplashUrl);
  };

  return (
    <View style={[styles.container, style]}>
      <Image source={{ uri: imageUrl }} style={[styles.image, imageStyle]} />
      <View style={styles.attributionOverlay}>
        <Text style={styles.attributionText}>
          Photo by{" "}
          {photographerUrl ? (
            <TouchableOpacity onPress={handlePhotographerPress} activeOpacity={0.7}>
              <Text style={styles.photographerLink}>{photographerName}</Text>
            </TouchableOpacity>
          ) : (
            <Text>{photographerName}</Text>
          )}
          {" "}on{" "}
          <TouchableOpacity onPress={handleUnsplashPress} activeOpacity={0.7}>
            <Text style={styles.unsplashLink}>Unsplash</Text>
          </TouchableOpacity>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
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
    zIndex: 9999,
  },
  attributionText: {
    fontSize: 11,
    color: "white",
    fontWeight: "500",
  },
  photographerLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
    color: "white",
  },
  unsplashLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
    color: "white",
  },
});
