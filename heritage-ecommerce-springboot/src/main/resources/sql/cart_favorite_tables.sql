CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  quantity INT NOT NULL DEFAULT 1 COMMENT '购买数量',
  selected TINYINT NOT NULL DEFAULT 1 COMMENT '是否勾选',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uniq_user_product (user_id, product_id),
  KEY idx_user_cart (user_id),
  KEY idx_product_cart (product_id)
) COMMENT='购物车商品表';

CREATE TABLE favorite_products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uniq_user_favorite (user_id, product_id),
  KEY idx_user_favorite (user_id),
  KEY idx_product_favorite (product_id)
) COMMENT='商品收藏表';
