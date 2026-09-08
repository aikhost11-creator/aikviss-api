const db = require('../config/db');
const phoneValidator = require('../utils/phoneValidator');

async function createOrder(data) {
    // Final safety: olddata mobiles must NEVER be inserted
    const phone = data.contactPhone || data.phone || data.mobile || '';
    if (phone && await phoneValidator.isMobileBlocked(phone)) {
        const err = new Error('Your order is already created');
        err.code = 'ORDER_BLOCKED_OLDDATA';
        err.alreadyExists = true;
        throw err;
    }

    const now = new Date();
    const [result] = await db.execute(
        `INSERT INTO orders
            (customerId, orderNumber, items, subtotal, deliveryCharge, total,
             deliveryAddress, contactPhone, guestName, guestEmail,
             paymentMethod, paymentId, razorpayOrderId, razorpayPaymentId,
             status, notes, shipeaso_response, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            data.customerId        || null,
            data.orderNumber,
            JSON.stringify(data.items || []),
            data.subtotal          || 0,
            data.deliveryCharge    ?? 0,
            data.total             || 0,
            JSON.stringify(data.deliveryAddress || null),
            data.contactPhone      || null,
            data.guestName         || null,
            data.guestEmail        || null,
            data.paymentMethod     || 'cod',
            data.paymentId         || null,
            data.razorpayOrderId   || null,
            data.razorpayPaymentId || null,
            data.status            || 'confirmed',
            data.notes             || null,
            null,
            now, now
        ]
    );
    return result.insertId;
}

async function saveShipeasoResponse(orderId, responseJson) {
    await db.execute(
        'UPDATE orders SET shipeaso_response=?, updated_at=NOW() WHERE id=?',
        [responseJson, orderId]
    );
}

async function getAllOrders(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;

    // ── Build WHERE clause ────────────────────────────────────────────────────
    const conditions = [];
    const params     = [];

    if (filters.status) {
        conditions.push('o.status = ?');
        params.push(filters.status);
    }
    if (filters.search) {
        conditions.push('(o.orderNumber LIKE ? OR o.guestName LIKE ? OR o.guestEmail LIKE ? OR o.contactPhone LIKE ? OR CONCAT(c.firstName," ",c.lastName) LIKE ?)');
        const like = `%${filters.search}%`;
        params.push(like, like, like, like, like);
    }
    if (filters.dateFrom) {
        conditions.push('DATE(o.created_at) >= ?');
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push('DATE(o.created_at) <= ?');
        params.push(filters.dateTo);
    }
    if (filters.paymentMethod) {
        conditions.push('o.paymentMethod = ?');
        params.push(filters.paymentMethod);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // ── Orders ────────────────────────────────────────────────────────────────
    const [rows] = await db.execute(
        `SELECT o.*,
                COALESCE(c.firstName, '') AS firstName,
                COALESCE(c.lastName,  '') AS lastName,
                COALESCE(c.email, o.guestEmail) AS email
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customerId
         ${where}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // ── Filtered total ────────────────────────────────────────────────────────
    const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) as total FROM orders o
         LEFT JOIN customers c ON c.id = o.customerId ${where}`,
        params
    );

    // ── Status counts (always global, not filtered) ───────────────────────────
    const [statusCounts] = await db.execute(
        `SELECT status, COUNT(*) as cnt, COALESCE(SUM(total),0) as revenue
         FROM orders GROUP BY status`
    );

    // ── Time-based counts ─────────────────────────────────────────────────────
    const [[timeRows]] = await db.execute(`
        SELECT
            SUM(DATE(created_at) = CURDATE())                                      AS today,
            SUM(DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY))            AS yesterday,
            SUM(DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY))           AS last7days,
            SUM(YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())) AS thisMonth
        FROM orders
    `);

    const stats = {
        total: 0, pending: 0, confirmed: 0, processing: 0,
        shipped: 0, delivered: 0, cancelled: 0, revenue: 0,
        today:     parseInt(timeRows.today)     || 0,
        yesterday: parseInt(timeRows.yesterday) || 0,
        last7days: parseInt(timeRows.last7days) || 0,
        thisMonth: parseInt(timeRows.thisMonth) || 0,
    };
    let grandTotal = 0;
    statusCounts.forEach((r) => {
        stats[r.status] = parseInt(r.cnt) || 0;
        grandTotal += parseInt(r.cnt) || 0;
        if (r.status !== 'cancelled') stats.revenue += parseFloat(r.revenue) || 0;
    });
    stats.total = grandTotal;

    return { orders: rows, total, page, limit, stats };
}

async function getOrderById(id) {
    const [rows] = await db.execute(
        `SELECT o.*,
                COALESCE(c.firstName, o.guestName) AS firstName,
                COALESCE(c.lastName,  '')           AS lastName,
                COALESCE(c.email, o.guestEmail)     AS email
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customerId
         WHERE o.id = ?`,
        [id]
    );
    return rows[0] || null;
}

async function getOrdersByCustomerId(customerId) {
    const [rows] = await db.execute(
        'SELECT * FROM orders WHERE customerId = ? ORDER BY created_at DESC',
        [customerId]
    );
    return rows;
}

async function updateOrderStatus(id, status) {
    const now = new Date();
    await db.execute('UPDATE orders SET status=?, updated_at=? WHERE id=?', [status, now, id]);
    return await getOrderById(id);
}

async function getAllOrdersForExport(filters = {}) {
    const conditions = [];
    const params     = [];

    if (filters.status) {
        conditions.push('o.status = ?');
        params.push(filters.status);
    }
    if (filters.search) {
        conditions.push('(o.orderNumber LIKE ? OR o.guestName LIKE ? OR o.guestEmail LIKE ? OR o.contactPhone LIKE ? OR CONCAT(c.firstName," ",c.lastName) LIKE ?)');
        const like = `%${filters.search}%`;
        params.push(like, like, like, like, like);
    }
    if (filters.dateFrom) {
        conditions.push('DATE(o.created_at) >= ?');
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push('DATE(o.created_at) <= ?');
        params.push(filters.dateTo);
    }
    if (filters.paymentMethod) {
        conditions.push('o.paymentMethod = ?');
        params.push(filters.paymentMethod);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.execute(
        `SELECT o.*,
                COALESCE(c.firstName, '') AS firstName,
                COALESCE(c.lastName,  '') AS lastName,
                COALESCE(c.email, o.guestEmail) AS email
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customerId
         ${where}
         ORDER BY o.created_at DESC`,
        params
    );
    return rows;
}

/** Preview counts for permanent bulk delete by date range (inclusive, DATE only) */
async function getDeletePreview(dateFrom, dateTo) {
    const fromTs = `${dateFrom} 00:00:00`;
    const toTs = `${dateTo} 23:59:59`;
    const params = [fromTs, toTs];
    const [rows] = await db.execute(
        `SELECT
            COUNT(*) AS total,
            SUM(
                CASE
                    WHEN o.shipeaso_response IS NOT NULL
                     AND o.shipeaso_response != ''
                     AND JSON_UNQUOTE(JSON_EXTRACT(o.shipeaso_response, '$.error')) IS NULL
                    THEN 1 ELSE 0
                END
            ) AS synced,
            SUM(
                CASE
                    WHEN o.shipeaso_response IS NULL
                      OR o.shipeaso_response = ''
                      OR JSON_UNQUOTE(JSON_EXTRACT(o.shipeaso_response, '$.error')) IS NOT NULL
                    THEN 1 ELSE 0
                END
            ) AS unsynced,
            COALESCE(SUM(o.total), 0) AS totalAmount
         FROM orders o
         WHERE o.created_at >= ?
           AND o.created_at <= ?`,
        params
    );
    const r = rows[0] || {};
    return {
        total: Number(r.total || 0),
        synced: Number(r.synced || 0),
        unsynced: Number(r.unsynced || 0),
        totalAmount: Number(r.totalAmount || 0),
        dateFrom,
        dateTo
    };
}

/** Permanently delete ALL orders in date range — hard DELETE from DB */
async function bulkDeleteByDateRange(dateFrom, dateTo) {
    const fromTs = `${dateFrom} 00:00:00`;
    const toTs = `${dateTo} 23:59:59`;

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total FROM orders
         WHERE created_at >= ? AND created_at <= ?`,
        [fromTs, toTs]
    );
    const toDelete = Number(countRows[0]?.total || 0);
    if (toDelete === 0) {
        return { deleted: 0, remaining: 0 };
    }

    // Delete in batches so large ranges don't lock forever / timeout
    let deleted = 0;
    let safety = 0;
    while (safety < 500) {
        safety++;
        const [result] = await db.execute(
            `DELETE FROM orders
             WHERE created_at >= ? AND created_at <= ?
             LIMIT 2000`,
            [fromTs, toTs]
        );
        const n = result.affectedRows || 0;
        deleted += n;
        if (n === 0) break;
    }

    const [leftRows] = await db.execute(
        `SELECT COUNT(*) AS remaining FROM orders
         WHERE created_at >= ? AND created_at <= ?`,
        [fromTs, toTs]
    );

    return {
        deleted,
        remaining: Number(leftRows[0]?.remaining || 0)
    };
}

module.exports = {
    createOrder,
    getAllOrders,
    getAllOrdersForExport,
    saveShipeasoResponse,
    getOrderById,
    getOrdersByCustomerId,
    updateOrderStatus,
    getDeletePreview,
    bulkDeleteByDateRange
};
