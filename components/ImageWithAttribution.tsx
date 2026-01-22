import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ImageWithAttributionProps {
  imageUrl: string;
  photographerName: string;
  photographerUrl?: string;
  downloadLocation?: string;
  onDownload?: () => void;
  onImagePress?: () => void;
}

export function ImageWithAttribution({
  imageUrl,
  photographerName,
  photographerUrl,
  downloadLocation,
  onDownload,
  onImagePress,
}: ImageWithAttributionProps) {
  const handlePhotographerPress = async () => {
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

  const handleUnsplashPress = async () => {
    try {
      const unsplashUrl = photographerUrl
        ? `https://unsplash.com?utm_source=planera&utm_medium=referral`
        : "https://unsplash.com";
      await Linking.openURL(unsplashUrl);
    } catch (error) {
      console.error("Failed to open Unsplash URL:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Image with optional press handler - excludes bottom attribution area */}
      <Pressable
        style={styles.imageTouchArea}
        onPress={onImagePress}
        disabled={!onImagePress}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} />
      </Pressable>

      {/* Attribution overlay - pointer events enabled */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.6)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.attributionOverlay}
        pointerEvents="box-none"
      >
        <View style={styles.attributionContent} pointerEvents="box-none">
          <Text style={styles.attributionText}>Photo by </Text>
          <Pressable
            onPress={handlePhotographerPress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.attributionText,
                  styles.link,
                  pressed && styles.linkPressed,
                ]}
              >
                {photographerName}
              </Text>
            )}
          </Pressable>
          <Text style={styles.attributionText}> on </Text>
          <Pressable
            onPress={handleUnsplashPress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.attributionText,
                  styles.link,
                  pressed && styles.linkPressed,
                ]}
              >
                Unsplash
              </Text>
            )}
          </Pressable>
        </View>
      </LinearGradient>
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
  imageTouchArea: {
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
  linkPressed: {
    opacity: 0.7,
  },
});
