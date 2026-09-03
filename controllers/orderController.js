const { createOrder, getAllOrders, getAllOrdersForExport, saveShipeasoResponse, getOrderById, getOrdersByCustomerId, updateOrderStatus } = require('../models/orderModel');
const axios = require('axios');
const db    = require('../config/db');
const phoneValidator = require('../utils/phoneValidator');

// ── Fetch product SKU + variants for a product id ─────────────────────────────
async function getProductData(productId) {
    try {
        const [rows] = await db.execute('SELECT name, sku, variants FROM products WHERE id = ? LIMIT 1', [productId]);
        if (!rows[0]) return { name: null, sku: null, variants: [] };
        let variants = [];
        try { variants = rows[0].variants ? JSON.parse(rows[0].variants) : []; } catch {}
        return { name: rows[0].name || null, sku: rows[0].sku || null, variants };
    } catch { return { name: null, sku: null, variants: [] }; }
}

// ── Shipeaso: push order to fulfillment partner ───────────────────────────────
async function pushToShipeaso(orderId, order, items) {
    const LOG = (msg, data) => console.log(`[Shipeaso][Order ${orderId}] ${msg}`, data !== undefined ? JSON.stringify(data) : '');

    const apiUrl     = process.env.SHIPEASO_API_URL || 'https://superadmin.shipeaso.com/api/order/non-shopify-create-orders';
    const shopDomain = process.env.SHOP_DOMAIN      || 'one.alphafulfill.online';

    let payload = null;

    try {
        let address = {};
        try {
            address = typeof order.deliveryAddress === 'string'
                ? JSON.parse(order.deliveryAddress)
                : (order.deliveryAddress || {});
        } catch (e) { LOG('Address parse error', e.message); }

        const lineItems = await Promise.all(items.map(async (item) => {
            const productData = await getProductData(item.id);
            let skuCode = null;

            if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && productData.variants?.length) {
                for (const variant of productData.variants) {
                    const selectedLabel = item.selectedOptions[variant.name];
                    if (selectedLabel) {
                        const matchedOpt = variant.options?.find(o => o.label === selectedLabel);
                        if (matchedOpt?.sku) { skuCode = matchedOpt.sku; break; }
                    }
                }
            }
            if (!skuCode) skuCode = productData.sku || String(item.id);

            const productName = item.name || productData.name || '';

            LOG(`Item ${item.id} (${productName}) → SKU: ${skuCode}`, { selectedOptions: item.selectedOptions });

            return {
                sku_code:       skuCode,
                product_name:   productName,
                price:          String(item.salePrice ?? item.price ?? 0),
                quantity:       item.quantity || 1,
                total_discount: 0
            };
        }));

        const customerName = order.guestName
            || `${order.firstName || ''} ${order.lastName || ''}`.trim()
            || 'Customer';

        payload = {
            order_id:          order.orderNumber,
            shop_domain:       shopDomain,
            customer_email:    order.guestEmail || order.email || '',
            customer_name:     customerName,
            customer_mobileno: order.contactPhone || '',
            address_line_one:  address.line1    || '',
            address_line_two:  address.landmark || address.city || '',
            pincode:           String(address.postcode || ''),
            city:              address.city     || '',
            state:             address.state    || '',
            payment_type:      (order.paymentMethod || 'cod').toUpperCase() === 'COD' ? 'COD' : 'PREPAID',
            line_items:        lineItems
        };

        LOG('Sending payload', payload);

        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        });

        LOG('SUCCESS', response.data);
        await saveShipeasoResponse(orderId, JSON.stringify({ request: payload, response: response.data }));

    } catch (err) {
        const errData = err.response
            ? { status: err.response.status, data: err.response.data }
            : { message: err.message };
        console.error(`[Shipeaso][Order ${orderId}] ERROR`, JSON.stringify(errData));
        try { await saveShipeasoResponse(orderId, JSON.stringify({ request: payload, error: errData })); } catch {}
    }
}

async function create(req, res) {
    try {
        const data = req.body;
        if (!data.items || !data.total) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Force quantity to 1 for all items in the order as per requirement
        if (Array.isArray(data.items)) {
            data.items = data.items.map(item => {
                if (item) {
                    item.quantity = 1;
                }
                return item;
            });
        }

        // ── Validation Check: Block orders from mobile numbers present in olddata.csv ──
        if (data.contactPhone) {
            const isBlocked = await phoneValidator.isMobileBlocked(data.contactPhone);
            if (isBlocked) {
                console.log(`[OrderController] Blocked order creation for mobile number in olddata: ${data.contactPhone}`);
                const [existing] = await db.execute(
                    `SELECT id FROM orders WHERE contactPhone = ? ORDER BY id DESC LIMIT 1`,
                    [data.contactPhone]
                );
                let existingOrder = null;
                if (existing.length > 0) {
                    existingOrder = await getOrderById(existing[0].id);
                    existingOrder._items   = (() => { try { return JSON.parse(existingOrder.items); } catch { return []; } })();
                    existingOrder._address = (() => { try { return JSON.parse(existingOrder.deliveryAddress); } catch { return null; } })();
                } else {
                    existingOrder = {
                        id: 0,
                        orderNumber: 'ORD-OLDDATA',
                        status: 'confirmed',
                        contactPhone: data.contactPhone,
                        total: data.total || 0,
                        items: JSON.stringify(data.items || []),
                        deliveryAddress: JSON.stringify(data.deliveryAddress || {}),
                        _items: data.items || [],
                        _address: data.deliveryAddress || null
                    };
                }
                return res.status(200).json({
                    success: true,
                    alreadyExists: true,
                    message: 'Your order is already created',
                    data: existingOrder
                });
            }
        }

        // ── Duplicate check: same phone + active order within last 24 hours ──
        if (data.contactPhone) {
            const [existing] = await db.execute(
                `SELECT id FROM orders
                 WHERE contactPhone = ?
                   AND status NOT IN ('cancelled')
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 ORDER BY created_at DESC LIMIT 1`,
                [data.contactPhone]
            );
            if (existing.length > 0) {
                const existingOrder = await getOrderById(existing[0].id);
                existingOrder._items   = (() => { try { return JSON.parse(existingOrder.items); } catch { return []; } })();
                existingOrder._address = (() => { try { return JSON.parse(existingOrder.deliveryAddress); } catch { return null; } })();
                return res.status(200).json({ success: true, alreadyExists: true, message: 'Your order is already created', data: existingOrder });
            }
        }

        data.orderNumber = `ORD-${Date.now()}`;
        const id = await createOrder(data);
        const order = await getOrderById(id);

        // Send response first, then push to Shipeaso
        res.json({ success: true, alreadyExists: false, data: order });

        // Push after response — Promise-based so it works on Vercel serverless too
        pushToShipeaso(id, order, data.items || []).catch(err => {
            console.error(`[Shipeaso] Push failed for order ${id}:`, err.message);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAll(req, res) {
    try {
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 20;
        const filters = {
            status:        req.query.status        || '',
            search:        req.query.search        || '',
            dateFrom:      req.query.dateFrom      || '',
            dateTo:        req.query.dateTo        || '',
            paymentMethod: req.query.paymentMethod || ''
        };
        const result = await getAllOrders(page, limit, filters);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getById(req, res) {
    try {
        const order = await getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ data: order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getByCustomer(req, res) {
    try {
        const orders = await getOrdersByCustomerId(req.params.customerId);
        res.json({ data: orders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateStatus(req, res) {
    try {
        const { status } = req.body;
        const order = await updateOrderStatus(req.params.id, status);
        res.json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function exportCSV(req, res) {
    try {
        const filters = {
            status:        req.query.status        || '',
            search:        req.query.search        || '',
            dateFrom:      req.query.dateFrom      || '',
            dateTo:        req.query.dateTo        || '',
            paymentMethod: req.query.paymentMethod || ''
        };

        const rows = await getAllOrdersForExport(filters);

        const headers = [
            'Order #', 'Order Date', 'Status',
            'Customer Name', 'Phone', 'Email',
            'Payment Method', 'Payment ID',
            'Items Summary', 'Items Detail',
            'Subtotal', 'Delivery Charge', 'Grand Total',
            'Address', 'Landmark', 'City', 'State', 'Pincode'
        ];

        const tryParse = (val, fallback) => {
            try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); }
            catch { return fallback; }
        };

        const csvRows = rows.map(o => {
            const items   = tryParse(o.items, []);
            const address = tryParse(o.deliveryAddress, null);
            const name    = `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.guestName || '';

            const itemsSummary = items.map(i => `${i.name} x${i.quantity}`).join(' | ');
            const itemsDetail  = items.map(i => {
                const opts  = Object.entries(i.selectedOptions || {}).map(([k, v]) => `${k}:${v}`).join(',');
                const price = ((i.salePrice ?? i.price) * i.quantity).toFixed(2);
                return `${i.name}${opts ? ' ('+opts+')' : ''} x${i.quantity} = ${price}`;
            }).join(' | ');

            return [
                o.orderNumber,
                new Date(o.created_at).toLocaleString('en-IN'),
                o.status,
                name,
                o.contactPhone || '',
                o.email || o.guestEmail || '',
                o.paymentMethod || '',
                o.razorpayPaymentId || o.paymentId || '',
                itemsSummary,
                itemsDetail,
                o.subtotal,
                o.deliveryCharge,
                o.total,
                address?.line1 || '',
                address?.landmark || '',
                address?.city || '',
                address?.state || '',
                address?.postcode || ''
            ];
        });

        const csv = [headers, ...csvRows]
            .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    } catch (err) {
        console.error('exportCSV:', err);
        res.status(500).json({ error: err.message });
    }
}

async function resyncShipeaso(req, res) {
    try {
        const order = await getOrderById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Parse items from DB order
        let items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch {}

        // Fire sync — await so we can return result
        await pushToShipeaso(order.id, order, items);

        // Fetch updated order with fresh shipeaso_response
        const updated = await getOrderById(order.id);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getUnsyncedOrders(req, res) {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [rows] = await db.execute(
            `SELECT o.*,
                    COALESCE(c.firstName, o.guestName) AS guestName,
                    COALESCE(c.email, o.guestEmail) AS guestEmail
             FROM orders o
             LEFT JOIN customers c ON c.id = o.customerId
             WHERE o.status NOT IN ('cancelled')
               AND (
                   o.shipeaso_response IS NULL
                   OR o.shipeaso_response = ''
                   OR JSON_UNQUOTE(JSON_EXTRACT(o.shipeaso_response, '$.error')) IS NOT NULL
               )
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await db.execute(
            `SELECT COUNT(*) as total FROM orders o
             WHERE o.status NOT IN ('cancelled')
               AND (
                   o.shipeaso_response IS NULL
                   OR o.shipeaso_response = ''
                   OR JSON_UNQUOTE(JSON_EXTRACT(o.shipeaso_response, '$.error')) IS NOT NULL
               )`
        );

        res.json({ success: true, data: rows, total, page, limit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function syncAllUnsynced(req, res) {
    try {
        // Fetch ALL unsynced orders (no pagination — backend does them all)
        const [rows] = await db.execute(
            `SELECT o.*,
                    COALESCE(c.firstName, o.guestName) AS guestName,
                    COALESCE(c.email, o.guestEmail) AS guestEmail
             FROM orders o
             LEFT JOIN customers c ON c.id = o.customerId
             WHERE o.status NOT IN ('cancelled')
               AND (
                   o.shipeaso_response IS NULL
                   OR o.shipeaso_response = ''
                   OR JSON_UNQUOTE(JSON_EXTRACT(o.shipeaso_response, '$.error')) IS NOT NULL
               )
             ORDER BY o.created_at DESC`
        );

        const results = { total: rows.length, synced: 0, failed: 0, details: [] };

        for (const order of rows) {
            let items = [];
            try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch {}

            try {
                await pushToShipeaso(order.id, order, items);
                const updated = await getOrderById(order.id);
                const success = (() => {
                    try {
                        const d = JSON.parse(updated.shipeaso_response || '{}');
                        if (d?.error) return false;
                        const r = d?.response || d;
                        return r?.status === true || r?.success === true || r?.order_id || r?.id
                            || (typeof r?.message === 'string' && r.message.toLowerCase().includes('success'));
                    } catch { return false; }
                })();

                if (success) results.synced++;
                else         results.failed++;
                results.details.push({ id: order.id, orderNumber: order.orderNumber, success });
            } catch {
                results.failed++;
                results.details.push({ id: order.id, orderNumber: order.orderNumber, success: false });
            }
        }

        res.json({ success: true, ...results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function validateMobile(req, res) {
    try {
        const phone = req.query.phone || req.body.phone || req.params.phone;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const isBlocked = await phoneValidator.isMobileBlocked(phone);
        if (isBlocked) {
            return res.json({
                valid: false,
                alreadyExists: true,
                message: 'Your order is already created'
            });
        }
        const [existing] = await db.execute(
            `SELECT id FROM orders WHERE contactPhone = ? AND status NOT IN ('cancelled') LIMIT 1`,
            [phone]
        );
        if (existing.length > 0) {
            return res.json({
                valid: false,
                alreadyExists: true,
                message: 'Your order is already created'
            });
        }

        return res.json({ valid: true, alreadyExists: false });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { create, getAll, getById, getByCustomer, updateStatus, exportCSV, resyncShipeaso, getUnsyncedOrders, syncAllUnsynced, validateMobile };

