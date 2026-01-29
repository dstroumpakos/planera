// Shim for better-auth migration functionality
// Replaces server-side migration code that uses dynamic imports
// which Hermes cannot parse. Migration functionality is server-only
// and not needed in mobile apps.

// Named exports matching better-auth's migration API
export const runMigrations = async () => {
    return { success: true, migrations: [] };
};

export const getMigrations = async () => {
    return [];
};

export const createMigration = async () => {
    return null;
};

export const migrateDatabase = async () => {
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

// Default export
export default {
    runMigrations,
    getMigrations,
    createMigration,
    migrateDatabase,
    getMigrationStatus,
    createInternalAdapter,
    internalAdapter,
};
