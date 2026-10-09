const db = require('./db');

const tables = [

    // USERS
    {
        name: 'users',
        sql: `
            CREATE TABLE IF NOT EXISTS \`users\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`name\`       VARCHAR(255) NOT NULL,
                \`password\`   VARCHAR(255) NOT NULL,
                \`mobile\`     VARCHAR(20)  DEFAULT NULL,
                \`email\`      VARCHAR(255) NOT NULL,
                \`token\`      TEXT         DEFAULT NULL,
                \`roleName\`   VARCHAR(100) DEFAULT NULL,
                \`isActive\`   TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_users_email\` (\`email\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // SITE CONFIG
    {
        name: 'siteconfig',
        sql: `
            CREATE TABLE IF NOT EXISTS \`siteconfig\` (
                \`id\`           INT(11)      NOT NULL AUTO_INCREMENT,
                \`siteName\`     VARCHAR(255) DEFAULT NULL,
                \`clientUrl\`    VARCHAR(500) DEFAULT NULL,
                \`logo\`         VARCHAR(500) DEFAULT NULL,
                \`whiteLogo\`    VARCHAR(500) DEFAULT NULL,
                \`icon\`         VARCHAR(500) DEFAULT NULL,
                \`instagramURL\` VARCHAR(500) DEFAULT NULL,
                \`facebookURL\`  VARCHAR(500) DEFAULT NULL,
                \`twitterURL\`   VARCHAR(500) DEFAULT NULL,
                \`linkedInURL\`  VARCHAR(500) DEFAULT NULL,
                \`youtubeURL\`   VARCHAR(500) DEFAULT NULL,
                \`mobile\`       VARCHAR(20)  DEFAULT NULL,
                \`email\`        VARCHAR(255) DEFAULT NULL,
                \`created_at\`   DATETIME     NOT NULL,
                \`updated_at\`   DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // FILES
    {
        name: 'files',
        sql: `
            CREATE TABLE IF NOT EXISTS \`files\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`url\`        VARCHAR(500) NOT NULL,
                \`directory\`  VARCHAR(255) DEFAULT NULL,
                \`created_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_files_directory\` (\`directory\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // HOME BANNERS
    {
        name: 'home_banners',
        sql: `
            CREATE TABLE IF NOT EXISTS \`home_banners\` (
                \`id\`             INT(11)                NOT NULL AUTO_INCREMENT,
                \`type\`           ENUM('image','video')  NOT NULL DEFAULT 'image',
                \`url\`            VARCHAR(500)           NOT NULL,
                \`forMobile\`      TINYINT(1)             NOT NULL DEFAULT 0,
                \`redirectionUrl\` VARCHAR(500)           DEFAULT NULL,
                \`sortOrder\`      INT(11)                NOT NULL DEFAULT 0,
                \`isActive\`       TINYINT(1)             NOT NULL DEFAULT 1,
                \`created_at\`     DATETIME               NOT NULL,
                \`updated_at\`     DATETIME               NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_hb_active_sort\` (\`isActive\`, \`sortOrder\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // CATEGORIES
    {
        name: 'categories',
        sql: `
            CREATE TABLE IF NOT EXISTS \`categories\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`name\`       VARCHAR(255) NOT NULL,
                \`image\`      VARCHAR(500) DEFAULT NULL,
                \`parentId\`   INT(11)      DEFAULT NULL,
                \`sortOrder\`  INT(11)      NOT NULL DEFAULT 0,
                \`isActive\`   TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_cat_parent\`      (\`parentId\`),
                INDEX \`idx_cat_active_sort\` (\`isActive\`, \`sortOrder\`),
                CONSTRAINT \`fk_cat_parent\` FOREIGN KEY (\`parentId\`)
                    REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // Column migrations use plain ADD COLUMN (MySQL 8 has no ADD COLUMN IF NOT EXISTS);
    // ER_DUP_FIELDNAME on re-run is ignored in initDB().
    { name: 'categories_image_col',             sql: "ALTER TABLE `categories` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL AFTER `name`" },
    { name: 'siteconfig_currency_col',          sql: "ALTER TABLE `siteconfig` ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT '₹' AFTER `email`" },
    { name: 'siteconfig_delivery_col',          sql: "ALTER TABLE `siteconfig` ADD COLUMN `deliveryCharge` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `currency`" },
    { name: 'siteconfig_primaryColor_col',      sql: "ALTER TABLE `siteconfig` ADD COLUMN `primaryColor` VARCHAR(20) NOT NULL DEFAULT '#7b10b9' AFTER `deliveryCharge`" },
    { name: 'siteconfig_marqueeItems_col',      sql: "ALTER TABLE `siteconfig` ADD COLUMN `marqueeItems` JSON DEFAULT NULL AFTER `primaryColor`" },
    { name: 'siteconfig_metaPixelId_col',       sql: "ALTER TABLE `siteconfig` ADD COLUMN `metaPixelId` VARCHAR(50) DEFAULT NULL AFTER `marqueeItems`" },
    { name: 'siteconfig_buyNowText_col',        sql: "ALTER TABLE `siteconfig` ADD COLUMN `buyNowText` VARCHAR(100) DEFAULT 'BUY NOW' AFTER `metaPixelId`" },
    { name: 'siteconfig_buyNowSubtext_col',     sql: "ALTER TABLE `siteconfig` ADD COLUMN `buyNowSubtext` VARCHAR(200) DEFAULT NULL AFTER `buyNowText`" },
    { name: 'siteconfig_metaAccessToken_col',   sql: "ALTER TABLE `siteconfig` ADD COLUMN `metaAccessToken` VARCHAR(500) DEFAULT NULL AFTER `buyNowSubtext`" },

    // ABANDON CHECKOUTS
    {
        name: 'abandon_checkouts',
        sql: `
            CREATE TABLE IF NOT EXISTS \`abandon_checkouts\` (
                \`id\`            INT(11)      NOT NULL AUTO_INCREMENT,
                \`sessionId\`     VARCHAR(64)  NOT NULL,
                \`name\`          VARCHAR(200) DEFAULT NULL,
                \`email\`         VARCHAR(255) DEFAULT NULL,
                \`phone\`         VARCHAR(20)  DEFAULT NULL,
                \`address\`       JSON         DEFAULT NULL,
                \`items\`         JSON         NOT NULL,
                \`subtotal\`      DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`total\`         DECIMAL(10,2) NOT NULL DEFAULT 0,
                \`isConverted\`   TINYINT(1)   NOT NULL DEFAULT 0,
                \`orderId\`       INT(11)      DEFAULT NULL,
                \`created_at\`    DATETIME     NOT NULL,
                \`updated_at\`    DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_abandon_session\` (\`sessionId\`),
                INDEX \`idx_abandon_email\` (\`email\`),
                INDEX \`idx_abandon_converted\` (\`isConverted\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // BRANDS
    {
        name: 'brands',
        sql: `
            CREATE TABLE IF NOT EXISTS \`brands\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`name\`       VARCHAR(255) NOT NULL,
                \`image\`      VARCHAR(500) DEFAULT NULL,
                \`sortOrder\`  INT(11)      NOT NULL DEFAULT 0,
                \`isActive\`   TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_brand_name\` (\`name\`),
                INDEX \`idx_brand_active_sort\` (\`isActive\`, \`sortOrder\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // BRAND_CATEGORIES
    {
        name: 'brand_categories',
        sql: `
            CREATE TABLE IF NOT EXISTS \`brand_categories\` (
                \`id\`         INT(11) NOT NULL AUTO_INCREMENT,
                \`brandId\`    INT(11) NOT NULL,
                \`categoryId\` INT(11) NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_brand_cat\` (\`brandId\`, \`categoryId\`),
                INDEX \`idx_bc_brand\`    (\`brandId\`),
                INDEX \`idx_bc_category\` (\`categoryId\`),
                CONSTRAINT \`fk_bc_brand\`    FOREIGN KEY (\`brandId\`)    REFERENCES \`brands\`     (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`fk_bc_category\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PRODUCTS
    {
        name: 'products',
        sql: `
            CREATE TABLE IF NOT EXISTS \`products\` (
                \`id\`          INT(11)        NOT NULL AUTO_INCREMENT,
                \`name\`        VARCHAR(500)   NOT NULL,
                \`slug\`        VARCHAR(500)   NOT NULL DEFAULT '',
                \`description\` LONGTEXT       DEFAULT NULL,
                \`price\`       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
                \`salePrice\`   DECIMAL(10,2)  DEFAULT NULL,
                \`categoryId\`  INT(11)        DEFAULT NULL,
                \`brandId\`     INT(11)        DEFAULT NULL,
                \`images\`      JSON           DEFAULT NULL,
                \`variants\`    JSON           DEFAULT NULL,
                \`tags\`        JSON           DEFAULT NULL,
                \`avgRating\`   DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
                \`reviewCount\` INT(11)        NOT NULL DEFAULT 0,
                \`isActive\`    TINYINT(1)     NOT NULL DEFAULT 1,
                \`sortOrder\`   INT(11)        NOT NULL DEFAULT 0,
                \`created_at\`  DATETIME       NOT NULL,
                \`updated_at\`  DATETIME       NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_prod_slug\`   (\`slug\`(191)),
                INDEX \`idx_prod_cat\`    (\`categoryId\`),
                INDEX \`idx_prod_brand\`  (\`brandId\`),
                INDEX \`idx_prod_active\` (\`isActive\`),
                CONSTRAINT \`fk_prod_cat\`   FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL,
                CONSTRAINT \`fk_prod_brand\` FOREIGN KEY (\`brandId\`)    REFERENCES \`brands\`     (\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PRODUCTS: extra Sanfe-style fields (individual columns for MySQL 5.7 compat)
    { name: 'products_col_sku',                 sql: "ALTER TABLE `products` ADD COLUMN `sku` VARCHAR(100) DEFAULT NULL AFTER `slug`" },
    { name: 'products_col_shortDescription',    sql: "ALTER TABLE `products` ADD COLUMN `shortDescription` VARCHAR(500) DEFAULT NULL AFTER `description`" },
    { name: 'products_col_resultTag',           sql: "ALTER TABLE `products` ADD COLUMN `resultTag` VARCHAR(100) DEFAULT NULL AFTER `shortDescription`" },
    { name: 'products_col_badge',               sql: "ALTER TABLE `products` ADD COLUMN `badge` VARCHAR(100) DEFAULT NULL AFTER `resultTag`" },
    { name: 'products_col_benefits',            sql: "ALTER TABLE `products` ADD COLUMN `benefits` JSON DEFAULT NULL AFTER `badge`" },
    { name: 'products_col_whyLoveIt',           sql: "ALTER TABLE `products` ADD COLUMN `whyLoveIt` JSON DEFAULT NULL AFTER `benefits`" },
    { name: 'products_col_keyIngredients',      sql: "ALTER TABLE `products` ADD COLUMN `keyIngredients` JSON DEFAULT NULL AFTER `whyLoveIt`" },
    { name: 'products_col_howToUse',            sql: "ALTER TABLE `products` ADD COLUMN `howToUse` LONGTEXT DEFAULT NULL AFTER `keyIngredients`" },
    { name: 'products_col_additionalDetails',   sql: "ALTER TABLE `products` ADD COLUMN `additionalDetails` LONGTEXT DEFAULT NULL AFTER `howToUse`" },
    { name: 'products_col_consumerCareDetails', sql: "ALTER TABLE `products` ADD COLUMN `consumerCareDetails` LONGTEXT DEFAULT NULL AFTER `additionalDetails`" },
    { name: 'products_col_faqs',                sql: "ALTER TABLE `products` ADD COLUMN `faqs` JSON DEFAULT NULL AFTER `consumerCareDetails`" },
    { name: 'products_col_promoImage',          sql: "ALTER TABLE `products` ADD COLUMN `promoImage` VARCHAR(500) DEFAULT NULL AFTER `faqs`" },
    { name: 'products_col_promoReel',           sql: "ALTER TABLE `products` ADD COLUMN `promoReel` VARCHAR(500) DEFAULT NULL AFTER `promoImage`" },
    { name: 'products_col_galleryMedia',        sql: "ALTER TABLE `products` ADD COLUMN `galleryMedia` JSON DEFAULT NULL AFTER `promoReel`" },
    { name: 'products_col_sizeGuideImage',      sql: "ALTER TABLE `products` ADD COLUMN `sizeGuideImage` VARCHAR(500) DEFAULT NULL AFTER `galleryMedia`" },
    { name: 'products_col_isFeatured',          sql: "ALTER TABLE `products` ADD COLUMN `isFeatured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `isActive`" },
    { name: 'products_col_sortOrder',           sql: "ALTER TABLE `products` ADD COLUMN `sortOrder` INT(11) NOT NULL DEFAULT 0 AFTER `isFeatured`" },

    // PRODUCT REVIEWS
    {
        name: 'product_reviews',
        sql: `
            CREATE TABLE IF NOT EXISTS \`product_reviews\` (
                \`id\`           INT(11)      NOT NULL AUTO_INCREMENT,
                \`productId\`    INT(11)      NOT NULL,
                \`reviewerName\` VARCHAR(255) NOT NULL,
                \`rating\`       TINYINT(1)   NOT NULL DEFAULT 5,
                \`title\`        VARCHAR(500) DEFAULT NULL,
                \`body\`         TEXT         DEFAULT NULL,
                \`reviewImage\`  VARCHAR(500) DEFAULT NULL,
                \`isActive\`     TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`   DATETIME     NOT NULL,
                \`updated_at\`   DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_rev_product\` (\`productId\`),
                CONSTRAINT \`fk_rev_product\` FOREIGN KEY (\`productId\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // CUSTOMERS
    {
        name: 'customers',
        sql: `
            CREATE TABLE IF NOT EXISTS \`customers\` (
                \`id\`          INT(11)      NOT NULL AUTO_INCREMENT,
                \`firstName\`   VARCHAR(100) NOT NULL,
                \`lastName\`    VARCHAR(100) NOT NULL,
                \`email\`       VARCHAR(255) NOT NULL,
                \`password\`    VARCHAR(255) NOT NULL,
                \`mobile\`      VARCHAR(20)  DEFAULT NULL,
                \`dateOfBirth\` DATE         DEFAULT NULL,
                \`token\`       TEXT         DEFAULT NULL,
                \`isActive\`    TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`  DATETIME     NOT NULL,
                \`updated_at\`  DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_customers_email\` (\`email\`),
                INDEX \`idx_cust_active\` (\`isActive\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // CUSTOMER ADDRESSES
    {
        name: 'customer_addresses',
        sql: `
            CREATE TABLE IF NOT EXISTS \`customer_addresses\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`customerId\` INT(11)      NOT NULL,
                \`firstName\`  VARCHAR(100) NOT NULL,
                \`lastName\`   VARCHAR(100) NOT NULL,
                \`line1\`      VARCHAR(255) NOT NULL,
                \`line2\`      VARCHAR(255) DEFAULT NULL,
                \`city\`       VARCHAR(100) DEFAULT NULL,
                \`county\`     VARCHAR(100) DEFAULT NULL,
                \`postcode\`   VARCHAR(20)  NOT NULL,
                \`country\`    VARCHAR(100) NOT NULL DEFAULT 'United Kingdom',
                \`phone\`      VARCHAR(20)  DEFAULT NULL,
                \`isDefault\`  TINYINT(1)   NOT NULL DEFAULT 0,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_addr_customer\` (\`customerId\`),
                CONSTRAINT \`fk_addr_customer\` FOREIGN KEY (\`customerId\`)
                    REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PAYMENT SETTINGS
    {
        name: 'payment_settings',
        sql: `
            CREATE TABLE IF NOT EXISTS \`payment_settings\` (
                \`id\`                INT(11)      NOT NULL AUTO_INCREMENT,
                \`razorpayKeyId\`     VARCHAR(255) DEFAULT NULL,
                \`razorpayKeySecret\` VARCHAR(255) DEFAULT NULL,
                \`isTestMode\`        TINYINT(1)   NOT NULL DEFAULT 1,
                \`isActive\`          TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`        DATETIME     NOT NULL,
                \`updated_at\`        DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PAYMENT SETTINGS: PhonePe + COD columns
    { name: 'payment_settings_phonepeMerchantId',     sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeMerchantId` VARCHAR(255) DEFAULT NULL AFTER `razorpayKeySecret`" },
    { name: 'payment_settings_phonepeApiKey',         sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeApiKey` VARCHAR(500) DEFAULT NULL AFTER `phonepeMerchantId`" },
    { name: 'payment_settings_phonepeSaltIndex',      sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeSaltIndex` VARCHAR(10) DEFAULT '1' AFTER `phonepeApiKey`" },
    { name: 'payment_settings_phonepeSaltKey',        sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeSaltKey` VARCHAR(500) DEFAULT NULL AFTER `phonepeSaltIndex`" },
    { name: 'payment_settings_phonepeMerchantUserId', sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeMerchantUserId` VARCHAR(255) DEFAULT NULL AFTER `phonepeSaltKey`" },
    { name: 'payment_settings_phonepeIsActive',       sql: "ALTER TABLE `payment_settings` ADD COLUMN `phonepeIsActive` TINYINT(1) NOT NULL DEFAULT 0 AFTER `phonepeMerchantUserId`" },
    { name: 'payment_settings_codIsActive',           sql: "ALTER TABLE `payment_settings` ADD COLUMN `codIsActive` TINYINT(1) NOT NULL DEFAULT 0 AFTER `phonepeIsActive`" },

    // ORDERS
    {
        name: 'orders',
        sql: `
            CREATE TABLE IF NOT EXISTS \`orders\` (
                \`id\`                INT(11)       NOT NULL AUTO_INCREMENT,
                \`customerId\`        INT(11)       NOT NULL,
                \`orderNumber\`       VARCHAR(100)  NOT NULL,
                \`items\`             JSON          NOT NULL,
                \`subtotal\`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`deliveryCharge\`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`total\`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`deliveryAddress\`   JSON          DEFAULT NULL,
                \`contactPhone\`      VARCHAR(20)   DEFAULT NULL,
                \`paymentMethod\`     VARCHAR(50)   DEFAULT 'razorpay',
                \`paymentId\`         VARCHAR(255)  DEFAULT NULL,
                \`razorpayOrderId\`   VARCHAR(255)  DEFAULT NULL,
                \`razorpayPaymentId\` VARCHAR(255)  DEFAULT NULL,
                \`status\`            ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
                \`notes\`             TEXT          DEFAULT NULL,
                \`created_at\`        DATETIME      NOT NULL,
                \`updated_at\`        DATETIME      NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_order_number\` (\`orderNumber\`),
                INDEX \`idx_order_customer\` (\`customerId\`),
                INDEX \`idx_order_status\`   (\`status\`),
                CONSTRAINT \`fk_order_customer\` FOREIGN KEY (\`customerId\`)
                    REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // FAQ TOPICS
    {
        name: 'faq_topics',
        sql: `
            CREATE TABLE IF NOT EXISTS \`faq_topics\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`name\`       VARCHAR(255) NOT NULL,
                \`sortOrder\`  INT(11)      NOT NULL DEFAULT 0,
                \`isActive\`   TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // FAQS
    {
        name: 'faqs',
        sql: `
            CREATE TABLE IF NOT EXISTS \`faqs\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`topicId\`    INT(11)      DEFAULT NULL,
                \`question\`   VARCHAR(500) NOT NULL,
                \`answer\`     TEXT         NOT NULL,
                \`sortOrder\`  INT(11)      NOT NULL DEFAULT 0,
                \`isActive\`   TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\` DATETIME     NOT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_faq_topic\` (\`topicId\`),
                CONSTRAINT \`fk_faq_topic\` FOREIGN KEY (\`topicId\`)
                    REFERENCES \`faq_topics\` (\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // FAQ PAGE CONFIG (banner image + page title)
    {
        name: 'faq_config',
        sql: `
            CREATE TABLE IF NOT EXISTS \`faq_config\` (
                \`id\`          INT(11)      NOT NULL AUTO_INCREMENT,
                \`pageTitle\`   VARCHAR(255) DEFAULT 'FAQs',
                \`bannerImage\` VARCHAR(500) DEFAULT NULL,
                \`updated_at\`  DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PROMO BANNERS
    {
        name: 'promo_banners',
        sql: `
            CREATE TABLE IF NOT EXISTS \`promo_banners\` (
                \`id\`             INT(11)      NOT NULL AUTO_INCREMENT,
                \`rowIndex\`       TINYINT(1)   NOT NULL,
                \`colIndex\`       TINYINT(1)   NOT NULL,
                \`url\`            VARCHAR(500) DEFAULT NULL,
                \`redirectionUrl\` VARCHAR(500) DEFAULT NULL,
                \`label\`          VARCHAR(255) DEFAULT NULL,
                \`isActive\`       TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`     DATETIME     NOT NULL,
                \`updated_at\`     DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_promo_slot\` (\`rowIndex\`, \`colIndex\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // ORDERS: allow guest orders (nullable customerId + guest fields)
    { name: 'orders_customerId_nullable', sql: "ALTER TABLE `orders` MODIFY COLUMN `customerId` INT(11) DEFAULT NULL" },
    { name: 'orders_guestName_col',       sql: "ALTER TABLE `orders` ADD COLUMN `guestName` VARCHAR(200) DEFAULT NULL AFTER `contactPhone`" },
    { name: 'orders_guestEmail_col',      sql: "ALTER TABLE `orders` ADD COLUMN `guestEmail` VARCHAR(255) DEFAULT NULL AFTER `guestName`" },

    // ORDERS: add shipeaso_response column
    { name: 'orders_shipeaso_col', sql: "ALTER TABLE `orders` ADD COLUMN `shipeaso_response` TEXT DEFAULT NULL AFTER `notes`" },

    // LEGAL PAGES
    {
        name: 'legal_pages',
        sql: `
            CREATE TABLE IF NOT EXISTS \`legal_pages\` (
                \`id\`         INT(11)      NOT NULL AUTO_INCREMENT,
                \`slug\`       VARCHAR(100) NOT NULL,
                \`title\`      VARCHAR(255) NOT NULL,
                \`content\`    LONGTEXT     DEFAULT NULL,
                \`updated_at\` DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_legal_slug\` (\`slug\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // ABOUT US
    {
        name: 'about_us',
        sql: `
            CREATE TABLE IF NOT EXISTS \`about_us\` (
                \`id\`           INT(11)      NOT NULL AUTO_INCREMENT,
                \`bannerImage\`  VARCHAR(500) DEFAULT NULL,
                \`tagline\`      VARCHAR(255) DEFAULT NULL,
                \`storyTitle\`   VARCHAR(255) DEFAULT NULL,
                \`storyText\`    LONGTEXT     DEFAULT NULL,
                \`storyImage\`   VARCHAR(500) DEFAULT NULL,
                \`vision\`       TEXT         DEFAULT NULL,
                \`mission\`      TEXT         DEFAULT NULL,
                \`values\`       JSON         DEFAULT NULL,
                \`stats\`        JSON         DEFAULT NULL,
                \`teamTitle\`    VARCHAR(255) DEFAULT NULL,
                \`team\`         JSON         DEFAULT NULL,
                \`updated_at\`   DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // REELS
    {
        name: 'reels',
        sql: `
            CREATE TABLE IF NOT EXISTS \`reels\` (
                \`id\`          INT(11)      NOT NULL AUTO_INCREMENT,
                \`videoUrl\`    VARCHAR(500) NOT NULL,
                \`thumbnail\`   VARCHAR(500) DEFAULT NULL,
                \`title\`       VARCHAR(255) DEFAULT NULL,
                \`sortOrder\`   INT(11)      NOT NULL DEFAULT 0,
                \`isActive\`    TINYINT(1)   NOT NULL DEFAULT 1,
                \`created_at\`  DATETIME     NOT NULL,
                \`updated_at\`  DATETIME     NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_reels_active_sort\` (\`isActive\`, \`sortOrder\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    },

    // PRODUCT REVIEWS — add reviewImage column if missing
    { name: 'product_reviews_col_reviewImage', sql: "ALTER TABLE `product_reviews` ADD COLUMN `reviewImage` VARCHAR(500) DEFAULT NULL AFTER `body`" },

    // OLD DATA MOBILES (blacklisted phone numbers)
    {
        name: 'old_data_mobiles',
        sql: `
            CREATE TABLE IF NOT EXISTS \`old_data_mobiles\` (
                \`mobile\` VARCHAR(20) NOT NULL,
                PRIMARY KEY (\`mobile\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
    }

];

const phoneValidator = require('../utils/phoneValidator');

function siteNameFromDomain() {
    const domain = String(process.env.SHOP_DOMAIN || '').trim();
    const base = domain.split('.')[0] || 'Store';
    return base.charAt(0).toUpperCase() + base.slice(1);
}

const DEFAULT_MARQUEE = [
    { emoji: '🚚', text: 'Free shipping on every order' },
    { emoji: '💵', text: 'Cash on Delivery available' },
    { emoji: '🔒', text: '100% secure checkout' },
    { emoji: '⭐', text: 'Loved by thousands of happy customers' }
];

const DEFAULT_LEGAL = [
    {
        slug: 'shipping-policy',
        title: 'Shipping Policy',
        content: `<h3>Shipping Policy</h3>
<p>We ship to all serviceable pin codes across India. Shipping is free on every order.</p>
<ul>
<li>Orders are processed within 1-2 business days.</li>
<li>Delivery usually takes 4-8 business days depending on your location.</li>
<li>Once shipped, tracking details are shared on your registered mobile number.</li>
</ul>
<p>Delivery timelines may vary during sales, festivals or due to courier / weather delays.</p>`
    },
    {
        slug: 'return-refund',
        title: 'Return & Refund Policy',
        content: `<h3>Return & Refund Policy</h3>
<p>If you receive a damaged, defective or wrong product, contact us within 7 days of delivery with your order number and photos of the product.</p>
<ul>
<li>Products must be unused and in original packaging.</li>
<li>After verification, we will arrange a replacement or refund.</li>
<li>Refunds for prepaid orders are credited to the original payment method within 5-7 business days.</li>
<li>For Cash on Delivery orders, refunds are processed via bank transfer / UPI.</li>
</ul>`
    },
    {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: `<h3>Privacy Policy</h3>
<p>We collect only the information needed to process and deliver your order, such as your name, phone number, email and shipping address.</p>
<ul>
<li>Your information is used only for order processing, delivery and customer support.</li>
<li>We share delivery details only with our logistics / courier partners.</li>
<li>Online payments are processed by secure payment gateways; we do not store card details.</li>
</ul>
<p>By using this website, you agree to this privacy policy.</p>`
    },
    {
        slug: 'terms-conditions',
        title: 'Terms & Conditions',
        content: `<h3>Terms & Conditions</h3>
<p>By accessing and placing an order on this website, you agree to the following terms.</p>
<ul>
<li>All prices are in Indian Rupees (₹) and inclusive of applicable taxes.</li>
<li>Product images are for representation; actual colour may vary slightly.</li>
<li>We reserve the right to cancel orders in case of pricing errors, stock unavailability or suspected misuse.</li>
<li>These terms may be updated at any time without prior notice.</li>
</ul>`
    }
];

const DEFAULT_FAQS = [
    {
        topic: 'Orders & Delivery',
        faqs: [
            ['How long does delivery take?', 'Orders are usually delivered within 4-8 business days, depending on your location.'],
            ['Is shipping free?', 'Yes, shipping is free on every order.'],
            ['How can I track my order?', 'Once your order is shipped, tracking details are sent to your registered mobile number.']
        ]
    },
    {
        topic: 'Payments',
        faqs: [
            ['Is Cash on Delivery available?', 'Yes, Cash on Delivery is available on all serviceable pin codes.'],
            ['Is online payment safe?', 'Yes, all online payments are processed through secure, encrypted payment gateways.']
        ]
    },
    {
        topic: 'Returns & Refunds',
        faqs: [
            ['What if I receive a damaged or wrong product?', 'Contact us within 7 days of delivery with your order number and photos, and we will arrange a replacement or refund.'],
            ['When will I get my refund?', 'Refunds are processed within 5-7 business days after the return is verified.']
        ]
    }
];

const DEFAULT_ABOUT = {
    tagline: 'Our Story, Our Mission',
    storyTitle: 'Who We Are',
    storyText: 'We are a brand built on passion, quality, and care.',
    vision: 'To be the most trusted brand in every home.',
    mission: 'To deliver premium quality products that make everyday life better.',
    values: [
        { icon: '✨', title: 'Quality', text: 'We never compromise on quality.' },
        { icon: '💚', title: 'Care', text: 'Every product is made with care.' },
        { icon: '🌿', title: 'Sustainability', text: 'We care for the planet.' },
        { icon: '🤝', title: 'Trust', text: 'Built on trust, one customer at a time.' }
    ],
    stats: [
        { number: '1M+', label: 'Happy Customers' },
        { number: '500+', label: 'Products' },
        { number: '10+', label: 'Years of Excellence' },
        { number: '24/7', label: 'Customer Support' }
    ],
    teamTitle: 'Meet Our Team'
};

async function isEmpty(table) {
    const [rows] = await db.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
    return Number(rows[0].c) === 0;
}

// Inserts default rows only into empty tables, so admin edits are never overwritten.
async function seedDefaults() {
    const steps = [
        ['siteconfig', async () => {
            if (!(await isEmpty('siteconfig'))) return;
            await db.query(
                `INSERT INTO siteconfig
                    (id, siteName, clientUrl, logo, whiteLogo, icon, mobile, email,
                     currency, deliveryCharge, primaryColor, marqueeItems, buyNowText, buyNowSubtext,
                     created_at, updated_at)
                 VALUES (1, ?, ?, NULL, NULL, NULL, NULL, NULL, '₹', 0, '#7b10b9', ?, 'BUY NOW', NULL, NOW(), NOW())`,
                [
                    siteNameFromDomain(),
                    process.env.SHOP_DOMAIN ? `https://${process.env.SHOP_DOMAIN}` : null,
                    JSON.stringify(DEFAULT_MARQUEE)
                ]
            );
        }],
        ['payment_settings', async () => {
            if (!(await isEmpty('payment_settings'))) return;
            await db.query(
                `INSERT INTO payment_settings
                    (razorpayKeyId, razorpayKeySecret, isTestMode, isActive,
                     phonepeSaltIndex, phonepeIsActive, codIsActive, created_at, updated_at)
                 VALUES (NULL, NULL, 1, 0, '1', 0, 1, NOW(), NOW())`
            );
        }],
        ['faq_config', async () => {
            if (!(await isEmpty('faq_config'))) return;
            await db.query(`INSERT INTO faq_config (pageTitle, bannerImage, updated_at) VALUES ('FAQs', NULL, NOW())`);
        }],
        ['faqs', async () => {
            if (!(await isEmpty('faq_topics')) || !(await isEmpty('faqs'))) return;
            for (const [ti, t] of DEFAULT_FAQS.entries()) {
                const [res] = await db.query(
                    `INSERT INTO faq_topics (name, sortOrder, isActive, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())`,
                    [t.topic, ti + 1]
                );
                for (const [fi, [q, a]] of t.faqs.entries()) {
                    await db.query(
                        `INSERT INTO faqs (topicId, question, answer, sortOrder, isActive, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
                        [res.insertId, q, a, fi + 1]
                    );
                }
            }
        }],
        ['legal_pages', async () => {
            for (const p of DEFAULT_LEGAL) {
                await db.query(
                    `INSERT IGNORE INTO legal_pages (slug, title, content, updated_at) VALUES (?, ?, ?, NOW())`,
                    [p.slug, p.title, p.content]
                );
            }
        }],
        ['about_us', async () => {
            if (!(await isEmpty('about_us'))) return;
            const a = DEFAULT_ABOUT;
            await db.query(
                `INSERT INTO about_us
                    (bannerImage, tagline, storyTitle, storyText, storyImage, vision, mission,
                     \`values\`, stats, teamTitle, team, updated_at)
                 VALUES (NULL, ?, ?, ?, NULL, ?, ?, ?, ?, ?, '[]', NOW())`,
                [a.tagline, a.storyTitle, a.storyText, a.vision, a.mission,
                 JSON.stringify(a.values), JSON.stringify(a.stats), a.teamTitle]
            );
        }]
    ];

    for (const [name, run] of steps) {
        try {
            await run();
        } catch (err) {
            console.error(`   Seed failed: ${name} - ${err.message}`);
        }
    }
    console.log('Default data check complete.\n');
}

async function initDB() {
    console.log('Checking database tables...');
    for (const table of tables) {
        try {
            await db.execute(table.sql);
            console.log(`   Table ready: ${table.name}`);
        } catch (err) {
            // ER_DUP_FIELDNAME = column already exists — safe to ignore
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`   Column exists (ok): ${table.name}`);
            } else {
                console.error(`   Failed: ${table.name} - ${err.message}`);
            }
        }
    }
    console.log('Database init complete.\n');

    await seedDefaults();

    // Initialize phone validator blacklist in background
    phoneValidator.init().catch(err => console.error('[PhoneValidator] Failed to initialize:', err.message));
}

module.exports = initDB;

