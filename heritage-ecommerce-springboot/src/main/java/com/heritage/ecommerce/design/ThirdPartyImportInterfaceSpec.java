package com.heritage.ecommerce.design;

public class ThirdPartyImportInterfaceSpec {
    public static final String HTTP_METHOD = "RESTful 接口设计：\n" +
            "POST /api/third-party/parse-preview\n" +
            "POST /api/third-party/import\n" +
            "GET /api/third-party/logs\n" +
            "GET /api/third-party/logs/{id}";

    public static final String COMMON_RULES = "" +
            "1. 统一返回结构：{ code, message, data }\n" +
            "2. 所有抓取接口均需 Authorization: Bearer xxx\n" +
            "3. 仅 artisan 角色可调用\n" +
            "4. 解析失败时返回 400/422，抓取异常时返回 502\n" +
            "5. 频率超限返回 429\n" +
            "6. 所有抓取日志均保存 source_url、source_product_id、error_message、status";

    public static final String PREVIEW_DOC = "" +
            "接口：POST /api/third-party/parse-preview\n" +
            "描述：传入第三方商品链接，返回解析预览信息。\n" +
            "请求参数：{\"sourceUrl\":\"https://item.jd.com/100123456789.html\", \"platform\": \"jd\"}\n" +
            "返回示例：{\"code\":200,\"message\":\"success\",\"data\":{...}}\n" +
            "注意：仅处理商品链接，返回 importable 为 true 时可以继续导入。";

    public static final String IMPORT_DOC = "" +
            "接口：POST /api/third-party/import\n" +
            "描述：将解析后的第三方商品一键导入为本平台商品。\n" +
            "请求参数：{\"sourceUrl\":\"https://item.jd.com/100123456789.html\", \"categoryId\":1, \"status\":\"draft\"}\n" +
            "返回示例：{\"code\":200,\"message\":\"success\",\"data\":{\"localProductId\":1001, \"importStatus\":\"success\"}}\n" +
            "注意：导入成功后，需写入本地 product 表、映射表和日志表。";

    public static final String LOG_DOC = "" +
            "接口：GET /api/third-party/logs\n" +
            "描述：分页查询抓取日志。\n" +
            "请求参数：page=1&size=10&status=success\n" +
            "返回示例：{\"code\":200,\"message\":\"success\",\"data\":{\"rows\":[...],\"total\":1,\"page\":1,\"size\":10}}\n" +
            "说明：用于商家查看自己的抓取记录与失败原因。";
}
