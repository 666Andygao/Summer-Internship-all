package com.heritage.ecommerce.docs;

public class LeadoutProductApiDoc {
    public static final String IMPORT_REQUEST = "" +
            "{\n" +
            "  \"title\": \"非遗木雕摆件\",\n" +
            "  \"categoryId\": 1,\n" +
            "  \"price\": 299.00,\n" +
            "  \"stock\": 0,\n" +
            "  \"productType\": \"leadout\",\n" +
            "  \"targetPlatform\": \"jd\",\n" +
            "  \"sourceProductId\": \"100123456789\",\n" +
            "  \"purchaseUrl\": \"https://item.jd.com/100123456789.html\",\n" +
            "  \"status\": \"published\"\n" +
            "}";

    public static final String PRODUCT_LIST_RESPONSE = "" +
            "{\n" +
            "  \"code\": 200,\n" +
            "  \"message\": \"success\",\n" +
            "  \"data\": {\n" +
            "    \"rows\": [{\n" +
            "      \"id\": 101,\n" +
            "      \"title\": \"非遗木雕摆件\",\n" +
            "      \"productType\": \"leadout\",\n" +
            "      \"targetPlatform\": \"jd\",\n" +
            "      \"purchaseUrl\": \"https://item.jd.com/100123456789.html\",\n" +
            "      \"showCart\": false,\n" +
            "      \"showOrder\": false\n" +
            "    }],\n" +
            "    \"total\": 1,\n" +
            "    \"page\": 1,\n" +
            "    \"size\": 10\n" +
            "  }\n" +
            "}";

    public static final String PRODUCT_DETAIL_RESPONSE = "" +
            "{\n" +
            "  \"code\": 200,\n" +
            "  \"message\": \"success\",\n" +
            "  \"data\": {\n" +
            "    \"id\": 101,\n" +
            "    \"title\": \"非遗木雕摆件\",\n" +
            "    \"productType\": \"leadout\",\n" +
            "    \"targetPlatform\": \"jd\",\n" +
            "    \"purchaseUrl\": \"https://item.jd.com/100123456789.html\",\n" +
            "    \"allowCart\": false,\n" +
            "    \"allowOrder\": false,\n" +
            "    \"buyButtonText\": \"前往京东购买\"\n" +
            "  }\n" +
            "}";
}
