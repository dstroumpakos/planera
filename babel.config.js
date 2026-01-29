module.exports = function (api) {
  // Use .cache.using() to cache based on platform
  const platform = api.caller((caller) => caller?.platform);
  api.cache.using(() => platform || 'default');
  
  const isNative = platform === "ios" || platform === "android";
  
  const plugins = [];
  
  // Add dynamic import removal plugin for native builds only
  if (isNative) {
    plugins.push([
      "./babel-plugin-remove-dynamic-imports.js",
      { platform },
    ]);
  }
  
  // Reanimated plugin must be listed last
  plugins.push("react-native-reanimated/plugin");
  
  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
