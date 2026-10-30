const express = require('express');
const multer = require('multer');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const ctrl = require('../controllers/blockedMobileController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }
});

router.get('/getAll', auth, ctrl.getAll);
router.post('/create', auth, ctrl.create);
router.put('/update/:id', auth, ctrl.update);
router.delete('/delete/:id', auth, ctrl.remove);
router.post('/uploadCsv', auth, upload.single('file'), ctrl.uploadCsv);

module.exports = router;
