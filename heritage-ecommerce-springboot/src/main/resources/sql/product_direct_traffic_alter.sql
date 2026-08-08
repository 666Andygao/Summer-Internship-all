ALTER TABLE products
  ADD COLUMN product_type VARCHAR(32) NOT NULL DEFAULT 'self' COMMENT '商品类型：self-自营上架 / leadout-第三方导流',
  ADD COLUMN target_platform VARCHAR(32) DEFAULT NULL COMMENT '导流目标平台：jd / tb / tmall',
  ADD COLUMN source_product_id VARCHAR(128) DEFAULT NULL COMMENT '第三方商品源ID',
  ADD COLUMN purchase_url VARCHAR(1024) DEFAULT NULL COMMENT '导流商品跳转购买链接';

ALTER TABLE products
  ADD INDEX idx_product_type (product_type),
  ADD INDEX idx_target_platform (target_platform),
  ADD INDEX idx_source_product_id (source_product_id);
