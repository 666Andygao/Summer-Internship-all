package com.heritage.ecommerce.design;

public class ThirdPartyImportApiDoc {
    public static final String PREVIEW_REQUEST = "" +
            "{
              \"sourceUrl\": \"https://item.jd.com/100123456789.html\",
              \"platform\": \"jd\"
            }";

    public static final String PREVIEW_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": {
                \"sourceName\": \"jd\",
                \"sourceProductId\": \"100123456789\",
                \"title\": \"传统木雕摆件\",
                \"price\": 299.00,
                \"mainImage\": \"https://img10.jd.com/....jpg\",
                \"detailImages\": [\"https://.../1.jpg\", \"https://.../2.jpg\"],
                \"specs\": {\"材质\": \"木质\", \"尺寸\": \"18cm\"},
                \"descriptionHtml\": \"<p>采用传统工艺...</p>\",
                \"riskLevel\": \"low\",
                \"importable\": true
              }
            }";

    public static final String IMPORT_REQUEST = "" +
            "{
              \"sourceUrl\": \"https://item.jd.com/100123456789.html\",
              \"platform\": \"jd\",
              \"categoryId\": 1,
              \"title\": \"传统木雕摆件\",
              \"status\": \"draft\",
              \"overwrite\": false
            }";

    public static final String IMPORT_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": {
                \"localProductId\": 1001,
                \"sourceName\": \"jd\",
                \"sourceProductId\": \"100123456789\",
                \"importStatus\": \"success\",
                \"mappingId\": 101
              }
            }";

    public static final String LOG_PAGE_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": {
                \"rows\": [{
                  \"id\": 1,
                  \"sourceName\": \"jd\",
                  \"sourceUrl\": \"https://item.jd.com/100123456789.html\",
                  \"status\": \"success\",
                  \"costMs\": 2150,
                  \"createdAt\": \"2026-08-08 10:00:00\"
                }],
                \"total\": 1,
                \"page\": 1,
                \"size\": 10
              }
            }";
}
