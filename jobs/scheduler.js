/**
 * Zero-dependency daily scheduler (Asia/Kolkata).
 * Fires order cleanup every day at 22:00 IST.
 */
const { cleanupOldOrders } = require('./cleanupOldOrders');

let started = false;
let timer = null;

/** Current instant as calendar parts in Asia/Kolkata */
function istNowParts(date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(
        fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
    );
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
    };
}

/** IST wall-clock → UTC Date (IST = UTC+5:30; Date.UTC normalizes negative mins) */
function istWallToUtcDate({ year, month, day, hour = 0, minute = 0, second = 0 }) {
    return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second));
}

function msUntilNextRun(hour = 22, minute = 0) {
    const now = new Date();
    const p = istNowParts(now);
    let target = istWallToUtcDate({
        year: p.year,
        month: p.month,
        day: p.day,
        hour,
        minute,
        second: 0,
    });
    if (target.getTime() <= now.getTime()) {
        target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    }
    return Math.max(1000, target.getTime() - now.getTime());
}

async function runCleanupSafe() {
    console.log('[scheduler] 10 PM IST — running order cleanup…');
    try {
        await cleanupOldOrders();
    } catch (err) {
        console.error('[scheduler] Order cleanup failed:', err.message || err);
    }
}

function armNext() {
    const wait = msUntilNextRun(22, 0);
    const mins = Math.round(wait / 60000);
    console.log(`[scheduler] Next order cleanup in ~${mins} min (22:00 Asia/Kolkata)`);
    timer = setTimeout(async () => {
        await runCleanupSafe();
        armNext();
    }, wait);
    if (typeof timer.unref === 'function') timer.unref();
}

function startScheduler() {
    if (started) return;
    started = true;
    armNext();
    console.log('[scheduler] Order cleanup armed → daily 22:00 Asia/Kolkata');
}

function stopScheduler() {
    if (timer) clearTimeout(timer);
    timer = null;
    started = false;
}

module.exports = { startScheduler, stopScheduler, msUntilNextRun };
