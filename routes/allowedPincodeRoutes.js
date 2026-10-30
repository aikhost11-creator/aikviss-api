const express = require('express');
const multer = require('multer');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const ctrl = require('../controllers/allowedPincodeController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

router.get('/check', ctrl.check);
router.get('/getAll', auth, ctrl.getAll);
router.post('/create', auth, ctrl.create);
router.put('/update/:id', auth, ctrl.update);
router.delete('/delete/:id', auth, ctrl.remove);
router.post('/uploadCsv', auth, upload.single('file'), ctrl.uploadCsv);
router.put('/settings', auth, ctrl.updateSettings);

module.exports = router;
