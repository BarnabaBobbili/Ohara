import dotenv from 'dotenv';

dotenv.config();

// ─── Dynamic Data Store Configuration ────────────────────────────────
// Allows switching between MongoDB, MySQL, and PostgreSQL for different data types

export const DATA_STORES = {
    // Activity Logs (Registry) - Records high-level activities
    ACTIVITY_LOGS: {
        provider: process.env.ACTIVITY_LOGS_PROVIDER || 'mongodb',  // mongodb, mysql, postgres
        collection: process.env.ACTIVITY_LOGS_COLLECTION || 'activity_logs',
        table: process.env.ACTIVITY_LOGS_TABLE || 'activity_logs',
        enabled: process.env.ACTIVITY_LOGS_ENABLED !== 'false',
    },

    // Audit Trail - Records detailed field-level changes
    AUDIT_TRAIL: {
        provider: process.env.AUDIT_TRAIL_PROVIDER || 'mysql',  // mysql, mongodb, postgres
        collection: process.env.AUDIT_TRAIL_COLLECTION || 'audit_trail',
        table: process.env.AUDIT_TRAIL_TABLE || 'audit_trail',
        enabled: process.env.AUDIT_TRAIL_ENABLED !== 'false',
    },

    // Analytics - Store analytics/metrics data
    ANALYTICS: {
        provider: process.env.ANALYTICS_PROVIDER || 'mongodb',  // mongodb, mysql, postgres
        collection: process.env.ANALYTICS_COLLECTION || 'analytics',
        table: process.env.ANALYTICS_TABLE || 'analytics',
        enabled: process.env.ANALYTICS_ENABLED !== 'false',
    },
};

// Validate configuration
export const validateDataStoreConfig = () => {
    const validProviders = ['mongodb', 'mysql', 'postgres'];
    const errors = [];

    Object.entries(DATA_STORES).forEach(([key, config]) => {
        if (config.enabled && !validProviders.includes(config.provider)) {
            errors.push(`Invalid provider for ${key}: ${config.provider}. Must be one of: ${validProviders.join(', ')}`);
        }
    });

    if (errors.length > 0) {
        console.error('❌ Data store configuration errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        throw new Error('Invalid data store configuration');
    }

    console.log('✓ Data store configuration validated');
    console.log(`  - Activity Logs: ${DATA_STORES.ACTIVITY_LOGS.provider}`);
    console.log(`  - Audit Trail: ${DATA_STORES.AUDIT_TRAIL.provider}`);
    console.log(`  - Analytics: ${DATA_STORES.ANALYTICS.provider}`);
    return true;
};

export default DATA_STORES;
