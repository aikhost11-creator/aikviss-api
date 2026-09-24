/**
 * Rebuild API/data/blocked_mobiles.json from final.csv ONLY (replace mode).
 * Usage: node scripts/buildBlockedMobiles.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const outDir = path.join(__dirname, '../data');
const outJson = path.join(outDir, 'blocked_mobiles.json');
const outMeta = path.join(outDir, 'blocked_mobiles.meta.json');

const csvCandidates = [
    path.join(root, 'final.csv'),
    path.join(process.cwd(), 'final.csv'),
];
const csvPath = csvCandidates.find((p) => fs.existsSync(p));
if (!csvPath) {
    console.error('final.csv not found');
    process.exit(1);
}

function normalize(phone) {
    const digits = String(phone || '').trim().replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return '';
}

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const set = new Set();
let skipped = 0;
for (let i = 1; i < lines.length; i++) {
    const clean = normalize(lines[i]);
    if (clean.length === 10) set.add(clean);
    else if (String(lines[i] || '').trim()) skipped++;
}

const arr = [...set].sort();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(arr));
fs.writeFileSync(
    outMeta,
    JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: csvPath,
        mode: 'replace',
        totalUnique: arr.length,
        skippedInvalid: skipped,
        note: 'Only final.csv numbers — previous lists replaced',
    }, null, 2)
);

console.log(`Wrote ${arr.length} numbers → data/blocked_mobiles.json (skipped ${skipped})`);
