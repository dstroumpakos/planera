#!/usr/bin/env node
/**
 * Fix better-auth for React Native/Hermes compatibility
 * 
 * This script patches better-auth source files to remove/replace patterns
 * that break iOS release builds. It runs automatically on postinstall.
 * 
 * TARGET PATTERNS:
 * - Dynamic imports with webpack pragma
 * - path.join() inside import()
 * - migrationFolder references (server-only)
 * 
 * These patterns are valid JavaScript but Hermes cannot parse them.
 */

const fs = require('fs');
const path = require('path');

const BETTER_AUTH_PATH = path.join(process.cwd(), 'node_modules', 'better-auth');
const BETTER_AUTH_DIST = path.join(BETTER_AUTH_PATH, 'dist');

let filesPatched = 0;
let patternsFixed = 0;

/**
 * Patterns to find and their replacements
 */
const PATCHES = [
    {
        // Pattern: import(/* webpackIgnore: true */ path.join(...))
        // This is the exact pattern causing the iOS build failure
        name: 'webpackIgnore dynamic import',
        find: /import\s*\(\s*\/\*\s*webpackIgnore:\s*true\s*\*\/\s*[^)]+\.path\.join\s*\([^)]*\)\s*\)/g,
        replace: 'Promise.resolve({})',
    },
    {
        // Pattern: import(/* @vite-ignore */ ...)
        name: 'vite-ignore dynamic import',
        find: /import\s*\(\s*\/\*\s*@vite-ignore\s*\*\/\s*[^)]+\)/g,
        replace: 'Promise.resolve({})',
    },
    {
        // Pattern: any dynamic import with path.join
        name: 'path.join dynamic import',
        find: /import\s*\(\s*[^)]*path\.join\s*\([^)]*\)\s*\)/g,
        replace: 'Promise.resolve({})',
    },
    {
        // Pattern: require() with path.join for dynamic loading
        name: 'path.join dynamic require',
        find: /require\s*\(\s*[^)]*path\.join\s*\([^)]*migrationFolder[^)]*\)\s*\)/g,
        replace: '({})',
    },
    {
        // Pattern: async generator yields with dynamic imports
        name: 'yield dynamic import',
        find: /yield\s+import\s*\(\s*[^)]+\)/g,
        replace: 'yield Promise.resolve({})',
    },
];

/**
 * Apply patches to a file
 */
function patchFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        return false;
    }
    
    const originalContent = content;
    const relativePath = path.relative(BETTER_AUTH_DIST, filePath);
    
    // Apply global patches
    for (const patch of PATCHES) {
        const matches = content.match(patch.find);
        if (matches) {
            console.log('  [' + relativePath + '] Fixing: ' + patch.name + ' (' + matches.length + ' occurrences)');
            content = content.replace(patch.find, patch.replace);
            patternsFixed += matches.length;
        }
    }
    
    // Only write if changes were made
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesPatched++;
        return true;
    }
    
    return false;
}

/**
 * Recursively scan and patch all JS files
 */
function scanAndPatch(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            scanAndPatch(fullPath);
        } else if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) {
            patchFile(fullPath);
        }
    }
}

/**
 * Create or verify shim files exist
 */
function ensureShims() {
    const shimsDir = path.join(process.cwd(), 'shims');
    
    if (!fs.existsSync(shimsDir)) {
        fs.mkdirSync(shimsDir, { recursive: true });
    }
    
    // Empty shim
    const emptyShim = path.join(shimsDir, 'empty.js');
    if (!fs.existsSync(emptyShim)) {
        fs.writeFileSync(emptyShim, '// Empty shim\nmodule.exports = {};\n');
        console.log('Created shims/empty.js');
    }
    
    // Migration shim
    const migrationShim = path.join(shimsDir, 'better-auth-migrations.js');
    if (!fs.existsSync(migrationShim)) {
        fs.writeFileSync(migrationShim, [
            '// Shim for better-auth migrations (server-only)',
            'export const runMigrations = async () => ({ success: true, migrations: [] });',
            'export const getMigrations = async () => [];',
            'export const createMigration = async () => null;',
            'export const migrateDatabase = async () => ({ success: true });',
            'export default { runMigrations, getMigrations, createMigration, migrateDatabase };',
            ''
        ].join('\n'));
        console.log('Created shims/better-auth-migrations.js');
    }
}

/**
 * Main execution
 */
function main() {
    console.log('Patching better-auth for React Native/Hermes compatibility...');
    console.log('');
    
    // Ensure shims exist
    ensureShims();
    
    // Check if better-auth is installed
    if (!fs.existsSync(BETTER_AUTH_PATH)) {
        console.log('better-auth not found in node_modules - skipping patches');
        return;
    }
    
    console.log('Scanning ' + BETTER_AUTH_DIST + '...');
    console.log('');
    
    // Scan and patch all files
    scanAndPatch(BETTER_AUTH_DIST);
    
    // Also check the root of better-auth for any JS files
    const rootFiles = fs.readdirSync(BETTER_AUTH_PATH)
        .filter(function(f) { return /\.(js|mjs|cjs)$/.test(f); });
    
    for (const file of rootFiles) {
        patchFile(path.join(BETTER_AUTH_PATH, file));
    }
    
    console.log('');
    console.log('========================================');
    
    if (filesPatched > 0) {
        console.log('Patched ' + filesPatched + ' file(s), fixed ' + patternsFixed + ' pattern(s)');
    } else {
        console.log('No patches needed (already patched or no issues found)');
    }
    
    console.log('========================================');
    console.log('');
}

main();
