const model = require('../models/allowedPincodeModel');

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
        const data = await model.addOne(req.body.pincode, req.body.note);
        res.json({ success: true, message: 'Pincode allowed', data });
    } catch (err) {
        sendErr(res, err);
    }
}

async function update(req, res) {
    try {
        const data = await model.updateOne(req.params.id, req.body.pincode, req.body.note);
        res.json({ success: true, message: 'Pincode updated', data });
    } catch (err) {
        sendErr(res, err);
    }
}

async function remove(req, res) {
    try {
        const data = await model.removeOne(req.params.id);
        res.json({ success: true, message: 'Pincode removed', data });
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
        const { pincodes, skipped } = model.extractFromText(text);
        if (!pincodes.length) {
            return res.status(400).json({ error: 'No valid 6-digit pincodes found in the file' });
        }
        const result = await model.bulkAdd(pincodes, 'csv');
        res.json({
            success: true,
            message: `${result.added} pincodes allowed`,
            skippedInvalid: skipped,
            ...result
        });
    } catch (err) {
        sendErr(res, err);
    }
}

async function updateSettings(req, res) {
    try {
        const on = req.body.is_validate_pincode === true
            || req.body.is_validate_pincode === 1
            || req.body.is_validate_pincode === '1'
            || req.body.is_validate_pincode === 'true';
        const is_validate_pincode = await model.setFlag(on);
        res.json({
            success: true,
            is_validate_pincode,
            message: is_validate_pincode
                ? 'Pincode check is ON. Only listed pincodes can order.'
                : 'Pincode check is OFF. Every pincode is accepted.'
        });
    } catch (err) {
        sendErr(res, err);
    }
}

async function check(req, res) {
    try {
        const raw = req.query.pincode || req.body?.pincode || '';
        const result = await model.checkPincode(raw);
        res.json({ success: true, ...result });
    } catch (err) {
        sendErr(res, err);
    }
}

module.exports = { getAll, create, update, remove, uploadCsv, updateSettings, check };
