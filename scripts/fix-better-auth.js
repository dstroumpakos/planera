#!/usr/bin/env node
/**
 * Fix better-auth for React Native/Hermes compatibility
 * 
 * This script removes @vite-ignore and webpackIgnore comments from better-auth
 * that cause iOS release builds to fail with Hermes.
 * 
 * Run this after installing packages:
 *   node scripts/fix-better-auth.js
 */

const fs = require('fs');
const path = require('path');

const BETTER_AUTH_PATH = path.join(__dirname, '..', 'node_modules', 'better-auth');

// Patterns to remove (these break Hermes)
const PATTERNS_TO_FIX = [
    // Remove @vite-ignore comments
    { 
        find: /\/\*\s*@vite-ignore\s*\*\//g, 
        replace: '' 
    },
    // Remove webpackIgnore comments  
    { 
        find: /\/\*\s*webpackIgnore:\s*true\s*\*\//g, 
        replace: '' 
    },
    // Convert generator dynamic imports to regular async imports where possible
    // This is trickier and may need manual review
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
        scanDirectory(distPath);
    }
    
    console.log(`\n✅ Fixed ${patternsFixed} patterns in ${filesFixed} files.`);
}

main();
