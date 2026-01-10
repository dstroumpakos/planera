import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  unsplashUrl: string;
  photographerUrl?: string;
  downloadLocation?: string;
  onDownload?: () => void;
  style?: any;
  imageStyle?: any;
}

export function ImageWithAttribution({
  imageUrl,
  photographerName,
  unsplashUrl,
  photographerUrl,
  downloadLocation,
  onDownload,
  style,
  imageStyle,
}: ImageWithAttributionProps) {
  const handleAttributionPress = () => {
    if (onDownload && downloadLocation) {
      onDownload();
    }
    Linking.openURL(unsplashUrl);
  };

  const handlePhotographerPress = () => {
    if (onDownload && downloadLocation) {
      onDownload();
    }
    if (photographerUrl) {
      Linking.openURL(photographerUrl);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Image source={{ uri: imageUrl }} style={[styles.image, imageStyle]} />
      <View style={styles.attributionOverlay}>
        <View style={styles.attributionContent}>
          <Text style={styles.attributionText}>Photo by </Text>
          <TouchableOpacity onPress={handlePhotographerPress} activeOpacity={0.7}>
            <Text style={[styles.attributionText, styles.photographerLink]}>{photographerName}</Text>
          </TouchableOpacity>
          <Text style={styles.attributionText}> on </Text>
          <TouchableOpacity onPress={handleAttributionPress} activeOpacity={0.7}>
            <Text style={[styles.attributionText, styles.unsplashLink]}>Unsplash</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 10,
    pointerEvents: "auto",
  },
  attributionContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    pointerEvents: "auto",
  },
  attributionText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
    lineHeight: 16,
  },
  unsplashLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  photographerLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
