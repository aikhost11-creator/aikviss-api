const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const ctrl    = require('../controllers/productController');
const { auth } = require('../middlewares/auth.js');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});

// ── Admin (auth required) ──────────────────────────────────────────────────
router.post('/createProduct',           auth, ctrl.createProduct);
router.get('/getAllProductsByPage',      auth, ctrl.getAllProductsByPage);
router.get('/getProductById/:id',        auth, ctrl.getProductById);
router.put('/updateProduct/:id',         auth, ctrl.updateProduct);
router.put('/updateProductStatus/:id',   auth, ctrl.updateProductStatus);
router.put('/updateProductFeatured/:id', auth, ctrl.updateProductFeatured);
router.post('/duplicateProduct/:id',     auth, ctrl.duplicateProduct);
router.delete('/deleteProduct/:id',      auth, ctrl.deleteProduct);
router.get('/exportCSV',                 auth, ctrl.exportCSV);
router.post('/importCSV',                auth, upload.single('file'), ctrl.importCSV);

// Reviews admin
router.get('/getAllReviews',              auth, ctrl.getAllReviewsByPage);
router.get('/getProductReviews/:id',     auth, ctrl.getReviewsByProduct);
router.post('/adminAddReview/:id',       auth, ctrl.adminCreateReview);
router.put('/adminUpdateReview/:id',     auth, ctrl.adminUpdateReview);
router.put('/updateReviewStatus/:id',    auth, ctrl.updateReviewStatus);
router.delete('/deleteReview/:id',       auth, ctrl.deleteReview);

// ── Public ─────────────────────────────────────────────────────────────────
router.get('/getShopListing',           ctrl.getShopListing);
router.get('/getProducts',              ctrl.getPublicProducts);
router.get('/getFeaturedProducts',      ctrl.getFeaturedProducts);
router.get('/getProduct/:slug',         ctrl.getProductBySlug);
router.get('/getRelated',               ctrl.getRelatedProducts);
router.post('/addReview/:id',           ctrl.addReview);
router.get('/getReviews/:id',           ctrl.getReviews);

module.exports = router;
