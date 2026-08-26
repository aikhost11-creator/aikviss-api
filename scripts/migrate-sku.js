require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    try {
        await conn.execute("ALTER TABLE `products` ADD COLUMN `sku` VARCHAR(100) DEFAULT NULL AFTER `slug`");
        console.log('✅ sku column added');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭  sku already exists');
        else console.error('❌', e.message);
    }
    await conn.end();
}
run().catch(console.error);
