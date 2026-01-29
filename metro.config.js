// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.unstable_enablePackageExports = true;

// Fix better-auth dynamic imports that break Hermes/iOS builds
// better-auth uses patterns like:
// - `yield import(/* @vite-ignore */ ...)`
// - `yield import(/* webpackIgnore: true */ ...)`
// - `yield import(path.join(migrationFolder, file))`
// which Hermes cannot parse.
//
// The fix-better-auth.js script patches these in node_modules,
// but we also add Metro-level protection as a safety net.

// Block problematic files that contain web-only or Node-only code
// These patterns match files in better-auth that use dynamic imports
defaultConfig.resolver.blockList = [
    // Block migration-related files (they use dynamic path.join imports)
    /node_modules\/better-auth\/dist\/.*migration.*\.js$/,
    /node_modules\/better-auth\/dist\/.*migrate.*\.js$/,
    // Block CLI-related files (Node.js only)
    /node_modules\/better-auth\/dist\/cli.*\.js$/,
    // Block social provider implementation files that may use dynamic imports
    /node_modules\/better-auth\/dist\/.*social-providers.*\.js$/,
    // Block any files with "dynamic" in the name
    /node_modules\/better-auth\/dist\/.*dynamic.*\.js$/,
    // Block adapter files that are database-specific (Node.js only)
    /node_modules\/better-auth\/dist\/adapters\/.*\.js$/,
];

// Resolve modules that might have web-only or Node-only code to shims
const originalResolveRequest = defaultConfig.resolver.resolveRequest;
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // For native platforms, redirect problematic imports to empty modules
    if (platform !== "web") {
        // Block known problematic module patterns
        const problematicPatterns = [
            "@vite-ignore",
            "webpackIgnore",
            // Migration-related modules
            /better-auth.*migration/i,
            /better-auth.*migrate/i,
            /better-auth.*cli/i,
        ];
        
        const shouldShim = problematicPatterns.some(pattern => {
            if (typeof pattern === "string") {
                return moduleName.includes(pattern);
            }
            return pattern.test(moduleName);
        });
        
        if (shouldShim) {
            return {
                filePath: path.resolve(__dirname, "shims/empty.js"),
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
