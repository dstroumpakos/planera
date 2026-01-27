#!/usr/bin/env node
/**
 * Pre-build safety check script
 * 
 * This script scans the codebase for patterns that will cause iOS release builds to fail.
 * Hermes/Metro cannot parse dynamic imports with web-bundler pragmas like @vite-ignore or webpackIgnore.
 * 
 * Run this before `eas build` to catch issues early.
 * 
 * Usage:
 *   node scripts/check-bundle-safety.js
 *   
 * Exit codes:
 *   0 - All checks passed
 *   1 - Dangerous patterns found
 */

const fs = require('fs');
const path = require('path');

// Patterns that break iOS release builds with Hermes
const DANGEROUS_PATTERNS = [
    { pattern: /@vite-ignore/g, description: '@vite-ignore pragma (web-only)' },
    { pattern: /webpackIgnore/g, description: 'webpackIgnore pragma (web-only)' },
    { pattern: /yield\s+import\s*\(/g, description: 'yield import() (unsupported by Hermes)' },
    { pattern: /import\s*\(\s*\/\*[^*]*\*\/\s*[^)]+\)/g, description: 'import() with inline comments' },
];

// Directories to scan (our source code only - node_modules are checked separately)
const SOURCE_DIRS = ['app', 'components', 'lib', 'convex', 'hooks'];

// Known problematic packages that use dynamic imports
const KNOWN_PROBLEMATIC_PACKAGES = [
    'better-auth', // Uses dynamic imports for social providers
];

let issuesFound = 0;

function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        for (const { pattern, description } of DANGEROUS_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
                console.error(`❌ Found ${description} in ${relativePath}`);
                console.error(`   Matches: ${matches.length}`);
                issuesFound += matches.length;
            }
        }
    } catch (err) {
        // Skip files that can't be read
    }
}

function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            // Skip hidden directories and common non-source dirs
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                scanDirectory(fullPath);
            }
        } else if (entry.isFile()) {
            // Only scan JS/TS files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
                scanFile(fullPath);
            }
        }
    }
}

function checkPackageJson() {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
    };
    
    console.log('\n📦 Checking for known problematic packages...\n');
    
    for (const pkgName of KNOWN_PROBLEMATIC_PACKAGES) {
        if (allDeps[pkgName]) {
            console.warn(`⚠️  ${pkgName}@${allDeps[pkgName]} is installed`);
            console.warn(`   This package uses dynamic imports. Ensure metro.config.js handles it.`);
        }
    }
}

function main() {
    console.log('🔍 Scanning source code for iOS-incompatible patterns...\n');
    
    for (const dir of SOURCE_DIRS) {
        scanDirectory(path.join(process.cwd(), dir));
    }
    
    checkPackageJson();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    if (issuesFound > 0) {
        console.error(`❌ Found ${issuesFound} issue(s) that will break iOS release builds.`);
        console.error('\nTo fix:');
        console.error('1. Replace dynamic imports with static imports');
        console.error('2. Remove @vite-ignore and webpackIgnore comments');
        console.error('3. If the issue is in a dependency, check metro.config.js');
        process.exit(1);
    } else {
        console.log('✅ No iOS-incompatible patterns found in source code.');
        console.log('\nNote: If builds still fail, the issue may be in node_modules.');
        console.log('Check metro.config.js for proper handling of problematic packages.');
        process.exit(0);
    }
}

main();
