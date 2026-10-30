const fs = require('fs');
const path = require('path');
const db = require('../config/db');

class PhoneValidator {
    constructor() {
        this.blockedMobilesSet = new Set();
        this.adminBlockedSet = new Set();
        this.isLoaded = false;
        this.isLoading = false;
        this.adminReady = false;
        // Sync preload so first request never races
        this.loadJsonSync();
    }

    normalizePhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length >= 10) return digits.slice(-10);
        return digits;
    }

    loadJsonSync() {
        const jsonPaths = [
            path.join(__dirname, '../data/blocked_mobiles.json'),
            path.join(process.cwd(), 'data/blocked_mobiles.json'),
            path.join(process.cwd(), 'API/data/blocked_mobiles.json'),
        ];
        const jsonPath = jsonPaths.find((p) => fs.existsSync(p));
        if (!jsonPath) {
            console.warn('[PhoneValidator] blocked_mobiles.json not found at startup');
            return;
        }
        try {
            const arr = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (!Array.isArray(arr)) throw new Error('JSON must be an array');
            for (const m of arr) {
                const clean = this.normalizePhone(m);
                if (clean && clean.length === 10) this.blockedMobilesSet.add(clean);
            }
            this.isLoaded = true;
            console.log(`[PhoneValidator] Sync-loaded ${this.blockedMobilesSet.size} blocked mobiles from ${jsonPath}`);
        } catch (e) {
            console.error('[PhoneValidator] Failed to load JSON:', e.message);
        }
    }

    async init() {
        if (this.isLoading || this.adminReady) return;
        this.isLoading = true;
        try {
            if (this.blockedMobilesSet.size === 0) this.loadJsonSync();

            // DB supplement
            try {
                const [rows] = await db.execute('SELECT mobile FROM old_data_mobiles');
                let dbCount = 0;
                for (const row of rows) {
                    const clean = this.normalizePhone(row.mobile);
                    if (clean && clean.length === 10 && !this.blockedMobilesSet.has(clean)) {
                        this.blockedMobilesSet.add(clean);
                        dbCount++;
                    }
                }
                if (dbCount > 0) console.log(`[PhoneValidator] +${dbCount} from old_data_mobiles table`);
            } catch (_) { /* table may not exist */ }

            try {
                const [adminRows] = await db.execute('SELECT mobile FROM admin_blocked_mobiles');
                for (const row of adminRows) {
                    const clean = this.normalizePhone(row.mobile);
                    if (clean && clean.length === 10) this.adminBlockedSet.add(clean);
                }
                if (adminRows.length) {
                    console.log(`[PhoneValidator] ${this.adminBlockedSet.size} admin-blocked mobiles`);
                }
            } catch (_) { /* table may not exist yet */ }

            this.isLoaded = true;
            this.adminReady = true;
            console.log(`[PhoneValidator] Ready — ${this.blockedMobilesSet.size} blocked numbers`);
        } catch (err) {
            console.error('[PhoneValidator] Init error:', err.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Returns true if this mobile is in olddata blacklist — order must NOT be inserted in DB
     */
    async isMobileBlocked(rawPhone) {
        if (!rawPhone) return false;
        const clean = this.normalizePhone(rawPhone);
        if (!clean || clean.length < 10) return false;

        if (!this.isLoaded || this.blockedMobilesSet.size === 0) {
            await this.init();
        }

        if (this.blockedMobilesSet.has(clean)) return true;
        if (this.adminBlockedSet.has(clean)) return true;

        // Live DB fallback — old file list
        try {
            const [rows] = await db.execute(
                'SELECT 1 FROM old_data_mobiles WHERE mobile = ? OR mobile = ? LIMIT 1',
                [String(rawPhone), clean]
            );
            if (rows.length > 0) {
                this.blockedMobilesSet.add(clean);
                return true;
            }
        } catch (_) {}

        // Live DB fallback — numbers the shop admin added / edited / uploaded
        try {
            const [rows] = await db.execute(
                'SELECT 1 FROM admin_blocked_mobiles WHERE mobile = ? LIMIT 1',
                [clean]
            );
            if (rows.length > 0) {
                this.adminBlockedSet.add(clean);
                return true;
            }
        } catch (_) {}

        return false;
    }

    rememberAdmin(rawPhone) {
        const clean = this.normalizePhone(rawPhone);
        if (clean && clean.length === 10) this.adminBlockedSet.add(clean);
    }

    forgetAdmin(rawPhone) {
        const clean = this.normalizePhone(rawPhone);
        if (clean) this.adminBlockedSet.delete(clean);
    }

    getCount() {
        return this.blockedMobilesSet.size;
    }
}

const phoneValidator = new PhoneValidator();
module.exports = phoneValidator;
