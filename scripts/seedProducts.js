/**
 * One-time product seed script
 * Run: node API/scripts/seedProducts.js
 *
 * Maps products.json fields → products table columns
 * Skips products whose slug already exists (idempotent)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const db      = require('../config/db');
const products = require('../../products.json');

function toSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseImages(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return [raw]; }
}

function parseVariants(raw) {
    // products.json uses "variation" with title/values format
    // Map to our variants format: { name, options: [{ label, price, salePrice }] }
    if (!raw) return [];
    let arr = [];
    try { arr = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
    if (!Array.isArray(arr)) return [];

    return arr.map(v => ({
        name: v.title || v.name || 'Option',
        options: (v.values || v.options || []).map(opt => ({
            label:     opt.name  || opt.label || '',
            price:     opt.price || null,
            salePrice: opt.price || null,
            sku:       opt.sku   || null
        }))
    }));
}

async function seed() {
    console.log(`\n🌱 Seeding ${products.length} products to DB: ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;

    for (const p of products) {
        const slug = toSlug(p.name) || `product-${p.id}`;

        try {
            // Check if slug already exists
            const [rows] = await db.execute('SELECT id FROM products WHERE slug = ? LIMIT 1', [slug]);
            if (rows.length > 0) {
                console.log(`  ⏭  SKIP  "${p.name}" — slug already exists`);
                skipped++;
                continue;
            }

            const images   = parseImages(p.images);
            const variants = parseVariants(p.variation);
            const price    = Number(p.price)           || 0;
            const salePrice = Number(p.discountedPrice) || null;

            await db.execute(
                `INSERT INTO products
                 (name, slug, sku, description, shortDescription,
                  price, salePrice, categoryId,
                  images, variants, tags,
                  benefits, whyLoveIt, keyIngredients,
                  howToUse, additionalDetails, consumerCareDetails,
                  faqs, promoImage, promoReel, galleryMedia, sizeGuideImage,
                  isActive, isFeatured, sortOrder,
                  created_at, updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
                [
                    p.name,
                    slug,
                    p.sku   || null,
                    p.desc  || p.description || '',
                    p.shortDesc || null,
                    price,
                    salePrice !== price ? salePrice : null,
                    null,   // categoryId — set manually after seed; source IDs don't match this DB
                    JSON.stringify(images),
                    JSON.stringify(variants),
                    JSON.stringify([]),
                    JSON.stringify([]),
                    JSON.stringify([]),
                    JSON.stringify([]),
                    null, null, null,
                    JSON.stringify([]),
                    null, null,
                    JSON.stringify([]),
                    null,
                    p.isActive  !== undefined ? (p.isActive  ? 1 : 0) : 1,
                    p.isFeatured !== undefined ? (p.isFeatured ? 1 : 0) : 0,
                    p.id || 0   // preserve original order via sortOrder
                ]
            );

            console.log(`  ✅ INSERT "${p.name}"`);
            inserted++;

        } catch (err) {
            console.error(`  ❌ ERROR "${p.name}": ${err.message}`);
            errors++;
        }
    }

    console.log(`\n────────────────────────────────`);
    console.log(`  Inserted : ${inserted}`);
    console.log(`  Skipped  : ${skipped}`);
    console.log(`  Errors   : ${errors}`);
    console.log(`────────────────────────────────\n`);

    process.exit(errors > 0 ? 1 : 0);
}

seed().catch(err => { console.error('Fatal:', err); process.exit(1); });
