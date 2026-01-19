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
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.attributionOverlay} pointerEvents="auto">
        <View style={styles.attributionContent}>
          <TouchableOpacity 
            onPress={() => {
              if (photographerUrl) {
                Linking.openURL(photographerUrl);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.attributionText, styles.link]}>
              {photographerName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.attributionText}> on </Text>
          <TouchableOpacity 
            onPress={() => Linking.openURL("https://unsplash.com")}
            activeOpacity={0.7}
          >
            <Text style={[styles.attributionText, styles.link]}>Unsplash</Text>
          </TouchableOpacity>
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
