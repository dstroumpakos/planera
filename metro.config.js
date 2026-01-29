// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");
const fs = require("fs");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.unstable_enablePackageExports = true;

// FIX FOR iOS EAS BUILD FAILURE
// =============================
// better-auth contains server-side code with dynamic imports that Hermes cannot parse.
// We intercept and stub out ALL problematic modules before they enter the bundle.

// Paths to our minimal stubs
const MIGRATION_STUB = path.resolve(__dirname, "shims/better-auth-migrations.native.js");
const DB_STUB = path.resolve(__dirname, "shims/better-auth-db.native.js");
const EMPTY_STUB = path.resolve(__dirname, "shims/empty.js");

// Store the original resolver
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

// Files known to contain problematic dynamic imports
const PROBLEMATIC_FILES = [
    "internal-adapter",
    "get-migration",
    "run-migration", 
    "migration-",
    "migrations",
    "/cli/",
];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    const isNative = platform === "ios" || platform === "android";
    
    if (isNative) {
        // Check module name for problematic patterns
        const moduleNameLower = moduleName.toLowerCase();
        
        // Intercept any better-auth migration/db internal imports
        if (moduleName.includes("better-auth")) {
            for (const pattern of PROBLEMATIC_FILES) {
                if (moduleNameLower.includes(pattern.toLowerCase())) {
                    return {
                        filePath: MIGRATION_STUB,
                        type: "sourceFile",
                    };
                }
            }
        }
        
        // Use original resolver first to get the actual file path
        let resolution;
        try {
            if (originalResolveRequest) {
                resolution = originalResolveRequest(context, moduleName, platform);
            } else {
                resolution = context.resolveRequest(context, moduleName, platform);
            }
        } catch (e) {
            // If resolution fails, return original error
            throw e;
        }
        
        // Check if the resolved file path contains problematic patterns
        if (resolution && resolution.filePath) {
            const filePath = resolution.filePath.toLowerCase();
            
            // Check if this is a better-auth file with problematic code
            if (filePath.includes("better-auth")) {
                for (const pattern of PROBLEMATIC_FILES) {
                    if (filePath.includes(pattern.toLowerCase())) {
                        return {
                            filePath: MIGRATION_STUB,
                            type: "sourceFile",
                        };
                    }
                }
                
                // Extra safety: check file contents for the problematic pattern
                if (resolution.filePath && fs.existsSync(resolution.filePath)) {
                    try {
                        const content = fs.readFileSync(resolution.filePath, "utf8");
                        if (content.includes("webpackIgnore") || 
                            content.includes("import(") && content.includes("path.join")) {
                            return {
                                filePath: MIGRATION_STUB,
                                type: "sourceFile",
                            };
                        }
                    } catch (e) {
                        // Ignore read errors
                    }
                }
            }
        }
        
        return resolution;
    }
    
    // Default resolution for web
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

// Block certain files from ever being resolved
defaultConfig.resolver.blockList = [
    /node_modules\/better-auth\/dist\/cli\//,
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
