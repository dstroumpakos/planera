module.exports = function (api) {
  api.cache(true);
  
  // Get the platform from environment or Metro
  const platform = process.env.BABEL_PLATFORM || api.caller((caller) => caller?.platform);
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
