const fs = require('fs');
const path = require('path');
const readline = require('readline');
const db = require('../config/db');

class PhoneValidator {
    constructor() {
        this.blockedMobilesSet = new Set();
        this.isLoaded = false;
        this.isLoading = false;
    }

    /**
     * Normalize a phone number to standard 10-digit format
     * Removes non-digits and extracts last 10 digits
     */
    normalizePhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length >= 10) {
            return digits.slice(-10);
        }
        return digits;
    }

    /**
     * Initialize / load blocked numbers from CSV and Database
     */
    async init() {
        if (this.isLoaded || this.isLoading) return;
        this.isLoading = true;

        try {
            console.log('[PhoneValidator] Initializing mobile number blacklist...');

            // 1. Try loading from olddata.csv
            const possibleCsvPaths = [
                path.join(__dirname, '../../olddata.csv'),
                path.join(__dirname, '../olddata.csv'),
                path.join(process.cwd(), 'olddata.csv')
            ];

            let csvPath = possibleCsvPaths.find(p => fs.existsSync(p));

            if (csvPath) {
                console.log(`[PhoneValidator] Reading CSV from: ${csvPath}`);
                const fileStream = fs.createReadStream(csvPath);
                const rl = readline.createInterface({
                    input: fileStream,
                    crlfDelay: Infinity
                });

                for await (const line of rl) {
                    const clean = this.normalizePhone(line.trim());
                    if (clean && clean.length === 10) {
                        this.blockedMobilesSet.add(clean);
                    }
                }
                console.log(`[PhoneValidator] Loaded ${this.blockedMobilesSet.size} numbers from CSV.`);
            }

            // 2. Also try loading from old_data_mobiles table in DB if table exists
            try {
                const [rows] = await db.execute('SELECT mobile FROM old_data_mobiles');
                let dbCount = 0;
                for (const row of rows) {
                    const clean = this.normalizePhone(row.mobile);
                    if (clean && clean.length === 10) {
                        if (!this.blockedMobilesSet.has(clean)) {
                            this.blockedMobilesSet.add(clean);
                            dbCount++;
                        }
                    }
                }
                if (dbCount > 0) {
                    console.log(`[PhoneValidator] Loaded ${dbCount} additional numbers from database.`);
                }
            } catch (dbErr) {
                // Table might not exist yet during initial setup
            }

            this.isLoaded = true;
            console.log(`[PhoneValidator] Blacklist initialized with total ${this.blockedMobilesSet.size} numbers.`);
        } catch (err) {
            console.error('[PhoneValidator] Error initializing blacklist:', err.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Check if a mobile number is blocked / present in olddata
     */
    async isMobileBlocked(rawPhone) {
        if (!rawPhone) return false;
        const clean = this.normalizePhone(rawPhone);
        if (!clean || clean.length < 10) return false;

        // Ensure blacklist is loaded
        if (!this.isLoaded) {
            await this.init();
        }

        // Check in-memory Set
        if (this.blockedMobilesSet.has(clean)) {
            return true;
        }

        // DB Fallback Check
        try {
            const [rows] = await db.execute(
                'SELECT 1 FROM old_data_mobiles WHERE mobile = ? OR mobile = ? LIMIT 1',
                [rawPhone, clean]
            );
            if (rows.length > 0) {
                this.blockedMobilesSet.add(clean);
                return true;
            }
        } catch (err) {
            // Ignore DB lookup error if table does not exist
        }

        return false;
    }
}

const phoneValidator = new PhoneValidator();
module.exports = phoneValidator;
