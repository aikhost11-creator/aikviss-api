/**
 * Manual / one-off run:
 *   node scripts/cleanupOldOrders.js
 *   npm run cleanup-orders
 */
require('dotenv').config();
process.env.TimeZone = 'Asia/Kolkata';

const { cleanupOldOrders } = require('../jobs/cleanupOldOrders');

cleanupOldOrders()
    .then((result) => {
        console.log('[cleanup-orders] Done:', result);
        process.exit(0);
    })
    .catch((err) => {
        console.error('[cleanup-orders] Failed:', err);
        process.exit(1);
    });
