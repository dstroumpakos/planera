// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.unstable_enablePackageExports = true;

// Resolve better-auth's dynamic import issues for React Native
// better-auth uses dynamic imports with vite/webpack pragmas that Hermes can't parse
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // Intercept problematic dynamic import patterns from better-auth
    // These modules use web-only dynamic imports that break iOS builds
    if (moduleName.includes("@vite-ignore") || moduleName.includes("webpackIgnore")) {
        return { type: "empty" };
    }
    
    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
};

// Ensure these packages are properly transformed
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
