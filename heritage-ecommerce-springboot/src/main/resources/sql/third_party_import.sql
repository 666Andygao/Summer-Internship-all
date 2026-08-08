CREATE TABLE third_party_crawl_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  merchant_user_id BIGINT NOT NULL COMMENT '商家用户ID',
  source_name VARCHAR(32) NOT NULL COMMENT '第三方来源：jd/taobao',
  source_url VARCHAR(512) NOT NULL COMMENT '第三方商品链接',
  source_product_id VARCHAR(128) DEFAULT NULL COMMENT '第三方商品ID',
  task_name VARCHAR(128) DEFAULT NULL COMMENT '抓取任务名称',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '抓取状态：pending/running/success/failed',
  request_url VARCHAR(512) DEFAULT NULL COMMENT '请求链接',
  response_code INT DEFAULT NULL COMMENT 'HTTP响应状态码',
  response_body LONGTEXT DEFAULT NULL COMMENT '抓取返回原始内容',
  error_message TEXT DEFAULT NULL COMMENT '错误信息',
  cost_ms INT DEFAULT NULL COMMENT '耗时毫秒',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_crawl_merchant (merchant_user_id),
  KEY idx_crawl_source (source_name),
  KEY idx_crawl_status (status),
  KEY idx_crawl_created_at (created_at)
) COMMENT='第三方商品抓取日志表';

CREATE TABLE third_party_product_mapping (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  local_product_id BIGINT NOT NULL COMMENT '本平台商品ID',
  source_name VARCHAR(32) NOT NULL COMMENT '来源平台：jd/taobao',
  source_product_id VARCHAR(128) NOT NULL COMMENT '第三方商品ID',
  source_url VARCHAR(512) DEFAULT NULL COMMENT '第三方商品URL',
  mapping_status VARCHAR(32) NOT NULL DEFAULT 'active' COMMENT '映射状态：active/disabled',
  sync_fields JSON DEFAULT NULL COMMENT '同步字段快照',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uniq_mapping (local_product_id, source_name, source_product_id),
  KEY idx_mapping_local_product (local_product_id),
  KEY idx_mapping_source (source_name),
  KEY idx_mapping_status (mapping_status)
) COMMENT='第三方商品映射关联表';
