import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  photographerUrl?: string;
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
  const handleAttributionPress = async () => {
    if (!photographerUrl) return;
    try {
      await Linking.openURL(photographerUrl);
      if (onDownload && downloadLocation) {
        onDownload();
      }
    } catch (error) {
      console.error("Failed to open photographer URL:", error);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <TouchableOpacity 
        style={styles.touchableArea}
        onPress={handleAttributionPress}
        activeOpacity={0.7}
      />
      <View style={styles.attributionOverlay} pointerEvents="none">
        <View style={styles.attributionContent}>
          <Text style={styles.attributionText}>Photo by </Text>
          <Text style={[styles.attributionText, styles.link]}>
            {photographerName}
          </Text>
          <Text style={styles.attributionText}> on </Text>
          <Text style={[styles.attributionText, styles.link]}>Unsplash</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "absolute",
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
  touchableArea: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    bottom: "20%",
    zIndex: 5,
  },
});
