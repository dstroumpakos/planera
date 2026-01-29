#!/usr/bin/env node
/**
 * Fix better-auth for React Native/Hermes compatibility
 * 
 * This script patches better-auth to remove and neutralize code patterns
 * that cause iOS release builds to fail with Hermes:
 * 
 * 1. Removes @vite-ignore and webpackIgnore comments
 * 2. Neutralizes dynamic imports with expressions (path.join, variables)
 *    which Hermes cannot parse even without the comments
 * 3. Replaces migration-related dynamic imports with no-ops
 * 
 * Run this after installing packages:
 *   node scripts/fix-better-auth.js
 */

const fs = require('fs');
const path = require('path');

const BETTER_AUTH_PATH = path.join(__dirname, '..', 'node_modules', 'better-auth');

// Patterns to fix (order matters - comments first, then dynamic imports)
const PATTERNS_TO_FIX = [
    // 1. Remove @vite-ignore comments
    { 
        find: /\/\*\s*@vite-ignore\s*\*\//g, 
        replace: '' 
    },
    // 2. Remove webpackIgnore comments  
    { 
        find: /\/\*\s*webpackIgnore:\s*true\s*\*\//g, 
        replace: '' 
    },
    // 3. Neutralize dynamic imports with path.join (migration folder imports)
    // Pattern: import(path.join(...)) or yield import(path.join(...))
    // Replace with: Promise.resolve({}) to return empty module
    {
        find: /yield\s+import\s*\(\s*path\.join\s*\([^)]+\)\s*\)/g,
        replace: 'yield Promise.resolve({})'
    },
    {
        find: /import\s*\(\s*path\.join\s*\([^)]+\)\s*\)/g,
        replace: 'Promise.resolve({})'
    },
    // 4. Neutralize dynamic imports with template literals
    // Pattern: import(`...${...}...`) 
    {
        find: /yield\s+import\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)/g,
        replace: 'yield Promise.resolve({})'
    },
    {
        find: /import\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)/g,
        replace: 'Promise.resolve({})'
    },
    // 5. Neutralize dynamic imports with variable expressions (not string literals)
    // Pattern: import(somePath) where somePath is a variable
    // Be careful not to match import("static-string")
    {
        find: /yield\s+import\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\)/g,
        replace: 'yield Promise.resolve({})'
    },
    // 6. Neutralize concatenated string imports: import(folder + "/" + file)
    {
        find: /yield\s+import\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\+[^)]+\)/g,
        replace: 'yield Promise.resolve({})'
    },
    {
        find: /import\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\+[^)]+\)/g,
        replace: 'Promise.resolve({})'
    },
];

let filesFixed = 0;
let patternsFixed = 0;

function fixFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;
        
        for (const { find, replace } of PATTERNS_TO_FIX) {
            const matches = content.match(find);
            if (matches) {
                content = content.replace(find, replace);
                modified = true;
                patternsFixed += matches.length;
                console.log(`    Found ${matches.length} match(es) for: ${find.toString().slice(0, 50)}...`);
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf-8');
            filesFixed++;
            console.log(`  ✓ Fixed: ${path.relative(BETTER_AUTH_PATH, filePath)}`);
        }
    } catch (err) {
        console.error(`  ✗ Error processing ${filePath}: ${err.message}`);
    }
}

function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
            scanDirectory(fullPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.mjs', '.cjs'].includes(ext)) {
                fixFile(fullPath);
            }
        }
    }
}

function main() {
    console.log('🔧 Fixing better-auth for React Native/Hermes compatibility...\n');
    
    if (!fs.existsSync(BETTER_AUTH_PATH)) {
        console.log('ℹ️  better-auth not found in node_modules, skipping.');
        return;
    }
    
    const distPath = path.join(BETTER_AUTH_PATH, 'dist');
    if (fs.existsSync(distPath)) {
        console.log('Scanning dist folder...\n');
        scanDirectory(distPath);
    }
    
    // Also check the package root for any .js files
    const entries = fs.readdirSync(BETTER_AUTH_PATH, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.js', '.mjs', '.cjs'].includes(ext)) {
                fixFile(path.join(BETTER_AUTH_PATH, entry.name));
            }
        }
    }
    
    console.log(`\n✅ Fixed ${patternsFixed} patterns in ${filesFixed} files.`);
    
    if (patternsFixed === 0) {
        console.log('ℹ️  No problematic patterns found (may already be fixed).');
    }
}

main();
