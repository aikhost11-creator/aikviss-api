require('dotenv').config();
const mysql = require('mysql2');

const RETRYABLE_DB_ERRORS = new Set([
    'ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'ETIMEDOUT',
    'EPIPE',
    'ECONNREFUSED'
]);

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, args, opts = {}) {
    const {
        retries = 3,
        baseDelayMs = 150,
        maxDelayMs = 1500
    } = opts;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn(...args);
        } catch (err) {
            lastErr = err;
            const code = err?.code;
            const shouldRetry = RETRYABLE_DB_ERRORS.has(code);
            if (!shouldRetry || attempt === retries) {
                throw err;
            }
            const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
            await sleep(delay);
        }
    }
    throw lastErr;
}

function toSafeInt(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * MySQL prepared statements often reject LIMIT/OFFSET placeholders
 * (ER_WRONG_ARGUMENTS / Incorrect arguments to mysqld_stmt_execute).
 * Inline validated integers only — never raw user strings.
 */
function inlineLimitOffset(sql, params = []) {
    if (!sql || !params?.length) return { sql, params };

    let nextSql = sql;
    const nextParams = [...params];

    if (/LIMIT\s+\?\s+OFFSET\s+\?/i.test(nextSql)) {
        const offset = toSafeInt(nextParams.pop(), 0);
        const limit = toSafeInt(nextParams.pop(), 20);
        nextSql = nextSql.replace(/LIMIT\s+\?\s+OFFSET\s+\?/i, `LIMIT ${limit} OFFSET ${offset}`);
        return { sql: nextSql, params: nextParams };
    }

    if (/LIMIT\s+\?/i.test(nextSql)) {
        const limit = toSafeInt(nextParams.pop(), 20);
        nextSql = nextSql.replace(/LIMIT\s+\?/i, `LIMIT ${limit}`);
        return { sql: nextSql, params: nextParams };
    }

    return { sql: nextSql, params: nextParams };
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT || 3306),
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 25),
    queueLimit: 0,
    timezone: '+05:30',
    initCommand: "SET time_zone = '+05:30'"
});

pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err);
});

const db = pool.promise();

const _execute = db.execute.bind(db);
const _query = db.query.bind(db);

db.execute = async (sql, params = []) => {
    const fixed = inlineLimitOffset(sql, params);
    return withRetry(_execute, [fixed.sql, fixed.params]);
};

db.query = async (sql, params = []) => {
    const fixed = inlineLimitOffset(sql, params);
    return withRetry(_query, [fixed.sql, fixed.params]);
};

module.exports = db;
