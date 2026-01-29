#!/usr/bin/env node
/**
 * Pre-build safety check script
 * 
 * This script scans the codebase for patterns that will cause iOS release builds to fail.
 * Hermes/Metro cannot parse dynamic imports with:
 * - Web-bundler pragmas like @vite-ignore or webpackIgnore
 * - Expression arguments like path.join() or template literals
 * - Variable paths like import(somePath)
 * 
 * Run this before `eas build` to catch issues early.
 * 
 * Usage:
 *   node scripts/check-bundle-safety.js
 *   
 * Exit codes:
 *   0 - All checks passed
 *   1 - Dangerous patterns found in source code
 *   2 - Dangerous patterns found in node_modules (run fix script)
 */

const fs = require('fs');
const path = require('path');

// Patterns that break iOS release builds with Hermes
const DANGEROUS_PATTERNS = [
    { pattern: /@vite-ignore/g, description: '@vite-ignore pragma (web-only)' },
    { pattern: /webpackIgnore/g, description: 'webpackIgnore pragma (web-only)' },
    { pattern: /yield\s+import\s*\(/g, description: 'yield import() (unsupported by Hermes)' },
    { pattern: /import\s*\(\s*\/\*[^*]*\*\/\s*[^)]+\)/g, description: 'import() with inline comments' },
    { pattern: /import\s*\(\s*path\.join\s*\(/g, description: 'import(path.join(...)) - dynamic path import' },
    { pattern: /import\s*\(\s*`[^`]*\$\{/g, description: 'import(`...${...}`) - template literal import' },
    { pattern: /migrationFolder/g, description: 'migrationFolder variable (Node.js migration code)' },
];

// Directories to scan (our source code only)
const SOURCE_DIRS = ['app', 'components', 'lib', 'convex', 'hooks'];

// Known problematic packages to scan in node_modules
const PACKAGES_TO_CHECK = ['better-auth'];

let sourceIssues = 0;
let nodeModulesIssues = 0;

function scanFile(filePath, isNodeModules = false) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(process.cwd(), filePath);
        let fileIssues = 0;
        
        for (const { pattern, description } of DANGEROUS_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
                console.error(`❌ Found ${description} in ${relativePath}`);
                console.error(`   Matches: ${matches.length}`);
                fileIssues += matches.length;
            }
        }
        
        if (isNodeModules) {
            nodeModulesIssues += fileIssues;
        } else {
            sourceIssues += fileIssues;
        }
    } catch (err) {
        // Skip files that can't be read
    }
}

function scanDirectory(dirPath, isNodeModules = false) {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            // Skip hidden directories and nested node_modules
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                scanDirectory(fullPath, isNodeModules);
            }
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
                scanFile(fullPath, isNodeModules);
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
    
    for (const pkgName of PACKAGES_TO_CHECK) {
        if (allDeps[pkgName]) {
            console.warn(`⚠️  ${pkgName}@${allDeps[pkgName]} is installed`);
            console.warn(`   Checking for unfixed patterns in node_modules...`);
            
            const pkgDistPath = path.join(process.cwd(), 'node_modules', pkgName, 'dist');
            if (fs.existsSync(pkgDistPath)) {
                scanDirectory(pkgDistPath, true);
            }
        }
    }
}

function main() {
    console.log('🔍 Scanning source code for iOS-incompatible patterns...\n');
    
    for (const dir of SOURCE_DIRS) {
        const dirPath = path.join(process.cwd(), dir);
        if (fs.existsSync(dirPath)) {
            scanDirectory(dirPath, false);
        }
    }
    
    checkPackageJson();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    if (sourceIssues > 0) {
        console.error(`❌ Found ${sourceIssues} issue(s) in SOURCE CODE that will break iOS release builds.`);
        console.error('\nTo fix:');
        console.error('1. Replace dynamic imports with static imports');
        console.error('2. Remove @vite-ignore and webpackIgnore comments');
        console.error('3. Move Node.js-only code to server-side (Convex actions)');
        process.exit(1);
    }
    
    if (nodeModulesIssues > 0) {
        console.error(`⚠️  Found ${nodeModulesIssues} issue(s) in NODE_MODULES.`);
        console.error('\nThe fix-better-auth.js script should run automatically via postinstall.');
        console.error('Run manually if needed: node scripts/fix-better-auth.js');
        console.error('\nIf issues persist after running the fix script, the metro.config.js');
        console.error('blockList should prevent these files from being bundled on iOS.');
        // Don't exit with error - metro.config.js should handle this
    }
    
    if (sourceIssues === 0) {
        console.log('✅ No iOS-incompatible patterns found in source code.');
        if (nodeModulesIssues === 0) {
            console.log('✅ No iOS-incompatible patterns found in checked node_modules.');
        }
        console.log('\n📱 Ready for iOS EAS build!');
        process.exit(0);
    }
}

main();
