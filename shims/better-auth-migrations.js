/**
 * Shim for better-auth migration functionality
 * 
 * This replaces server-side migration code that uses dynamic imports
 * with path.join() which Hermes cannot parse.
 * 
 * Original problematic code:
 *   import(/* webpackIgnore: true */ path.join(migrationFolder, fileName))
 * 
 * This pattern is valid for Node.js/Webpack but breaks React Native iOS builds.
 * Migration functionality is server-only and not needed in mobile apps.
 */

// Named exports matching better-auth's migration API
export const runMigrations = async () => {
    if (__DEV__) {
        console.warn('[better-auth-shim] Migration functions are not available in React Native');
    }
    return { success: true, migrations: [] };
};

export const getMigrations = async () => {
    return [];
};

export const createMigration = async () => {
    if (__DEV__) {
        console.warn('[better-auth-shim] Migration functions are not available in React Native');
    }
    return null;
};

export const migrateDatabase = async () => {
    if (__DEV__) {
        console.warn('[better-auth-shim] Migration functions are not available in React Native');
    }
    return { success: true };
};

export const getMigrationStatus = async () => {
    return { pending: [], applied: [] };
};

// Internal adapter shims
export const createInternalAdapter = () => ({
    runMigrations,
    getMigrations,
    createMigration,
    migrateDatabase,
});

export const internalAdapter = createInternalAdapter();

// Default export for CommonJS compatibility
const defaultExport = {
    runMigrations,
    getMigrations,
    createMigration,
    migrateDatabase,
    getMigrationStatus,
    createInternalAdapter,
    internalAdapter,
};

export default defaultExport;

// CommonJS compatibility
if (typeof module !== 'undefined') {
    module.exports = defaultExport;
    module.exports.default = defaultExport;
    module.exports.__esModule = true;
}
