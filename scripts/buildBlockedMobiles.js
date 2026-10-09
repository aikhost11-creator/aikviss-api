/**
 * Add numbers from CSV file(s) to API/data/blocked_mobiles.json (merge mode).
 * Existing blocked numbers are always kept; only new numbers are added.
 *
 * Usage (from API/):
 *   node scripts/buildBlockedMobiles.js                 -> merges ../ordata.csv
 *   node scripts/buildBlockedMobiles.js a.csv b.csv     -> merges the given CSVs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const outDir = path.join(__dirname, '../data');
const outJson = path.join(outDir, 'blocked_mobiles.json');
const outMeta = path.join(outDir, 'blocked_mobiles.meta.json');

function resolveCsv(name) {
    const candidates = path.isAbsolute(name)
        ? [name]
        : [path.join(process.cwd(), name), path.join(root, name)];
    return candidates.find((p) => fs.existsSync(p));
}

function normalize(phone) {
    const digits = String(phone || '').trim().replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return '';
}

const csvNames = process.argv.slice(2).length ? process.argv.slice(2) : ['ordata.csv'];
const csvPaths = csvNames.map((n) => {
    const p = resolveCsv(n);
    if (!p) {
        console.error(`${n} not found`);
        process.exit(1);
    }
    return p;
});

const set = new Set();
if (fs.existsSync(outJson)) {
    for (const n of JSON.parse(fs.readFileSync(outJson, 'utf8'))) {
        const clean = normalize(n);
        if (clean.length === 10) set.add(clean);
    }
}
const existingCount = set.size;

const sources = [];
for (const csvPath of csvPaths) {
    const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
    let valid = 0;
    let skipped = 0;
    const before = set.size;
    for (let i = 0; i < lines.length; i++) {
        const raw = String(lines[i] || '').trim();
        if (!raw) continue;
        const clean = normalize(raw);
        if (clean.length === 10) {
            set.add(clean);
            valid++;
        } else if (i > 0) {
            skipped++;
        }
    }
    sources.push({
        file: path.basename(csvPath),
        validRows: valid,
        newlyAdded: set.size - before,
        skippedInvalid: skipped,
    });
}

const arr = [...set].sort();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(arr));

const prevMeta = fs.existsSync(outMeta) ? JSON.parse(fs.readFileSync(outMeta, 'utf8')) : {};
fs.writeFileSync(
    outMeta,
    JSON.stringify({
        generatedAt: new Date().toISOString(),
        mode: 'merge',
        previousTotal: existingCount,
        totalUnique: arr.length,
        added: arr.length - existingCount,
        sources,
        history: [...(prevMeta.history || []), {
            at: prevMeta.generatedAt,
            mode: prevMeta.mode,
            source: prevMeta.source || (prevMeta.sources || []).map((s) => s.file).join(', '),
            totalUnique: prevMeta.totalUnique,
        }].filter((h) => h.at),
    }, null, 2)
);

console.log(`Existing: ${existingCount}`);
for (const s of sources) {
    console.log(`${s.file}: ${s.validRows} valid rows, ${s.newlyAdded} new, ${s.skippedInvalid} skipped`);
}
console.log(`Total now: ${arr.length} → data/blocked_mobiles.json`);
