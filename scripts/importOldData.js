const fs = require('fs');
const path = require('path');
const readline = require('readline');
const db = require('../config/db');
const phoneValidator = require('../utils/phoneValidator');

async function importOldData() {
    console.log('🚀 Starting import of olddata.csv to MySQL table old_data_mobiles...');

    // 1. Ensure table exists
    await db.execute(`
        CREATE TABLE IF NOT EXISTS \`old_data_mobiles\` (
            \`mobile\` VARCHAR(20) NOT NULL,
            PRIMARY KEY (\`mobile\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Locate CSV
    const possibleCsvPaths = [
        path.join(__dirname, '../../olddata.csv'),
        path.join(__dirname, '../olddata.csv'),
        path.join(process.cwd(), 'olddata.csv')
    ];

    const csvPath = possibleCsvPaths.find(p => fs.existsSync(p));
    if (!csvPath) {
        console.error('❌ CSV file olddata.csv not found!');
        process.exit(1);
    }

    console.log(`📂 Found CSV file at: ${csvPath}`);

    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let batch = [];
    const BATCH_SIZE = 2000;
    let totalImported = 0;
    let lineCount = 0;

    for await (const line of rl) {
        lineCount++;
        const clean = phoneValidator.normalizePhone(line.trim());
        if (clean && clean.length === 10) {
            batch.push([clean]);
        }

        if (batch.length >= BATCH_SIZE) {
            await db.query('INSERT IGNORE INTO old_data_mobiles (mobile) VALUES ?', [batch]);
            totalImported += batch.length;
            console.log(`   Processed ${lineCount} lines... (${totalImported} inserted)`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await db.query('INSERT IGNORE INTO old_data_mobiles (mobile) VALUES ?', [batch]);
        totalImported += batch.length;
    }

    console.log(`✅ Import finished! Processed ${lineCount} lines, saved to DB.`);
}

if (require.main === module) {
    importOldData()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Import failed:', err);
            process.exit(1);
        });
}

module.exports = importOldData;
