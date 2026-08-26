const Siteconfigs = require('../models/siteconfigModel');

// ── In-memory cache — siteconfig rarely changes ───────────────────────────────
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function invalidateCache() { _cache = null; _cacheTime = 0; }

exports.getForUi = async (req, res) => {
    try {
        const now = Date.now();
        if (_cache && (now - _cacheTime) < CACHE_TTL_MS) {
            const d = _cache.data?.[0] || {};
            return res.status(200).json({
                status: 'success',
                data: {
                    currency:       d.currency       || '£',
                    deliveryCharge: d.deliveryCharge ?? 20,
                    primaryColor:   d.primaryColor   || '#7b10b9',
                    metaPixelId:    d.metaPixelId    || null,
                    metaAccessToken:d.metaAccessToken|| null,
                    buyNowText:     d.buyNowText     || 'BUY NOW',
                    buyNowSubtext:  d.buyNowSubtext  || null,
                }
            });
        }

        const results = await Siteconfigs.getAll();
        _cache = results;
        _cacheTime = now;

        const d = results.data?.[0] || {};
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        res.status(200).json({
            status: 'success',
            data: {
                currency:       d.currency       || '£',
                deliveryCharge: d.deliveryCharge ?? 20,
                primaryColor:   d.primaryColor   || '#7b10b9',
                metaPixelId:    d.metaPixelId    || null,
                metaAccessToken:d.metaAccessToken|| null,
                buyNowText:     d.buyNowText     || 'BUY NOW',
                buyNowSubtext:  d.buyNowSubtext  || null,
            }
        });
    } catch (err) {
        console.error('Error in getForUi:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.createSiteconfig = async (req, res) => {
    try {
        const result = await Siteconfigs.create(req.body);
        invalidateCache();
        res.status(201).json({ message: 'Siteconfig created', id: result.insertId });
    } catch (err) {
        console.error('Error creating Siteconfig:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllSiteconfigs = async (req, res) => {
    try {
        // Serve from cache if fresh
        const now = Date.now();
        if (_cache && (now - _cacheTime) < CACHE_TTL_MS) {
            return res.status(200).json(_cache);
        }

        const results = await Siteconfigs.getAll();

        // Cache the result
        _cache = results;
        _cacheTime = now;

        // HTTP cache headers — browser/CDN can cache for 60s
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching Siteconfigs:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateSiteconfig = async (req, res) => {
    const id = req.params.id;
    try {
        await Siteconfigs.update(id, req.body, req.userDetails);
        invalidateCache(); // bust cache on update
        res.status(200).json({ message: 'Siteconfig updated' });
    } catch (err) {
        console.error('Error updating Siteconfig:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteSiteconfig = async (req, res) => {
    const id = req.params.id;
    try {
        await Siteconfigs.delete(id);
        invalidateCache();
        res.status(200).json({ message: 'Siteconfig deleted' });
    } catch (err) {
        console.error('Error deleting Siteconfig:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
