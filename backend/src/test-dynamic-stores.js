// Test script for dynamic data store configuration
// Run with: node backend/src/test-dynamic-stores.js

import { DATA_STORES, validateDataStoreConfig } from './config/dataStores.js';
import { ActivityLogsStore, AuditTrailStore, AnalyticsStore } from './db/dataStoreAdapter.js';

console.log('='.repeat(60));
console.log('Testing Dynamic Data Store Configuration');
console.log('='.repeat(60));

// Test 1: Configuration validation
console.log('\n1. Configuration Validation');
try {
    validateDataStoreConfig();
    console.log('✓ Configuration is valid');
} catch (error) {
    console.error('✗ Configuration validation failed:', error.message);
    process.exit(1);
}

// Test 2: Display current configuration
console.log('\n2. Current Configuration');
console.log('Activity Logs (Registry):');
console.log(`  Provider: ${DATA_STORES.ACTIVITY_LOGS.provider}`);
console.log(`  Collection: ${DATA_STORES.ACTIVITY_LOGS.collection}`);
console.log(`  Enabled: ${DATA_STORES.ACTIVITY_LOGS.enabled}`);

console.log('\nAudit Trail:');
console.log(`  Provider: ${DATA_STORES.AUDIT_TRAIL.provider}`);
console.log(`  Table: ${DATA_STORES.AUDIT_TRAIL.table}`);
console.log(`  Enabled: ${DATA_STORES.AUDIT_TRAIL.enabled}`);

console.log('\nAnalytics:');
console.log(`  Provider: ${DATA_STORES.ANALYTICS.provider}`);
console.log(`  Collection: ${DATA_STORES.ANALYTICS.collection}`);
console.log(`  Enabled: ${DATA_STORES.ANALYTICS.enabled}`);

// Test 3: Adapter initialization
console.log('\n3. Adapter Initialization');
console.log(`✓ ActivityLogsStore: ${ActivityLogsStore.provider} (${ActivityLogsStore.collection})`);
console.log(`✓ AuditTrailStore: ${AuditTrailStore.provider} (${AuditTrailStore.collection})`);
console.log(`✓ AnalyticsStore: ${AnalyticsStore.provider} (${AnalyticsStore.collection})`);

console.log('\n' + '='.repeat(60));
console.log('All tests passed! ✓');
console.log('='.repeat(60));
