// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.unstable_enablePackageExports = true;

/**
 * FIX FOR iOS EAS BUILD FAILURE
 * =============================
 * 
 * PROBLEM:
 * better-auth@1.3.27 contains server-side migration code with dynamic imports:
 *   import(/* webpackIgnore: true */ path.join(migrationFolder, fileName))
 * 
 * This pattern is valid for Node.js/Webpack but Hermes cannot parse it,
 * causing iOS release builds to fail with "Invalid expression encountered".
 * 
 * ROOT CAUSE:
 * - lib/auth-client.ts imports from "better-auth/react"
 * - better-auth/react internally imports core better-auth modules
 * - Those modules include db/internal-adapter.js which has the dynamic import
 * - Metro bundles everything, including server-only code
 * 
 * SOLUTION:
 * Use resolveRequest to intercept and redirect problematic modules BEFORE
 * they are resolved, preventing the bad code from ever entering the bundle.
 */

// Path to our empty shim
const EMPTY_SHIM = path.resolve(__dirname, "shims/empty.js");
const MIGRATION_SHIM = path.resolve(__dirname, "shims/better-auth-migrations.js");

// Store the original resolver
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // Only apply fixes on iOS/Android (not web)
    const isNative = platform === "ios" || platform === "android";
    
    if (isNative) {
        // Shim patterns that contain migration/db code
        // These patterns match the internal require paths within better-auth
        const shimPatterns = [
            // Direct matches for known problematic paths
            /better-auth\/dist\/db\/internal-adapter/,
            /better-auth\/dist\/db\/migrations/,
            /better-auth\/dist\/cli/,
            /better-auth\/db\/internal-adapter/,
            /better-auth\/db\/migrations/,
            /better-auth\/cli/,
            // Match any path with "migration" in better-auth
            /better-auth.*migration/i,
            // Match internal adapter paths
            /better-auth.*internal-adapter/,
        ];
        
        // Check if this module path should be shimmed
        for (const pattern of shimPatterns) {
            if (pattern.test(moduleName)) {
                return {
                    filePath: MIGRATION_SHIM,
                    type: "sourceFile",
                };
            }
        }
        
        // Also check the originModulePath (where the import is coming FROM)
        // This catches cases where the module is imported relatively within better-auth
        if (context.originModulePath) {
            const origin = context.originModulePath;
            
            // If we're resolving FROM a better-auth file that's known to be server-only
            if (origin.includes('better-auth') && 
                (origin.includes('internal-adapter') || 
                 origin.includes('migration') ||
                 origin.includes('/cli/'))) {
                // Shim any relative imports from these files
                if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
                    return {
                        filePath: EMPTY_SHIM,
                        type: "sourceFile",
                    };
                }
            }
        }
    }
    
    // Default resolution
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Block certain files from ever being resolved
// This is a fallback - the resolveRequest above should catch most cases
defaultConfig.resolver.blockList = [
    // CLI tools - never needed in mobile
    /node_modules\/better-auth\/dist\/cli\//,
    // Test files
    /node_modules\/better-auth\/.*\.test\./,
    /node_modules\/better-auth\/.*\.spec\./,
];

// Ensure Hermes-compatible transformation
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
                req.setTimeout(30000);
                res.setTimeout(30000);
                return middleware(req, res, next);
            };
        },
    },
    watcher: {
        ...defaultConfig.watcher,
        unstable_lazySha1: true,
    },
};
