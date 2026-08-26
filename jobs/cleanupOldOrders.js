/**
 * Deletes orders older than the retention window (IST calendar days).
 *
 * Rule: keep only the last ORDER_RETENTION_DAYS days including today.
 *   e.g. retention=10 on 31 Jul → keep from 22 Jul 00:00 onward; delete older.
 *
 * Before delete: archive each day's orders into API/orders-logs/{d}-{m}-orders.json
 *   e.g. 21 Jul orders → orders-logs/21-7-orders.json
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const RETENTION_DAYS = Math.max(
    1,
    Math.min(365, Number(process.env.ORDER_RETENTION_DAYS || 10) || 10)
);

const LOGS_DIR = path.join(__dirname, '..', 'orders-logs');

/** INTERVAL for DATE_SUB so "keep N days including today" is exact */
function cutoffIntervalDays() {
    return RETENTION_DAYS - 1;
}

function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
}

/** "21-7-orders.json" from a Date / datetime string (IST calendar day) */
function logFileNameForDate(createdAt) {
    const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
    // created_at is stored in IST session; use UTC getters after mysql returns local-ish Date,
    // or parse YYYY-MM-DD from string to avoid TZ shift.
    let day, month;
    if (typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(createdAt)) {
        month = Number(createdAt.slice(5, 7));
        day = Number(createdAt.slice(8, 10));
    } else {
        // Format in Asia/Kolkata so filename matches business date
        const fmt = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'numeric',
        });
        const parts = Object.fromEntries(
            fmt.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
        );
        day = Number(parts.day);
        month = Number(parts.month);
    }
    // User format: 21-7-orders.json
    return `${day}-${month}-orders.json`;
}

function parseJsonField(value) {
    if (value == null) return value;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function serializeOrder(row) {
    return {
        ...row,
        items: parseJsonField(row.items),
        deliveryAddress: parseJsonField(row.deliveryAddress),
        archivedAt: new Date().toISOString(),
    };
}

/**
 * Group orders by log filename and write/merge into orders-logs/*.json
 * @returns {string[]} written file names
 */
function archiveOrdersToLogs(orders) {
    ensureLogsDir();
    const byFile = new Map();

    for (const row of orders) {
        const fileName = logFileNameForDate(row.created_at);
        if (!byFile.has(fileName)) byFile.set(fileName, []);
        byFile.get(fileName).push(serializeOrder(row));
    }

    const written = [];

    for (const [fileName, batch] of byFile) {
        const filePath = path.join(LOGS_DIR, fileName);
        let existing = [];

        if (fs.existsSync(filePath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                existing = Array.isArray(raw) ? raw : (raw.orders || []);
            } catch {
                existing = [];
            }
        }

        const byId = new Map();
        for (const o of existing) {
            if (o && o.id != null) byId.set(o.id, o);
        }
        for (const o of batch) {
            byId.set(o.id, o);
        }

        const merged = Array.from(byId.values()).sort((a, b) => a.id - b.id);
        const payload = {
            dateLabel: fileName.replace(/-orders\.json$/, ''),
            orderCount: merged.length,
            updatedAt: new Date().toISOString(),
            orders: merged,
        };

        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        written.push(fileName);
        console.log(`[order-cleanup] Archived ${batch.length} order(s) → orders-logs/${fileName}`);
    }

    return written;
}

async function cleanupOldOrders() {
    const startedAt = new Date();
    const interval = cutoffIntervalDays();

    // Fetch full rows first so we can archive before delete
    const [orders] = await db.execute(
        `SELECT *
         FROM orders
         WHERE created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
         ORDER BY created_at ASC, id ASC`,
        [interval]
    );

    if (!orders.length) {
        console.log(
            `[order-cleanup] Nothing to delete (keep last ${RETENTION_DAYS} days incl. today).`
        );
        return {
            deleted: 0,
            archivedFiles: [],
            retentionDays: RETENTION_DAYS,
            startedAt,
            finishedAt: new Date(),
        };
    }

    const archivedFiles = archiveOrdersToLogs(orders);

    // Batch deletes so large tables don't lock for too long
    const BATCH = 500;
    let deleted = 0;

    while (true) {
        const [result] = await db.query(
            `DELETE FROM orders
             WHERE created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
             LIMIT ?`,
            [interval, BATCH]
        );
        const affected = result.affectedRows || 0;
        deleted += affected;
        if (affected < BATCH) break;
    }

    // Clear dangling orderId links on abandon checkouts (no FK)
    await db.execute(
        `UPDATE abandon_checkouts ac
         LEFT JOIN orders o ON o.id = ac.orderId
         SET ac.orderId = NULL
         WHERE ac.orderId IS NOT NULL AND o.id IS NULL`
    ).catch(() => { /* table may not exist yet */ });

    const finishedAt = new Date();
    console.log(
        `[order-cleanup] Archived → [${archivedFiles.join(', ')}]; ` +
        `deleted ${deleted} order(s); kept last ${RETENTION_DAYS} day(s). ` +
        `Took ${finishedAt - startedAt}ms.`
    );

    return {
        deleted,
        archivedFiles,
        retentionDays: RETENTION_DAYS,
        startedAt,
        finishedAt,
    };
}

module.exports = { cleanupOldOrders, RETENTION_DAYS, LOGS_DIR };
