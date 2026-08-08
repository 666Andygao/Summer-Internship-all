package com.heritage.ecommerce.design;

public class ThirdPartyImportDesign {
    public static final String BUSINESS_SCENARIO = "" +
            "商家在后台粘贴京东或淘宝商品链接后，系统自动抓取商品标题、售价、主图、详情图文、规格参数，并进行清洗、规范化处理，最终生成本平台的非遗商品草稿，商家可以一键确认导入并上线。\n\n" +
            "适用场景：\n" +
            "1. 商家已有京东/淘宝商品链接，想快速复制成平台商品；\n" +
            "2. 平台希望复用外部商品信息减少人工录入成本；\n" +
            "3. 非遗商品经营者需要以跨平台商品参考为基础做二次创作和定制化上架。\n\n" +
            "设计目标：\n" +
            "1. 最小化人工录入成本；\n" +
            "2. 自动化抽取商品主体信息；\n" +
            "3. 对抓取结果做风险识别与风控拦截；\n" +
            "4. 保留第三方商品映射关系，便于后续价格同步、商品对照和采集审计。";

    public static final String BUSINESS_FLOW = "" +
            "1. 商家在商家后台点击“导入第三方商品”；\n" +
            "2. 复制京东/淘宝商品链接并提交解析请求；\n" +
            "3. 后端先校验链接合法性、是否频繁提交、是否属于允许的第三方站点；\n" +
            "4. 系统按策略选择抓取方式：\n" +
            "   - 低门槛场景：Jsoup 抓取 HTML + 正则/DOM 解析；\n" +
            "   - 官方合作场景：调用平台开放 API 获取标准化字段；\n" +
            "5. 抓取器抽取商品标题、售价、主图、详情图片、规格参数、标签信息；\n" +
            "6. 后端清洗/标准化字段，生成“待确认商品草稿”；\n" +
            "7. 商家查看预览页，确认是否导入为本平台商品；\n" +
            "8. 点击一键导入后，写入本地商品表，同时写入第三方商品映射表与抓取日志表；\n" +
            "9. 导入成功后，商品进入平台商品审核或草稿状态，后续可编辑、上架和销售；\n" +
            "10. 若抓取失败或风控触发，则记录抓取日志并返回明确失败原因。";

    public static final String TECHNICAL_SOLUTION = "" +
            "技术方案一：Jsoup + HTML 抓取（无密钥场景）\n" +
            "- 适用：商家自行提供商品链接，平台未获官方授权；\n" +
            "- 处理方式：使用 Jsoup 发起 HTTP 请求，抓取页面 HTML，解析 meta、title、JSON-LD、页面脚本中的商品数据；\n" +
            "- 优点：无需密钥，部署成本低；\n" +
            "- 缺点：网页结构变更频繁，反爬较强，数据字段不稳定；\n" +
            "- 建议：对抓取结果做字段清洗、正则兜底和白名单校验，必要时触发人工复核。\n\n" +
            "技术方案二：平台官方开放 API（授权场景）\n" +
            "- 适用：平台与第三方商品源具有合作关系或已申请官方授权；\n" +
            "- 处理方式：按官方 API 文档调用商品查询接口，获取标准化字段；\n" +
            "- 优点：数据结构稳定、字段丰富、反爬风险低；\n" +
            "- 缺点：需要密钥、申请权限和合规审查；\n" +
            "- 建议：统一接口适配层封装，抽象出 data-source-level 契约。\n\n" +
            "通用设计：\n" +
            "- 统一商品解析器接口：ThirdPartyParserService\n" +
            "- 抽象方法：parse(String url, Long merchantId)\n" +
            "- 具体实现：JdParser, TaobaoParser, OfficialApiParser\n" +
            "- 统一返回：ParsedProductPreviewDTO\n" +
            "- 数据落库：抓取日志表 + 映射关联表 + 本地商品表";

    public static final String TABLE_SQL = "" +
            "CREATE TABLE third_party_crawl_log (\n" +
            "  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',\n" +
            "  merchant_user_id BIGINT NOT NULL COMMENT '商家用户ID',\n" +
            "  source_name VARCHAR(32) NOT NULL COMMENT '第三方来源：jd/taobao',\n" +
            "  source_url VARCHAR(512) NOT NULL COMMENT '第三方商品链接',\n" +
            "  source_product_id VARCHAR(128) DEFAULT NULL COMMENT '第三方商品ID',\n" +
            "  task_name VARCHAR(128) DEFAULT NULL COMMENT '抓取任务名称',\n" +
            "  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '抓取状态：pending/running/success/failed',\n" +
            "  request_url VARCHAR(512) DEFAULT NULL COMMENT '请求链接',\n" +
            "  response_code INT DEFAULT NULL COMMENT 'HTTP响应状态码',\n" +
            "  response_body LONGTEXT DEFAULT NULL COMMENT '抓取返回原始内容',\n" +
            "  error_message TEXT DEFAULT NULL COMMENT '错误信息',\n" +
            "  cost_ms INT DEFAULT NULL COMMENT '耗时毫秒',\n" +
            "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',\n" +
            "  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',\n" +
            "  KEY idx_crawl_merchant (merchant_user_id),\n" +
            "  KEY idx_crawl_source (source_name),\n" +
            "  KEY idx_crawl_status (status),\n" +
            "  KEY idx_crawl_created_at (created_at)\n" +
            ") COMMENT='第三方商品抓取日志表';\n\n" +
            "CREATE TABLE third_party_product_mapping (\n" +
            "  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',\n" +
            "  local_product_id BIGINT NOT NULL COMMENT '本平台商品ID',\n" +
            "  source_name VARCHAR(32) NOT NULL COMMENT '来源平台：jd/taobao',\n" +
            "  source_product_id VARCHAR(128) NOT NULL COMMENT '第三方商品ID',\n" +
            "  source_url VARCHAR(512) DEFAULT NULL COMMENT '第三方商品URL',\n" +
            "  mapping_status VARCHAR(32) NOT NULL DEFAULT 'active' COMMENT '映射状态：active/disabled',\n" +
            "  sync_fields JSON DEFAULT NULL COMMENT '同步字段快照',\n" +
            "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',\n" +
            "  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',\n" +
            "  UNIQUE KEY uniq_mapping (local_product_id, source_name, source_product_id),\n" +
            "  KEY idx_mapping_local_product (local_product_id),\n" +
            "  KEY idx_mapping_source (source_name),\n" +
            "  KEY idx_mapping_status (mapping_status)\n" +
            ") COMMENT='第三方商品映射关联表';";

    public static final String API_LIST = "" +
            "1. POST /api/third-party/parse-preview\n" +
            "   - 作用：解析第三方链接，返回商品预览信息；\n" +
            "   - 权限：仅 artisan；\n" +
            "   - 参数：{\"sourceUrl\":\"https://item.jd.com/xxx.html\"}\n" +
            "   - 返回：{ code:200, message:'success', data:{ ...previewInfo... } }\n\n" +
            "2. POST /api/third-party/import\n" +
            "   - 作用：一键导入链接商品为本平台非遗商品；\n" +
            "   - 权限：仅 artisan；\n" +
            "   - 参数：{\"sourceUrl\":\"https://item.jd.com/xxx.html\", \"categoryId\":1, \"status\":\"draft\"}\n\n" +
            "3. GET /api/third-party/logs\n" +
            "   - 作用：分页查询抓取记录；\n" +
            "   - 权限：仅 artisan；\n" +
            "   - 参数：page=1&size=10&status=success\n\n" +
            "4. GET /api/third-party/logs/{id}\n" +
            "   - 作用：单次抓取详情；\n" +
            "   - 权限：仅 artisan。";

    public static final String PERMISSION_AND_RATE_LIMIT = "" +
            "权限控制：\n" +
            "- 仅非遗商家账号（role=artisan）可访问关联抓取接口；\n" +
            "- 买家账号、未登录用户与管理员不得访问第三方抓取接口；\n" +
            "- 需校验商家账号确实已完成入驻和资质审核。\n\n" +
            "限流规则：\n" +
            "- 单商家 1 分钟最多解析 5 条第三方链接；\n" +
            "- 超出上限返回 429 Too Many Requests；\n" +
            "- 提供统一限流 key：merchantUserId + minute；\n" +
            "- 对频繁请求、异常站点、抓取失败多次的链接进行拒绝策略；\n" +
            "- 对高风险 IP 与异常 UA 进行信号打标，触发风控拦截。\n\n" +
            "反爬与风控：\n" +
            "- 对下载内容中出现高频验证码、登录页、反爬脚本触发进行判定；\n" +
            "- 对 URL 域名黑名单、异常请求头、代理逃避策略做识别；\n" +
            "- 当检测到异常时记录日志并拒绝继续抓取。";
}
