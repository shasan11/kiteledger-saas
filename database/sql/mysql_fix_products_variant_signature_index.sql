-- Repair a failed install at:
-- SQLSTATE[42000]: 1071 Specified key was too long
-- products_parent_variant_signature_unique(parent_id, variant_signature)
--
-- Run this against the failed database, then run /install again.

ALTER TABLE `products`
    MODIFY `variant_signature` VARCHAR(1000)
    CHARACTER SET ascii
    COLLATE ascii_bin
    NULL;

SET @index_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND index_name = 'products_parent_variant_signature_unique'
);

SET @sql := IF(
    @index_exists = 0,
    'ALTER TABLE `products` ADD UNIQUE `products_parent_variant_signature_unique` (`parent_id`, `variant_signature`)',
    'SELECT ''products_parent_variant_signature_unique already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
