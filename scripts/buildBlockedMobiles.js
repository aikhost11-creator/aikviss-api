/**
 * Rebuild / merge API/data/blocked_mobiles.json from CSV sources.
 * Keeps existing JSON numbers and ADDS any new numbers from CSVs.
 *
 * Usage: node scripts/buildBlockedMobiles.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const outDir = path.join(__dirname, '../data');
const outJson = path.join(outDir, 'blocked_mobiles.json');
const outMeta = path.join(outDir, 'blocked_mobiles.meta.json');

function normalize(phone) {
    const digits = String(phone || '').trim().replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return '';
}

function loadIntoSet(set, filePath, label, stats) {
    if (!fs.existsSync(filePath)) {
        console.log(`[skip] ${label}: not found`);
        return;
    }
    const before = set.size;
    let skipped = 0;
    let added = 0;

    if (filePath.endsWith('.json')) {
        const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const m of arr) {
            const clean = normalize(m);
            if (clean.length === 10) {
                if (!set.has(clean)) { set.add(clean); added++; }
            } else if (String(m || '').trim()) skipped++;
        }
    } else {
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
            const clean = normalize(lines[i]);
            if (clean.length === 10) {
                if (!set.has(clean)) { set.add(clean); added++; }
            } else if (String(lines[i] || '').trim()) skipped++;
        }
    }

    stats.push({
        source: label,
        path: filePath,
        before,
        after: set.size,
        added,
        skippedInvalid: skipped,
    });
    console.log(`[ok] ${label}: +${added} new (total now ${set.size}, skipped ${skipped})`);
}

const set = new Set();
const stats = [];

// 1) Keep whatever is already in blocked_mobiles.json
loadIntoSet(set, outJson, 'existing blocked_mobiles.json', stats);

// 2) Merge CSVs (addon — does not remove existing)
const sources = [
    [path.join(root, 'olddata.csv'), 'olddata.csv'],
    [path.join(root, 'new-mobile.csv'), 'new-mobile.csv'],
    [path.join(__dirname, '../olddata.csv'), 'API/olddata.csv'],
];

for (const [p, label] of sources) {
    loadIntoSet(set, p, label, stats);
}

const arr = [...set].sort();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(arr));
fs.writeFileSync(
    outMeta,
    JSON.stringify({
        generatedAt: new Date().toISOString(),
        totalUnique: arr.length,
        sources: stats,
    }, null, 2)
);

console.log(`\nDone → ${arr.length} unique numbers written to data/blocked_mobiles.json`);
