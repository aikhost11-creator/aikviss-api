-- =====================================================================
-- DEFAULT SETUP (MySQL 8 compatible) — run in phpMyAdmin, once per shop DB
--   1) Select the shop database on the left (e.g. aikvisss_shop)
--   2) SQL tab -> paste this whole file -> Go
-- Safe to re-run: tables/columns are only added if missing,
-- default rows are only inserted into empty tables.
-- No products / orders data is inserted.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1) TABLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `mobile`     VARCHAR(20)  DEFAULT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `token`      TEXT         DEFAULT NULL,
  `roleName`   VARCHAR(100) DEFAULT NULL,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `siteconfig` (
  `id`              INT(11)       NOT NULL AUTO_INCREMENT,
  `siteName`        VARCHAR(255)  DEFAULT NULL,
  `clientUrl`       VARCHAR(500)  DEFAULT NULL,
  `logo`            VARCHAR(500)  DEFAULT NULL,
  `whiteLogo`       VARCHAR(500)  DEFAULT NULL,
  `icon`            VARCHAR(500)  DEFAULT NULL,
  `instagramURL`    VARCHAR(500)  DEFAULT NULL,
  `facebookURL`     VARCHAR(500)  DEFAULT NULL,
  `twitterURL`      VARCHAR(500)  DEFAULT NULL,
  `linkedInURL`     VARCHAR(500)  DEFAULT NULL,
  `youtubeURL`      VARCHAR(500)  DEFAULT NULL,
  `mobile`          VARCHAR(20)   DEFAULT NULL,
  `email`           VARCHAR(255)  DEFAULT NULL,
  `currency`        VARCHAR(10)   NOT NULL DEFAULT '₹',
  `deliveryCharge`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `primaryColor`    VARCHAR(20)   NOT NULL DEFAULT '#7b10b9',
  `marqueeItems`    JSON          DEFAULT NULL,
  `metaPixelId`     VARCHAR(50)   DEFAULT NULL,
  `buyNowText`      VARCHAR(100)  DEFAULT 'BUY NOW',
  `buyNowSubtext`   VARCHAR(200)  DEFAULT NULL,
  `metaAccessToken` VARCHAR(500)  DEFAULT NULL,
  `created_at`      DATETIME      NOT NULL,
  `updated_at`      DATETIME      NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `files` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `url`        VARCHAR(500) NOT NULL,
  `directory`  VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_files_directory` (`directory`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `home_banners` (
  `id`             INT(11)               NOT NULL AUTO_INCREMENT,
  `type`           ENUM('image','video') NOT NULL DEFAULT 'image',
  `url`            VARCHAR(500)          NOT NULL,
  `forMobile`      TINYINT(1)            NOT NULL DEFAULT 0,
  `redirectionUrl` VARCHAR(500)          DEFAULT NULL,
  `sortOrder`      INT(11)               NOT NULL DEFAULT 0,
  `isActive`       TINYINT(1)            NOT NULL DEFAULT 1,
  `created_at`     DATETIME              NOT NULL,
  `updated_at`     DATETIME              NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_hb_active_sort` (`isActive`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `image`      VARCHAR(500) DEFAULT NULL,
  `parentId`   INT(11)      DEFAULT NULL,
  `sortOrder`  INT(11)      NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_cat_parent` (`parentId`),
  INDEX `idx_cat_active_sort` (`isActive`, `sortOrder`),
  CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parentId`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `brands` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `image`      VARCHAR(500) DEFAULT NULL,
  `sortOrder`  INT(11)      NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_name` (`name`),
  INDEX `idx_brand_active_sort` (`isActive`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `brand_categories` (
  `id`         INT(11) NOT NULL AUTO_INCREMENT,
  `brandId`    INT(11) NOT NULL,
  `categoryId` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_cat` (`brandId`, `categoryId`),
  INDEX `idx_bc_brand` (`brandId`),
  INDEX `idx_bc_category` (`categoryId`),
  CONSTRAINT `fk_bc_brand`    FOREIGN KEY (`brandId`)    REFERENCES `brands` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_bc_category` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id`                  INT(11)       NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(500)  NOT NULL,
  `slug`                VARCHAR(500)  NOT NULL DEFAULT '',
  `sku`                 VARCHAR(100)  DEFAULT NULL,
  `description`         LONGTEXT      DEFAULT NULL,
  `shortDescription`    VARCHAR(500)  DEFAULT NULL,
  `resultTag`           VARCHAR(100)  DEFAULT NULL,
  `badge`               VARCHAR(100)  DEFAULT NULL,
  `benefits`            JSON          DEFAULT NULL,
  `whyLoveIt`           JSON          DEFAULT NULL,
  `keyIngredients`      JSON          DEFAULT NULL,
  `howToUse`            LONGTEXT      DEFAULT NULL,
  `additionalDetails`   LONGTEXT      DEFAULT NULL,
  `consumerCareDetails` LONGTEXT      DEFAULT NULL,
  `faqs`                JSON          DEFAULT NULL,
  `promoImage`          VARCHAR(500)  DEFAULT NULL,
  `promoReel`           VARCHAR(500)  DEFAULT NULL,
  `galleryMedia`        JSON          DEFAULT NULL,
  `sizeGuideImage`      VARCHAR(500)  DEFAULT NULL,
  `price`               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `salePrice`           DECIMAL(10,2) DEFAULT NULL,
  `categoryId`          INT(11)       DEFAULT NULL,
  `brandId`             INT(11)       DEFAULT NULL,
  `images`              JSON          DEFAULT NULL,
  `variants`            JSON          DEFAULT NULL,
  `tags`                JSON          DEFAULT NULL,
  `avgRating`           DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  `reviewCount`         INT(11)       NOT NULL DEFAULT 0,
  `isActive`            TINYINT(1)    NOT NULL DEFAULT 1,
  `isFeatured`          TINYINT(1)    NOT NULL DEFAULT 0,
  `sortOrder`           INT(11)       NOT NULL DEFAULT 0,
  `created_at`          DATETIME      NOT NULL,
  `updated_at`          DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_prod_slug` (`slug`(191)),
  INDEX `idx_prod_cat` (`categoryId`),
  INDEX `idx_prod_brand` (`brandId`),
  INDEX `idx_prod_active` (`isActive`),
  CONSTRAINT `fk_prod_cat`   FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prod_brand` FOREIGN KEY (`brandId`)    REFERENCES `brands` (`id`)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `productId`    INT(11)      NOT NULL,
  `reviewerName` VARCHAR(255) NOT NULL,
  `rating`       TINYINT(1)   NOT NULL DEFAULT 5,
  `title`        VARCHAR(500) DEFAULT NULL,
  `body`         TEXT         DEFAULT NULL,
  `reviewImage`  VARCHAR(500) DEFAULT NULL,
  `isActive`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`   DATETIME     NOT NULL,
  `updated_at`   DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_rev_product` (`productId`),
  CONSTRAINT `fk_rev_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `firstName`   VARCHAR(100) NOT NULL,
  `lastName`    VARCHAR(100) NOT NULL,
  `email`       VARCHAR(255) NOT NULL,
  `password`    VARCHAR(255) NOT NULL,
  `mobile`      VARCHAR(20)  DEFAULT NULL,
  `dateOfBirth` DATE         DEFAULT NULL,
  `token`       TEXT         DEFAULT NULL,
  `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  DATETIME     NOT NULL,
  `updated_at`  DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  INDEX `idx_cust_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_addresses` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `customerId` INT(11)      NOT NULL,
  `firstName`  VARCHAR(100) NOT NULL,
  `lastName`   VARCHAR(100) NOT NULL,
  `line1`      VARCHAR(255) NOT NULL,
  `line2`      VARCHAR(255) DEFAULT NULL,
  `city`       VARCHAR(100) DEFAULT NULL,
  `county`     VARCHAR(100) DEFAULT NULL,
  `postcode`   VARCHAR(20)  NOT NULL,
  `country`    VARCHAR(100) NOT NULL DEFAULT 'India',
  `phone`      VARCHAR(20)  DEFAULT NULL,
  `isDefault`  TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_addr_customer` (`customerId`),
  CONSTRAINT `fk_addr_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_settings` (
  `id`                    INT(11)      NOT NULL AUTO_INCREMENT,
  `razorpayKeyId`         VARCHAR(255) DEFAULT NULL,
  `razorpayKeySecret`     VARCHAR(255) DEFAULT NULL,
  `phonepeMerchantId`     VARCHAR(255) DEFAULT NULL,
  `phonepeApiKey`         VARCHAR(500) DEFAULT NULL,
  `phonepeSaltIndex`      VARCHAR(10)  DEFAULT '1',
  `phonepeSaltKey`        VARCHAR(500) DEFAULT NULL,
  `phonepeMerchantUserId` VARCHAR(255) DEFAULT NULL,
  `phonepeIsActive`       TINYINT(1)   NOT NULL DEFAULT 0,
  `codIsActive`           TINYINT(1)   NOT NULL DEFAULT 0,
  `isTestMode`            TINYINT(1)   NOT NULL DEFAULT 1,
  `isActive`              TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`            DATETIME     NOT NULL,
  `updated_at`            DATETIME     NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`                INT(11)       NOT NULL AUTO_INCREMENT,
  `customerId`        INT(11)       DEFAULT NULL,
  `orderNumber`       VARCHAR(100)  NOT NULL,
  `items`             JSON          NOT NULL,
  `subtotal`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `deliveryCharge`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `deliveryAddress`   JSON          DEFAULT NULL,
  `contactPhone`      VARCHAR(20)   DEFAULT NULL,
  `guestName`         VARCHAR(200)  DEFAULT NULL,
  `guestEmail`        VARCHAR(255)  DEFAULT NULL,
  `paymentMethod`     VARCHAR(50)   DEFAULT 'razorpay',
  `paymentId`         VARCHAR(255)  DEFAULT NULL,
  `razorpayOrderId`   VARCHAR(255)  DEFAULT NULL,
  `razorpayPaymentId` VARCHAR(255)  DEFAULT NULL,
  `status`            ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `notes`             TEXT          DEFAULT NULL,
  `shipeaso_response` TEXT          DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL,
  `updated_at`        DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`orderNumber`),
  INDEX `idx_order_customer` (`customerId`),
  INDEX `idx_order_status` (`status`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `faq_topics` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `sortOrder`  INT(11)      NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `faqs` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `topicId`    INT(11)      DEFAULT NULL,
  `question`   VARCHAR(500) NOT NULL,
  `answer`     TEXT         NOT NULL,
  `sortOrder`  INT(11)      NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_faq_topic` (`topicId`),
  CONSTRAINT `fk_faq_topic` FOREIGN KEY (`topicId`) REFERENCES `faq_topics` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `faq_config` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `pageTitle`   VARCHAR(255) DEFAULT 'FAQs',
  `bannerImage` VARCHAR(500) DEFAULT NULL,
  `updated_at`  DATETIME     NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promo_banners` (
  `id`             INT(11)      NOT NULL AUTO_INCREMENT,
  `rowIndex`       TINYINT(1)   NOT NULL,
  `colIndex`       TINYINT(1)   NOT NULL,
  `url`            VARCHAR(500) DEFAULT NULL,
  `redirectionUrl` VARCHAR(500) DEFAULT NULL,
  `label`          VARCHAR(255) DEFAULT NULL,
  `isActive`       TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     DATETIME     NOT NULL,
  `updated_at`     DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_promo_slot` (`rowIndex`, `colIndex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `abandon_checkouts` (
  `id`          INT(11)       NOT NULL AUTO_INCREMENT,
  `sessionId`   VARCHAR(64)   NOT NULL,
  `name`        VARCHAR(200)  DEFAULT NULL,
  `email`       VARCHAR(255)  DEFAULT NULL,
  `phone`       VARCHAR(20)   DEFAULT NULL,
  `address`     JSON          DEFAULT NULL,
  `items`       JSON          NOT NULL,
  `subtotal`    DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  `isConverted` TINYINT(1)    NOT NULL DEFAULT 0,
  `orderId`     INT(11)       DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL,
  `updated_at`  DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_abandon_session` (`sessionId`),
  INDEX `idx_abandon_email` (`email`),
  INDEX `idx_abandon_converted` (`isConverted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `legal_pages` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `slug`       VARCHAR(100) NOT NULL,
  `title`      VARCHAR(255) NOT NULL,
  `content`    LONGTEXT     DEFAULT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legal_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `about_us` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `bannerImage` VARCHAR(500) DEFAULT NULL,
  `tagline`     VARCHAR(255) DEFAULT NULL,
  `storyTitle`  VARCHAR(255) DEFAULT NULL,
  `storyText`   LONGTEXT     DEFAULT NULL,
  `storyImage`  VARCHAR(500) DEFAULT NULL,
  `vision`      TEXT         DEFAULT NULL,
  `mission`     TEXT         DEFAULT NULL,
  `values`      JSON         DEFAULT NULL,
  `stats`       JSON         DEFAULT NULL,
  `teamTitle`   VARCHAR(255) DEFAULT NULL,
  `team`        JSON         DEFAULT NULL,
  `updated_at`  DATETIME     NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reels` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `videoUrl`   VARCHAR(500) NOT NULL,
  `thumbnail`  VARCHAR(500) DEFAULT NULL,
  `title`      VARCHAR(255) DEFAULT NULL,
  `sortOrder`  INT(11)      NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reels_active_sort` (`isActive`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `old_data_mobiles` (
  `mobile` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2) MISSING COLUMNS (for tables that already existed with an old schema)
--    Each block adds the column only if it is not there yet.
-- ---------------------------------------------------------------------

SET @t='siteconfig', @c='currency', @d='VARCHAR(10) NOT NULL DEFAULT ''₹''';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='deliveryCharge', @d='DECIMAL(10,2) NOT NULL DEFAULT 0.00';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='primaryColor', @d='VARCHAR(20) NOT NULL DEFAULT ''#7b10b9''';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='marqueeItems', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='metaPixelId', @d='VARCHAR(50) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='buyNowText', @d='VARCHAR(100) DEFAULT ''BUY NOW''';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='buyNowSubtext', @d='VARCHAR(200) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='siteconfig', @c='metaAccessToken', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeMerchantId', @d='VARCHAR(255) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeApiKey', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeSaltIndex', @d='VARCHAR(10) DEFAULT ''1''';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeSaltKey', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeMerchantUserId', @d='VARCHAR(255) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='phonepeIsActive', @d='TINYINT(1) NOT NULL DEFAULT 0';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='payment_settings', @c='codIsActive', @d='TINYINT(1) NOT NULL DEFAULT 0';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='orders', @c='guestName', @d='VARCHAR(200) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='orders', @c='guestEmail', @d='VARCHAR(255) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='orders', @c='shipeaso_response', @d='TEXT DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- Guest orders need customerId to be nullable
ALTER TABLE `orders` MODIFY COLUMN `customerId` INT(11) DEFAULT NULL;

SET @t='product_reviews', @c='reviewImage', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='categories', @c='image', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='abandon_checkouts', @c='name', @d='VARCHAR(200) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='sku', @d='VARCHAR(100) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='shortDescription', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='resultTag', @d='VARCHAR(100) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='badge', @d='VARCHAR(100) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='benefits', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='whyLoveIt', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='keyIngredients', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='howToUse', @d='LONGTEXT DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='additionalDetails', @d='LONGTEXT DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='consumerCareDetails', @d='LONGTEXT DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='faqs', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='promoImage', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='promoReel', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='galleryMedia', @d='JSON DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='sizeGuideImage', @d='VARCHAR(500) DEFAULT NULL';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='isFeatured', @d='TINYINT(1) NOT NULL DEFAULT 0';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @t='products', @c='sortOrder', @d='INT(11) NOT NULL DEFAULT 0';
SET @s=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=@t AND COLUMN_NAME=@c)=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` ',@d), 'DO 0');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

-- ---------------------------------------------------------------------
-- 3) DEFAULT DATA
-- ---------------------------------------------------------------------

-- Admin login: admin@gmail.com / admin  (change it after first login)
INSERT INTO `users` (`name`, `password`, `mobile`, `email`, `roleName`, `isActive`, `created_at`, `updated_at`)
VALUES ('Admin', 'admin', '9999999999', 'admin@gmail.com', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `password` = 'admin', `isActive` = 1, `updated_at` = NOW();

-- Site config (id = 1 is what the admin panel edits).
-- Site name / URL are derived from the DB name:
--   aikvisss_shop  -> "Aikvisss" / https://aikvisss.shop
--   aikviss_online -> "Aikviss"  / https://aikviss.online
SET @shop = SUBSTRING_INDEX(DATABASE(), '_', 1);
SET @domain = REPLACE(DATABASE(), '_', '.');
INSERT INTO `siteconfig`
  (`id`, `siteName`, `clientUrl`, `logo`, `whiteLogo`, `icon`, `mobile`, `email`,
   `currency`, `deliveryCharge`, `primaryColor`, `marqueeItems`, `buyNowText`, `buyNowSubtext`,
   `created_at`, `updated_at`)
SELECT 1,
       CONCAT(UPPER(LEFT(@shop, 1)), SUBSTRING(@shop, 2)),
       CONCAT('https://', @domain),
       NULL, NULL, NULL, NULL, NULL,
       '₹', 0.00, '#7b10b9',
       '[{"emoji":"🚚","text":"Free shipping on every order"},{"emoji":"💵","text":"Cash on Delivery available"},{"emoji":"🔒","text":"100% secure checkout"},{"emoji":"⭐","text":"Loved by thousands of happy customers"}]',
       'BUY NOW', NULL, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `siteconfig`);

-- Payments: Cash on Delivery ON, Razorpay / PhonePe OFF until keys are added in admin
INSERT INTO `payment_settings`
  (`razorpayKeyId`, `razorpayKeySecret`, `isTestMode`, `isActive`,
   `phonepeSaltIndex`, `phonepeIsActive`, `codIsActive`, `created_at`, `updated_at`)
SELECT NULL, NULL, 1, 0, '1', 0, 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `payment_settings`);

-- FAQ page config
INSERT INTO `faq_config` (`pageTitle`, `bannerImage`, `updated_at`)
SELECT 'FAQs', NULL, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `faq_config`);

-- FAQ topics
INSERT INTO `faq_topics` (`name`, `sortOrder`, `isActive`, `created_at`, `updated_at`)
SELECT t.name, t.sortOrder, 1, NOW(), NOW()
FROM (
  SELECT 'Orders & Delivery' AS name, 1 AS sortOrder
  UNION ALL SELECT 'Payments', 2
  UNION ALL SELECT 'Returns & Refunds', 3
) t
WHERE NOT EXISTS (SELECT 1 FROM `faq_topics`);

-- FAQs
INSERT INTO `faqs` (`topicId`, `question`, `answer`, `sortOrder`, `isActive`, `created_at`, `updated_at`)
SELECT ft.id, f.question, f.answer, f.sortOrder, 1, NOW(), NOW()
FROM (
  SELECT 'Orders & Delivery' AS topic, 'How long does delivery take?' AS question, 'Orders are usually delivered within 4-8 business days, depending on your location.' AS answer, 1 AS sortOrder
  UNION ALL SELECT 'Orders & Delivery', 'Is shipping free?', 'Yes, shipping is free on every order.', 2
  UNION ALL SELECT 'Orders & Delivery', 'How can I track my order?', 'Once your order is shipped, tracking details are sent to your registered mobile number.', 3
  UNION ALL SELECT 'Payments', 'Is Cash on Delivery available?', 'Yes, Cash on Delivery is available on all serviceable pin codes.', 1
  UNION ALL SELECT 'Payments', 'Is online payment safe?', 'Yes, all online payments are processed through secure, encrypted payment gateways.', 2
  UNION ALL SELECT 'Returns & Refunds', 'What if I receive a damaged or wrong product?', 'Contact us within 7 days of delivery with your order number and photos, and we will arrange a replacement or refund.', 1
  UNION ALL SELECT 'Returns & Refunds', 'When will I get my refund?', 'Refunds are processed within 5-7 business days after the return is verified.', 2
) f
JOIN `faq_topics` ft ON ft.name = f.topic COLLATE utf8mb4_unicode_ci
WHERE NOT EXISTS (SELECT 1 FROM `faqs`);

-- Legal pages (only inserted if the slug does not exist yet)
INSERT IGNORE INTO `legal_pages` (`slug`, `title`, `content`, `updated_at`) VALUES
('shipping-policy', 'Shipping Policy',
'<h3>Shipping Policy</h3>
<p>We ship to all serviceable pin codes across India. Shipping is free on every order.</p>
<ul>
<li>Orders are processed within 1-2 business days.</li>
<li>Delivery usually takes 4-8 business days depending on your location.</li>
<li>Once shipped, tracking details are shared on your registered mobile number.</li>
</ul>
<p>Delivery timelines may vary during sales, festivals or due to courier / weather delays.</p>', NOW()),
('return-refund', 'Return & Refund Policy',
'<h3>Return & Refund Policy</h3>
<p>If you receive a damaged, defective or wrong product, contact us within 7 days of delivery with your order number and photos of the product.</p>
<ul>
<li>Products must be unused and in original packaging.</li>
<li>After verification, we will arrange a replacement or refund.</li>
<li>Refunds for prepaid orders are credited to the original payment method within 5-7 business days.</li>
<li>For Cash on Delivery orders, refunds are processed via bank transfer / UPI.</li>
</ul>', NOW()),
('privacy-policy', 'Privacy Policy',
'<h3>Privacy Policy</h3>
<p>We collect only the information needed to process and deliver your order, such as your name, phone number, email and shipping address.</p>
<ul>
<li>Your information is used only for order processing, delivery and customer support.</li>
<li>We share delivery details only with our logistics / courier partners.</li>
<li>Online payments are processed by secure payment gateways; we do not store card details.</li>
</ul>
<p>By using this website, you agree to this privacy policy.</p>', NOW()),
('terms-conditions', 'Terms & Conditions',
'<h3>Terms & Conditions</h3>
<p>By accessing and placing an order on this website, you agree to the following terms.</p>
<ul>
<li>All prices are in Indian Rupees (₹) and inclusive of applicable taxes.</li>
<li>Product images are for representation; actual colour may vary slightly.</li>
<li>We reserve the right to cancel orders in case of pricing errors, stock unavailability or suspected misuse.</li>
<li>These terms may be updated at any time without prior notice.</li>
</ul>', NOW());

-- About Us
INSERT INTO `about_us`
  (`bannerImage`, `tagline`, `storyTitle`, `storyText`, `storyImage`, `vision`, `mission`,
   `values`, `stats`, `teamTitle`, `team`, `updated_at`)
SELECT NULL,
       'Our Story, Our Mission',
       'Who We Are',
       'We are a brand built on passion, quality, and care.',
       NULL,
       'To be the most trusted brand in every home.',
       'To deliver premium quality products that make everyday life better.',
       '[{"icon":"✨","title":"Quality","text":"We never compromise on quality."},{"icon":"💚","title":"Care","text":"Every product is made with care."},{"icon":"🌿","title":"Sustainability","text":"We care for the planet."},{"icon":"🤝","title":"Trust","text":"Built on trust, one customer at a time."}]',
       '[{"number":"1M+","label":"Happy Customers"},{"number":"500+","label":"Products"},{"number":"10+","label":"Years of Excellence"},{"number":"24/7","label":"Customer Support"}]',
       'Meet Our Team',
       '[]',
       NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `about_us`);

-- ---------------------------------------------------------------------
-- 4) CHECK
-- ---------------------------------------------------------------------
SELECT 'users' AS tbl, COUNT(*) AS rows_count FROM `users`
UNION ALL SELECT 'siteconfig', COUNT(*) FROM `siteconfig`
UNION ALL SELECT 'payment_settings', COUNT(*) FROM `payment_settings`
UNION ALL SELECT 'faq_config', COUNT(*) FROM `faq_config`
UNION ALL SELECT 'faq_topics', COUNT(*) FROM `faq_topics`
UNION ALL SELECT 'faqs', COUNT(*) FROM `faqs`
UNION ALL SELECT 'legal_pages', COUNT(*) FROM `legal_pages`
UNION ALL SELECT 'about_us', COUNT(*) FROM `about_us`;
