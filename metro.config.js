// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.unstable_enablePackageExports = true;

// Fix better-auth dynamic imports that break Hermes/iOS builds
// better-auth uses `yield import(/* @vite-ignore */ ...)` and `yield import(/* webpackIgnore: true */ ...)`
// which Hermes cannot parse. We need to:
// 1. Block the problematic files from being bundled on native platforms
// 2. Provide empty shims for the excluded modules

// Block problematic files that contain web-only dynamic import syntax
// These patterns match files in better-auth that use vite/webpack pragmas
defaultConfig.resolver.blockList = [
    // Block the social provider implementation files that use dynamic imports
    /node_modules\/better-auth\/dist\/.*social-providers.*\.js$/,
    /node_modules\/better-auth\/dist\/.*dynamic.*\.js$/,
];

// Resolve modules that might have web-only code to their React Native alternatives
const originalResolveRequest = defaultConfig.resolver.resolveRequest;
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // For native platforms, redirect problematic imports to empty modules
    if (platform !== "web") {
        // If trying to import a module that doesn't exist or has web-only code,
        // return an empty module
        if (
            moduleName.includes("@vite-ignore") || 
            moduleName.includes("webpackIgnore")
        ) {
            return {
                filePath: require.resolve("./shims/empty.js"),
                type: "sourceFile",
            };
        }
    }
    
    // Use default resolution for everything else
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Ensure proper transformation settings
defaultConfig.transformer = {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
        transform: {
            experimentalImportSupport: false,
            inlineRequires: true,
        },
    }),
};

module.exports = {
    ...defaultConfig,
    server: {
        ...defaultConfig.server,
        enhanceMiddleware: (middleware) => {
            return (req, res, next) => {
                // Set custom timeout (in milliseconds)
                req.setTimeout(30000); // 30 seconds
                res.setTimeout(30000); // 30 seconds

                return middleware(req, res, next);
            };
        },
    },
    watcher: {
        ...defaultConfig.watcher,
        unstable_lazySha1: true, // Enable lazy SHA1 computation for better performance
    },
};
