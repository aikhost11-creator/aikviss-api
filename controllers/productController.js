const Product = require('../models/productModel');
const Review  = require('../models/reviewModel');

// ── Admin ──────────────────────────────────────────────────────────────────

exports.createProduct = async (req, res) => {
    try {
        // Auto-generate slug from name if not provided
        if (!req.body.slug && req.body.name) {
            req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        const result = await Product.create(req.body);
        res.status(201).json({ message: 'Product created', data: result.data });
    } catch (err) {
        console.error('createProduct:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllProductsByPage = async (req, res) => {
    try {
        const { limit = 20, page = 1, searchtxt = '', categoryId, brandId, isActive } = req.query;
        const filters = {};
        if (categoryId) filters.categoryId = Number(categoryId);
        if (brandId)    filters.brandId    = Number(brandId);
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const result = await Product.getAllByPage(Number(limit), Number(page), searchtxt, filters);
        res.status(200).json({ ...result, totalPages: Math.ceil(result.totalCount / Number(limit)), currentPage: page });
    } catch (err) {
        console.error('getAllProductsByPage:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const result = await Product.getById(req.params.id);
        res.status(200).json(result);
    } catch (err) {
        console.error('getProductById:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        if (!req.body.slug && req.body.name) {
            req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        await Product.update(req.params.id, req.body);
        res.status(200).json({ message: 'Product updated' });
    } catch (err) {
        console.error('updateProduct:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.duplicateProduct = async (req, res) => {
    try {
        const original = await Product.getById(req.params.id);
        if (!original || !original.data) return res.status(404).json({ error: 'Product not found' });

        const src = original.data;
        const baseName = `${src.name} (Copy)`;
        const baseSlug = `${src.slug}-copy-${Date.now()}`;

        const newData = {
            name:            baseName,
            slug:            baseSlug,
            description:     src.description,
            shortDescription:src.shortDescription,
            price:           src.price,
            salePrice:       src.salePrice,
            sku:             src.sku ? `${src.sku}-copy` : null,
            categoryId:      src.categoryId,
            brandId:         src.brandId,
            images:          src.images,
            variants:        src.variants,
            benefits:        src.benefits,
            keyIngredients:  src.keyIngredients,
            whyLoveIt:       src.whyLoveIt,
            faqs:            src.faqs,
            galleryMedia:    src.galleryMedia,
            sizeGuideImage:  src.sizeGuideImage,
            badge:           src.badge,
            resultTag:       src.resultTag,
            isActive:        0,
            isFeatured:      0,
        };

        const result = await Product.create(newData);
        res.status(201).json({ message: 'Product duplicated', data: result.data });
    } catch (err) {
        console.error('duplicateProduct:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateProductStatus = async (req, res) => {
    try {
        await Product.updateStatus(req.params.id, req.body.isActive);
        res.status(200).json({ message: 'Status updated' });
    } catch (err) {
        console.error('updateProductStatus:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateProductFeatured = async (req, res) => {
    try {
        await Product.updateFeatured(req.params.id, req.body.isFeatured);
        res.status(200).json({ message: 'Featured status updated' });
    } catch (err) {
        console.error('updateProductFeatured:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.delete(req.params.id);
        res.status(200).json({ message: 'Product deleted' });
    } catch (err) {
        console.error('deleteProduct:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.exportCSV = async (req, res) => {
    try {
        const { searchtxt = '', categoryId } = req.query;
        const filters = {};
        if (searchtxt) filters.searchtxt = searchtxt;
        if (categoryId) filters.categoryId = Number(categoryId);

        const products = await Product.getAllForExport(filters);
        const { PRODUCT_CSV_HEADERS, productToCsvRow } = require('../utils/productCsv');
        const { rowsToCsv } = require('../utils/csvHelper');

        const rows = products.map((p) => productToCsvRow(p));
        const csv = rowsToCsv(PRODUCT_CSV_HEADERS, rows);
        const filename = `products_${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        console.error('exportCSV products:', err);
        res.status(500).json({ error: err.message || 'Export failed' });
    }
};

exports.importCSV = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'CSV file is required (field name: file)' });
        }

        const mode = String(req.query.mode || 'upsert').toLowerCase(); // upsert | create
        const text = req.file.buffer.toString('utf8');
        const { parseCsv } = require('../utils/csvHelper');
        const { csvRowToProduct } = require('../utils/productCsv');
        const db = require('../config/db');

        const { records } = parseCsv(text);
        if (!records.length) {
            return res.status(400).json({ error: 'CSV has no data rows' });
        }

        const resolveCategoryId = async (categoryId, categoryName) => {
            if (categoryId) {
                const [rows] = await db.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [categoryId]);
                if (rows[0]) return rows[0].id;
            }
            if (categoryName) {
                const [rows] = await db.execute('SELECT id FROM categories WHERE name = ? LIMIT 1', [categoryName]);
                if (rows[0]) return rows[0].id;
            }
            return null;
        };

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const rowNum = i + 2; // header is row 1
            try {
                const data = csvRowToProduct(records[i]);
                if (!data) {
                    errors.push({ row: rowNum, message: 'Product name is required' });
                    continue;
                }

                data.categoryId = await resolveCategoryId(data.categoryId, data.categoryName);
                delete data.categoryName;

                const existing = await Product.findBySlug(data.slug);

                if (existing) {
                    if (mode === 'create') {
                        skipped++;
                        continue;
                    }
                    await Product.update(existing.id, data);
                    updated++;
                } else {
                    await Product.create(data);
                    created++;
                }
            } catch (e) {
                errors.push({ row: rowNum, message: e.message || 'Import failed' });
            }
        }

        res.status(200).json({
            message: 'Import completed',
            created,
            updated,
            skipped,
            failed: errors.length,
            total: records.length,
            errors: errors.slice(0, 50),
        });
    } catch (err) {
        console.error('importCSV products:', err);
        res.status(500).json({ error: err.message || 'Import failed' });
    }
};

// ── Public ─────────────────────────────────────────────────────────────────

exports.getShopListing = async (req, res) => {
    try {
        const { limit = 20, offset = 0, categoryId, brandId, minPrice, maxPrice, search, sort } = req.query;
        const filters = {};
        if (categoryId) filters.categoryId = Number(categoryId);
        if (brandId)    filters.brandId    = Number(brandId);
        if (minPrice)   filters.minPrice   = Number(minPrice);
        if (maxPrice)   filters.maxPrice   = Number(maxPrice);
        if (search)     filters.search     = search;
        if (sort)       filters.sort       = sort;

        const result = await Product.getShopListing(Number(limit), Number(offset), filters);
        res.status(200).json(result);
    } catch (err) {
        console.error('getShopListing:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getPublicProducts = async (req, res) => {
    try {
        const { limit = 20, offset = 0, categoryId, brandId, minPrice, maxPrice, search, sort, isFeatured } = req.query;
        const filters = {};
        if (categoryId) filters.categoryId = Number(categoryId);
        if (brandId)    filters.brandId    = Number(brandId);
        if (minPrice)   filters.minPrice   = Number(minPrice);
        if (maxPrice)   filters.maxPrice   = Number(maxPrice);
        if (search)     filters.search     = search;
        if (sort)       filters.sort       = sort;
        if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';

        const result = await Product.getPublic(Number(limit), Number(offset), filters);
        res.status(200).json(result);
    } catch (err) {
        console.error('getPublicProducts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getFeaturedProducts = async (req, res) => {
    try {
        const result = await Product.getFeatured();
        res.status(200).json(result);
    } catch (err) {
        console.error('getFeaturedProducts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const result = await Product.getBySlug(req.params.slug);
        if (!result.data) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json(result);
    } catch (err) {
        console.error('getProductBySlug:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getRelatedProducts = async (req, res) => {
    try {
        const { categoryId, excludeId, limit = 8 } = req.query;
        if (!categoryId) return res.status(400).json({ error: 'categoryId required' });
        const result = await Product.getRelated(Number(categoryId), Number(excludeId), Number(limit));
        res.status(200).json(result);
    } catch (err) {
        console.error('getRelatedProducts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ── Reviews ────────────────────────────────────────────────────────────────

exports.addReview = async (req, res) => {
    try {
        const result = await Review.create({ ...req.body, productId: req.params.id });
        await Product.updateRating(req.params.id);
        res.status(201).json({ message: 'Review added', data: result.data });
    } catch (err) {
        console.error('addReview:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const { limit = 8, offset = 0, sort = 'newest' } = req.query;
        const result = await Review.getByProduct(req.params.id, Number(limit), Number(offset), sort);
        res.status(200).json(result);
    } catch (err) {
        console.error('getReviews:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllReviewsByPage = async (req, res) => {
    try {
        const { limit = 20, page = 1, productId } = req.query;
        const result = await Review.getAllByPage(Number(limit), Number(page), productId ? Number(productId) : null);
        res.status(200).json(result);
    } catch (err) {
        console.error('getAllReviewsByPage:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateReviewStatus = async (req, res) => {
    try {
        await Review.updateStatus(req.params.id, req.body.isActive);
        res.status(200).json({ message: 'Review status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        await Review.delete(req.params.id);
        res.status(200).json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: get all reviews for a specific product (including inactive)
exports.getReviewsByProduct = async (req, res) => {
    try {
        const result = await Review.getByProductAdmin(Number(req.params.id));
        res.status(200).json(result);
    } catch (err) {
        console.error('getReviewsByProduct:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: create review for a product
exports.adminCreateReview = async (req, res) => {
    try {
        const result = await Review.create({ ...req.body, productId: req.params.id });
        await Product.updateRating(req.params.id);
        res.status(201).json({ message: 'Review added', data: result.data });
    } catch (err) {
        console.error('adminCreateReview:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: update review
exports.adminUpdateReview = async (req, res) => {
    try {
        await Review.update(req.params.id, req.body);
        // recalculate rating for the product
        if (req.body.productId) await Product.updateRating(req.body.productId);
        res.status(200).json({ message: 'Review updated' });
    } catch (err) {
        console.error('adminUpdateReview:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
