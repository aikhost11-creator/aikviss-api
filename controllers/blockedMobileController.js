const model = require('../models/blockedMobileModel');

function sendErr(res, err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Something went wrong' });
}

async function getAll(req, res) {
    try {
        const result = await model.list({
            search: req.query.search || '',
            page: req.query.page,
            limit: req.query.limit
        });
        res.json({ success: true, ...result });
    } catch (err) {
        sendErr(res, err);
    }
}

async function create(req, res) {
    try {
        const data = await model.addOne(req.body.mobile, req.body.note);
        res.json({ success: true, message: 'Number blocked', data });
    } catch (err) {
        sendErr(res, err);
    }
}

async function update(req, res) {
    try {
        const data = await model.updateOne(req.params.id, req.body.mobile, req.body.note);
        res.json({ success: true, message: 'Number updated', data });
    } catch (err) {
        sendErr(res, err);
    }
}

async function remove(req, res) {
    try {
        const data = await model.removeOne(req.params.id);
        res.json({ success: true, message: 'Number removed', data });
    } catch (err) {
        sendErr(res, err);
    }
}

async function uploadCsv(req, res) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'Please upload a CSV file' });
        }
        const text = req.file.buffer.toString('utf8');
        const { mobiles, skipped } = model.extractFromText(text);
        if (!mobiles.length) {
            return res.status(400).json({ error: 'No valid 10-digit mobile numbers found in the file' });
        }
        const result = await model.bulkAdd(mobiles, 'csv');
        res.json({
            success: true,
            message: `${result.added} numbers blocked`,
            skippedInvalid: skipped,
            ...result
        });
    } catch (err) {
        sendErr(res, err);
    }
}

module.exports = { getAll, create, update, remove, uploadCsv };
