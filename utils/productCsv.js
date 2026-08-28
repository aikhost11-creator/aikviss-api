/**
 * Product CSV column definitions (export + import).
 */
const PRODUCT_CSV_HEADERS = [
    'name',
    'slug',
    'sku',
    'description',
    'shortDescription',
    'resultTag',
    'badge',
    'price',
    'salePrice',
    'categoryId',
    'categoryName',
    'images',
    'variants',
    'tags',
    'benefits',
    'whyLoveIt',
    'keyIngredients',
    'howToUse',
    'additionalDetails',
    'consumerCareDetails',
    'faqs',
    'promoImage',
    'promoReel',
    'galleryMedia',
    'sizeGuideImage',
    'isActive',
    'isFeatured',
    'sortOrder',
];

const JSON_FIELDS = new Set([
    'images', 'variants', 'tags', 'benefits', 'whyLoveIt',
    'keyIngredients', 'faqs', 'galleryMedia',
]);

function productToCsvRow(product) {
    const p = product || {};
    const jsonStr = (v) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return ''; }
    };

    return PRODUCT_CSV_HEADERS.map((key) => {
        if (JSON_FIELDS.has(key)) return jsonStr(p[key]);
        if (key === 'isActive' || key === 'isFeatured') return p[key] ? '1' : '0';
        if (key === 'categoryName') return p.categoryName || '';
        return p[key] ?? '';
    });
}

function csvRowToProduct(row) {
    const { tryParseJson, parseBool, parseNum, slugify } = require('./csvHelper');

    const name = String(row.name || '').trim();
    if (!name) return null;

    let slug = String(row.slug || '').trim();
    if (!slug) slug = slugify(name);

    const data = {
        name,
        slug,
        sku: String(row.sku || '').trim() || null,
        description: row.description || '',
        shortDescription: row.shortDescription || '',
        resultTag: row.resultTag || '',
        badge: row.badge || '',
        price: parseNum(row.price, 0),
        salePrice: parseNum(row.salePrice, null),
        categoryId: parseNum(row.categoryId, null),
        categoryName: String(row.categoryName || '').trim(),
        images: tryParseJson(row.images, []),
        variants: tryParseJson(row.variants, []),
        tags: tryParseJson(row.tags, []),
        benefits: tryParseJson(row.benefits, []),
        whyLoveIt: tryParseJson(row.whyLoveIt, []),
        keyIngredients: tryParseJson(row.keyIngredients, []),
        howToUse: row.howToUse || '',
        additionalDetails: row.additionalDetails || '',
        consumerCareDetails: row.consumerCareDetails || '',
        faqs: tryParseJson(row.faqs, []),
        promoImage: row.promoImage || '',
        promoReel: row.promoReel || '',
        galleryMedia: tryParseJson(row.galleryMedia, []),
        sizeGuideImage: row.sizeGuideImage || '',
        isActive: parseBool(row.isActive, true),
        isFeatured: parseBool(row.isFeatured, false),
        sortOrder: parseNum(row.sortOrder, 0) || 0,
    };

    return data;
}

module.exports = {
    PRODUCT_CSV_HEADERS,
    productToCsvRow,
    csvRowToProduct,
};
