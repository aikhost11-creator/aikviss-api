const db = require('../config/db');
const phoneValidator = require('../utils/phoneValidator');

const CREATE_SQL = `
    CREATE TABLE IF NOT EXISTS \`admin_blocked_mobiles\` (
        \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
        \`mobile\`     VARCHAR(10)  NOT NULL,
        \`note\`       VARCHAR(255) DEFAULT NULL,
        \`source\`     VARCHAR(20)  NOT NULL DEFAULT 'manual',
        \`created_at\` DATETIME     NOT NULL,
        \`updated_at\` DATETIME     NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_admin_blocked_mobile\` (\`mobile\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function ensureSchema() {
    await db.execute(CREATE_SQL);
}

function cleanMobile(raw) {
    const mobile = phoneValidator.normalizePhone(raw);
    if (!mobile || mobile.length !== 10) return '';
    return mobile;
}

function extractFromText(text) {
    const found = new Set();
    let skipped = 0;
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
    for (const line of lines) {
        if (!line.trim()) continue;
        const cells = line.split(/[,;\t|]/);
        let hit = false;
        for (const cell of cells) {
            const mobile = cleanMobile(cell);
            if (mobile) {
                found.add(mobile);
                hit = true;
            }
        }
        if (!hit && !(/mobile|phone|number|contact/i.test(line) && !/\d{6,}/.test(line))) {
            skipped++;
        }
    }
    return { mobiles: [...found], skipped };
}

async function list({ search = '', page = 1, limit = 20 } = {}) {
    await ensureSchema();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;
    const like = `%${String(search || '').replace(/\D/g, '').slice(0, 10)}%`;
    const hasSearch = String(search || '').trim().length > 0;

    const where = hasSearch ? 'WHERE mobile LIKE ?' : '';
    const params = hasSearch ? [like] : [];

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS c FROM admin_blocked_mobiles ${where}`,
        params
    );
    const [rows] = await db.execute(
        `SELECT id, mobile, note, source, created_at, updated_at
         FROM admin_blocked_mobiles
         ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
    );
    return {
        data: rows,
        totalCount: Number(countRows[0].c) || 0,
        page: safePage,
        limit: safeLimit
    };
}

async function addOne(rawMobile, note) {
    await ensureSchema();
    const mobile = cleanMobile(rawMobile);
    if (!mobile) {
        const err = new Error('Enter a valid 10-digit mobile number');
        err.status = 400;
        throw err;
    }
    const now = new Date();
    try {
        const [res] = await db.execute(
            `INSERT INTO admin_blocked_mobiles (mobile, note, source, created_at, updated_at)
             VALUES (?, ?, 'manual', ?, ?)`,
            [mobile, note ? String(note).slice(0, 255) : null, now, now]
        );
        phoneValidator.rememberAdmin(mobile);
        return { id: res.insertId, mobile };
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const dup = new Error('This number is already blocked');
            dup.status = 409;
            throw dup;
        }
        throw err;
    }
}

async function updateOne(id, rawMobile, note) {
    await ensureSchema();
    const mobile = cleanMobile(rawMobile);
    if (!mobile) {
        const err = new Error('Enter a valid 10-digit mobile number');
        err.status = 400;
        throw err;
    }
    const [existing] = await db.execute(
        'SELECT id, mobile FROM admin_blocked_mobiles WHERE id = ? LIMIT 1',
        [id]
    );
    if (!existing.length) {
        const err = new Error('Number not found');
        err.status = 404;
        throw err;
    }
    const now = new Date();
    try {
        await db.execute(
            `UPDATE admin_blocked_mobiles
             SET mobile = ?, note = ?, source = 'edit', updated_at = ?
             WHERE id = ?`,
            [mobile, note ? String(note).slice(0, 255) : null, now, id]
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const dup = new Error('This number is already blocked');
            dup.status = 409;
            throw dup;
        }
        throw err;
    }
    if (existing[0].mobile !== mobile) phoneValidator.forgetAdmin(existing[0].mobile);
    phoneValidator.rememberAdmin(mobile);
    return { id: Number(id), mobile };
}

async function removeOne(id) {
    await ensureSchema();
    const [existing] = await db.execute(
        'SELECT id, mobile FROM admin_blocked_mobiles WHERE id = ? LIMIT 1',
        [id]
    );
    if (!existing.length) {
        const err = new Error('Number not found');
        err.status = 404;
        throw err;
    }
    await db.execute('DELETE FROM admin_blocked_mobiles WHERE id = ?', [id]);
    phoneValidator.forgetAdmin(existing[0].mobile);
    return { id: Number(id), mobile: existing[0].mobile };
}

async function bulkAdd(mobiles, source = 'csv') {
    await ensureSchema();
    const unique = [...new Set(mobiles.map(cleanMobile).filter(Boolean))];
    let added = 0;
    const now = new Date();
    const chunkSize = 500;
    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '(?,?,?,?,?)').join(',');
        const params = [];
        for (const mobile of chunk) {
            params.push(mobile, null, source, now, now);
        }
        const [res] = await db.query(
            `INSERT IGNORE INTO admin_blocked_mobiles (mobile, note, source, created_at, updated_at)
             VALUES ${placeholders}`,
            params
        );
        added += res.affectedRows || 0;
        for (const mobile of chunk) phoneValidator.rememberAdmin(mobile);
    }
    const [countRows] = await db.execute('SELECT COUNT(*) AS c FROM admin_blocked_mobiles');
    return {
        received: mobiles.length,
        unique: unique.length,
        added,
        alreadyThere: unique.length - added,
        total: Number(countRows[0].c) || 0
    };
}

module.exports = {
    ensureSchema,
    cleanMobile,
    extractFromText,
    list,
    addOne,
    updateOne,
    removeOne,
    bulkAdd
};
