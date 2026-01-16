import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  photographerUrl: string;
  downloadLocation?: string;
  onDownload?: () => void;
}

export function ImageWithAttribution({
  imageUrl,
  photographerName,
  photographerUrl,
  downloadLocation,
  onDownload,
}: ImageWithAttributionProps) {
  const handlePhotographerPress = async () => {
    try {
      await Linking.openURL(photographerUrl);
      if (onDownload && downloadLocation) {
        onDownload();
      }
    } catch (error) {
      console.error("Failed to open photographer URL:", error);
    }
  };

  const handleUnsplashPress = async () => {
    try {
      await Linking.openURL("https://unsplash.com");
    } catch (error) {
      console.error("Failed to open Unsplash:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <TouchableOpacity 
        style={styles.attributionOverlay} 
        activeOpacity={1}
        onPress={handlePhotographerPress}
      >
        <View style={styles.attributionContent}>
          <Text style={styles.attributionText}>Photo by </Text>
          <Text style={[styles.attributionText, styles.link]}>
            {photographerName}
          </Text>
          <Text style={styles.attributionText}> on </Text>
          <Text style={[styles.attributionText, styles.link]}>Unsplash</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 10,
  },
  attributionContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  attributionText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 16,
  },
  link: {
    textDecorationLine: "underline",
  },
});
