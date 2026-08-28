/**
 * Minimal CSV helpers (RFC-style quoted fields). No extra dependencies.
 */

function escapeCsvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function rowsToCsv(headers, rows) {
    const lines = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ];
    return '\uFEFF' + lines.join('\n');
}

function parseCsv(text) {
    const input = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        const next = input[i + 1];

        if (inQuotes) {
            if (c === '"' && next === '"') {
                field += '"';
                i++;
            } else if (c === '"') {
                inQuotes = false;
            } else {
                field += c;
            }
            continue;
        }

        if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field);
            field = '';
        } else if (c === '\n') {
            row.push(field);
            field = '';
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
        } else if (c === '\r') {
            // skip
        } else {
            field += c;
        }
    }

    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);

    if (!rows.length) return { headers: [], records: [] };

    const headers = rows[0].map((h) => h.trim());
    const records = rows.slice(1)
        .filter((r) => r.some((cell) => String(cell).trim() !== ''))
        .map((r) => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
            return obj;
        });

    return { headers, records };
}

function tryParseJson(val, fallback) {
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return fallback; }
}

function parseBool(val, fallback = false) {
    if (val === '' || val === null || val === undefined) return fallback;
    const s = String(val).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(s)) return true;
    if (['0', 'false', 'no', 'n'].includes(s)) return false;
    return fallback;
}

function parseNum(val, fallback = null) {
    if (val === '' || val === null || val === undefined) return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

function slugify(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

module.exports = {
    escapeCsvCell,
    rowsToCsv,
    parseCsv,
    tryParseJson,
    parseBool,
    parseNum,
    slugify,
};
