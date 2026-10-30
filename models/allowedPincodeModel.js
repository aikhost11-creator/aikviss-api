const db = require('../config/db');

const CREATE_SQL = `
    CREATE TABLE IF NOT EXISTS \`allowed_pincodes\` (
        \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
        \`pincode\`    VARCHAR(6)   NOT NULL,
        \`note\`       VARCHAR(255) DEFAULT NULL,
        \`source\`     VARCHAR(20)  NOT NULL DEFAULT 'manual',
        \`created_at\` DATETIME     NOT NULL,
        \`updated_at\` DATETIME     NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_allowed_pincode\` (\`pincode\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const REJECT_MESSAGE = 'Delivery is not available for this pincode';
let schemaReady = false;

async function ensureSchema() {
    if (schemaReady) return;
    await db.execute(CREATE_SQL);
    try {
        await db.execute(
            'ALTER TABLE siteconfig ADD COLUMN is_validate_pincode TINYINT(1) NOT NULL DEFAULT 0'
        );
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
    schemaReady = true;
}

function cleanPincode(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    return digits.length === 6 ? digits : '';
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
            const pin = cleanPincode(cell);
            if (pin) {
                found.add(pin);
                hit = true;
            }
        }
        if (!hit && !(/pincode|pin code|postcode|postal/i.test(line) && !/\d{6}/.test(line))) {
            skipped++;
        }
    }
    return { pincodes: [...found], skipped };
}

async function getFlag() {
    try {
        const [rows] = await db.execute(
            'SELECT is_validate_pincode FROM siteconfig WHERE id = 1 LIMIT 1'
        );
        return rows.length ? Number(rows[0].is_validate_pincode) === 1 : false;
    } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') return false;
        throw err;
    }
}

async function setFlag(on) {
    await ensureSchema();
    const flag = on ? 1 : 0;
    await db.execute(
        'UPDATE siteconfig SET is_validate_pincode = ?, updated_at = NOW() WHERE id = 1',
        [flag]
    );
    return flag === 1;
}

async function list({ search = '', page = 1, limit = 20 } = {}) {
    await ensureSchema();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;
    const digits = String(search || '').replace(/\D/g, '').slice(0, 6);
    const hasSearch = digits.length > 0;
    const where = hasSearch ? 'WHERE pincode LIKE ?' : '';
    const params = hasSearch ? [`%${digits}%`] : [];

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS c FROM allowed_pincodes ${where}`,
        params
    );
    const [rows] = await db.execute(
        `SELECT id, pincode, note, source, created_at, updated_at
         FROM allowed_pincodes
         ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
    );
    return {
        data: rows,
        totalCount: Number(countRows[0].c) || 0,
        page: safePage,
        limit: safeLimit,
        is_validate_pincode: await getFlag()
    };
}

async function addOne(raw, note) {
    await ensureSchema();
    const pincode = cleanPincode(raw);
    if (!pincode) {
        const err = new Error('Enter a valid 6-digit pincode');
        err.status = 400;
        throw err;
    }
    const now = new Date();
    try {
        const [res] = await db.execute(
            `INSERT INTO allowed_pincodes (pincode, note, source, created_at, updated_at)
             VALUES (?, ?, 'manual', ?, ?)`,
            [pincode, note ? String(note).slice(0, 255) : null, now, now]
        );
        return { id: res.insertId, pincode };
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const dup = new Error('This pincode is already allowed');
            dup.status = 409;
            throw dup;
        }
        throw err;
    }
}

async function updateOne(id, raw, note) {
    await ensureSchema();
    const pincode = cleanPincode(raw);
    if (!pincode) {
        const err = new Error('Enter a valid 6-digit pincode');
        err.status = 400;
        throw err;
    }
    const [existing] = await db.execute(
        'SELECT id FROM allowed_pincodes WHERE id = ? LIMIT 1',
        [id]
    );
    if (!existing.length) {
        const err = new Error('Pincode not found');
        err.status = 404;
        throw err;
    }
    const now = new Date();
    try {
        await db.execute(
            `UPDATE allowed_pincodes
             SET pincode = ?, note = ?, source = 'edit', updated_at = ?
             WHERE id = ?`,
            [pincode, note ? String(note).slice(0, 255) : null, now, id]
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const dup = new Error('This pincode is already allowed');
            dup.status = 409;
            throw dup;
        }
        throw err;
    }
    return { id: Number(id), pincode };
}

async function removeOne(id) {
    await ensureSchema();
    const [existing] = await db.execute(
        'SELECT id, pincode FROM allowed_pincodes WHERE id = ? LIMIT 1',
        [id]
    );
    if (!existing.length) {
        const err = new Error('Pincode not found');
        err.status = 404;
        throw err;
    }
    await db.execute('DELETE FROM allowed_pincodes WHERE id = ?', [id]);
    return { id: Number(id), pincode: existing[0].pincode };
}

async function bulkAdd(pincodes, source = 'csv') {
    await ensureSchema();
    const unique = [...new Set(pincodes.map(cleanPincode).filter(Boolean))];
    let added = 0;
    const now = new Date();
    const chunkSize = 500;
    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '(?,?,?,?,?)').join(',');
        const params = [];
        for (const pincode of chunk) params.push(pincode, null, source, now, now);
        const [res] = await db.query(
            `INSERT IGNORE INTO allowed_pincodes (pincode, note, source, created_at, updated_at)
             VALUES ${placeholders}`,
            params
        );
        added += res.affectedRows || 0;
    }
    const [countRows] = await db.execute('SELECT COUNT(*) AS c FROM allowed_pincodes');
    return {
        received: pincodes.length,
        unique: unique.length,
        added,
        alreadyThere: unique.length - added,
        total: Number(countRows[0].c) || 0
    };
}

function extractOrderPincode(data) {
    let addr = data?.deliveryAddress;
    if (typeof addr === 'string') {
        try { addr = JSON.parse(addr); } catch { addr = null; }
    }
    return cleanPincode(
        addr?.postcode || addr?.pincode || addr?.pinCode || data?.pincode || data?.postcode || ''
    );
}

async function checkPincode(raw) {
    let validate = false;
    try {
        validate = await getFlag();
    } catch (err) {
        console.error('[Pincode] could not read switch, allowing checkout:', err.message);
        return { is_validate_pincode: false, allowed: true, message: '' };
    }
    if (!validate) {
        return { is_validate_pincode: false, allowed: true, message: '' };
    }
    const pincode = cleanPincode(raw);
    if (!pincode) {
        return { is_validate_pincode: true, allowed: false, message: REJECT_MESSAGE };
    }
    try {
        const [rows] = await db.execute(
            'SELECT 1 FROM allowed_pincodes WHERE pincode = ? LIMIT 1',
            [pincode]
        );
        const allowed = rows.length > 0;
        return {
            is_validate_pincode: true,
            allowed,
            message: allowed ? '' : REJECT_MESSAGE
        };
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return { is_validate_pincode: false, allowed: true, message: '' };
        }
        throw err;
    }
}

module.exports = {
    ensureSchema,
    cleanPincode,
    extractFromText,
    extractOrderPincode,
    getFlag,
    setFlag,
    list,
    addOne,
    updateOne,
    removeOne,
    bulkAdd,
    checkPincode,
    REJECT_MESSAGE
};
