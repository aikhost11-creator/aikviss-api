/**
 * Rebuild API/data/blocked_mobiles.json from olddata.csv
 * Usage: node scripts/buildBlockedMobiles.js
 */
const fs = require('fs');
const path = require('path');

const csvCandidates = [
    path.join(__dirname, '../../olddata.csv'),
    path.join(__dirname, '../olddata.csv'),
    path.join(process.cwd(), 'olddata.csv'),
];
const csvPath = csvCandidates.find((p) => fs.existsSync(p));
if (!csvPath) {
    console.error('olddata.csv not found');
    process.exit(1);
}

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const set = new Set();
let skipped = 0;
for (let i = 1; i < lines.length; i++) {
    const digits = String(lines[i] || '').trim().replace(/\D/g, '');
    if (digits.length >= 10) set.add(digits.slice(-10));
    else if (String(lines[i] || '').trim()) skipped++;
}
const arr = [...set].sort();
const outDir = path.join(__dirname, '../data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'blocked_mobiles.json'), JSON.stringify(arr));
fs.writeFileSync(
    path.join(outDir, 'blocked_mobiles.meta.json'),
    JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: csvPath,
        totalUnique: arr.length,
        skippedInvalid: skipped,
    }, null, 2)
);
console.log(`Wrote ${arr.length} numbers → data/blocked_mobiles.json (skipped ${skipped})`);
