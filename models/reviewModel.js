const db = require('../config/db');

let schemaReady = false;
let schemaPromise = null;

async function addColumnIfMissing(table, column, definition) {
    try {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
}

/**
 * Create product_reviews (+ product rating columns) if missing.
 * Safe to call on every request; runs once per process after success.
 */
async function ensureSchema() {
    if (schemaReady) return;
    if (schemaPromise) return schemaPromise;

    schemaPromise = (async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`product_reviews\` (
                \`id\`           INT(11)      NOT NULL AUTO_INCREMENT,
                \`productId\`    INT(11)      NOT NULL,
                \`reviewerName\` VARCHAR(255) NOT NULL,
                \`rating\`       TINYINT(1)   NOT NULL DEFAULT 5,
                \`title\`        VARCHAR(500) DEFAULT NULL,
                \`body\`         TEXT         DEFAULT NULL,
                \`reviewImage\`  VARCHAR(500) DEFAULT NULL,
                \`isActive\`     TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`   DATETIME     NOT NULL,
                \`updated_at\`   DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_rev_product\` (\`productId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await addColumnIfMissing('product_reviews', 'reviewImage', 'VARCHAR(500) DEFAULT NULL AFTER `body`');
        await addColumnIfMissing('product_reviews', 'title', 'VARCHAR(500) DEFAULT NULL AFTER `rating`');
        await addColumnIfMissing('product_reviews', 'body', 'TEXT DEFAULT NULL AFTER `title`');
        await addColumnIfMissing('product_reviews', 'isActive', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `reviewImage`');

        await addColumnIfMissing('products', 'avgRating', 'DECIMAL(3,2) NOT NULL DEFAULT 0.00');
        await addColumnIfMissing('products', 'reviewCount', 'INT(11) NOT NULL DEFAULT 0');

        schemaReady = true;
    })().catch((err) => {
        schemaPromise = null;
        throw err;
    });

    return schemaPromise;
}

function normalizeReview(data) {
    const reviewerName = String(data.reviewerName || data.customerName || data.name || '').trim();
    let rating = Number(data.rating);
    if (!Number.isFinite(rating)) rating = 5;
    rating = Math.max(1, Math.min(5, Math.round(rating)));
    return {
        productId: Number(data.productId),
        reviewerName,
        rating,
        title: String(data.title || '').trim().slice(0, 500),
        body: String(data.body || data.content || data.review || '').trim(),
        reviewImage: String(data.reviewImage || data.image || '').trim() || null,
        isActive: data.isActive === 0 || data.isActive === false || data.isActive === '0' ? 0 : 1,
    };
}

const Review = {
    ensureSchema,

    create: async (data) => {
        await ensureSchema();
        const row = normalizeReview(data);
        if (!row.productId) throw Object.assign(new Error('productId is required'), { status: 400 });
        if (!row.reviewerName) throw Object.assign(new Error('Customer name is required'), { status: 400 });

        const [result] = await db.execute(
            `INSERT INTO product_reviews (productId, reviewerName, rating, title, body, reviewImage, isActive, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [row.productId, row.reviewerName, row.rating, row.title, row.body, row.reviewImage, row.isActive]
        );
        return { status: 'success', data: { id: result.insertId } };
    },

    /** Insert many reviews for one product. Returns { created, skipped, errors[] } */
    bulkCreate: async (productId, rows) => {
        await ensureSchema();
        const pid = Number(productId);
        if (!pid) throw Object.assign(new Error('productId is required'), { status: 400 });

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const rowNum = i + 2; // header = row 1
            try {
                const row = normalizeReview({ ...rows[i], productId: pid });
                if (!row.reviewerName) {
                    skipped++;
                    errors.push({ row: rowNum, message: 'Customer name is required' });
                    continue;
                }
                await db.execute(
                    `INSERT INTO product_reviews (productId, reviewerName, rating, title, body, reviewImage, isActive, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
                    [pid, row.reviewerName, row.rating, row.title, row.body, row.reviewImage]
                );
                created++;
            } catch (err) {
                skipped++;
                errors.push({ row: rowNum, message: err.message || 'Insert failed' });
            }
        }

        return { status: 'success', created, skipped, errors: errors.slice(0, 50) };
    },

    update: async (id, data) => {
        await ensureSchema();
        const row = normalizeReview({ ...data, productId: data.productId || 1 });
        if (!row.reviewerName) throw Object.assign(new Error('Customer name is required'), { status: 400 });

        await db.execute(
            `UPDATE product_reviews SET reviewerName=?, rating=?, title=?, body=?, reviewImage=?, updated_at=NOW() WHERE id=?`,
            [row.reviewerName, row.rating, row.title, row.body, row.reviewImage, id]
        );
        return { status: 'success' };
    },

    getById: async (id) => {
        await ensureSchema();
        const [results] = await db.execute(`SELECT * FROM product_reviews WHERE id=? LIMIT 1`, [id]);
        return results[0] || null;
    },

    getByProduct: async (productId, limit = 10, offset = 0, sort = 'newest') => {
        await ensureSchema();
        let orderBy = 'r.created_at DESC';
        if (sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
        if (sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';

        const [results] = await db.execute(
            `SELECT * FROM product_reviews r
             WHERE r.productId = ? AND r.isActive = 1
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [productId, limit, offset]
        );

        const [countResult] = await db.execute(
            `SELECT COUNT(*) AS totalCount,
                    IFNULL(AVG(rating), 0) AS avgRating,
                    SUM(rating = 5) AS star5,
                    SUM(rating = 4) AS star4,
                    SUM(rating = 3) AS star3,
                    SUM(rating = 2) AS star2,
                    SUM(rating = 1) AS star1
             FROM product_reviews WHERE productId = ? AND isActive = 1`,
            [productId]
        );

        const stats = countResult[0] || {};
        return {
            status: 'success',
            data: results,
            stats: {
                ...stats,
                totalCount: Number(stats.totalCount) || 0,
                avgRating: Number(stats.avgRating) || 0,
                star5: Number(stats.star5) || 0,
                star4: Number(stats.star4) || 0,
                star3: Number(stats.star3) || 0,
                star2: Number(stats.star2) || 0,
                star1: Number(stats.star1) || 0,
            },
        };
    },

    getByProductAdmin: async (productId) => {
        await ensureSchema();
        const [results] = await db.execute(
            `SELECT * FROM product_reviews WHERE productId = ? ORDER BY created_at DESC`,
            [productId]
        );
        return { status: 'success', data: results };
    },

    getAllByPage: async (limit, pageNo, productId) => {
        await ensureSchema();
        const offset = (pageNo - 1) * limit;
        let where = productId ? `WHERE r.productId = ?` : '';
        let params = productId ? [productId] : [];

        const [results] = await db.execute(
            `SELECT r.*, p.name AS productName FROM product_reviews r
             LEFT JOIN products p ON r.productId = p.id
             ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [countResult] = await db.execute(
            `SELECT COUNT(*) AS totalCount FROM product_reviews r ${where}`,
            params
        );
        return { status: 'success', data: results, totalCount: countResult[0].totalCount };
    },

    updateStatus: async (id, isActive) => {
        await ensureSchema();
        await db.execute(
            `UPDATE product_reviews SET isActive=?, updated_at=NOW() WHERE id=?`,
            [isActive ? 1 : 0, id]
        );
        return { status: 'success' };
    },

    delete: async (id) => {
        await ensureSchema();
        await db.execute(`DELETE FROM product_reviews WHERE id=?`, [id]);
        return { status: 'success' };
    },
};

module.exports = Review;
