package com.heritage.ecommerce.docs;

public class ProductApiDoc {
    public static final String CATEGORY_CREATE_EXAMPLE = "" +
            "{
              \"parentId\": 0,
              \"name\": \"非遗工艺\",
              \"sortOrder\": 1,
              \"level\": 1
            }";

    public static final String CATEGORY_LIST_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": [
                {
                  \"id\": 1,
                  \"parentId\": 0,
                  \"name\": \"非遗工艺\",
                  \"level\": 1,
                  \"sortOrder\": 1,
                  \"isDeleted\": 0
                }
              ]
            }";

    public static final String PRODUCT_CREATE_EXAMPLE = "" +
            "{
              \"title\": \"传统木雕摆件\",
              \"slug\": \"wood-carving\",
              \"summary\": \"手工木雕，工艺精湛\",
              \"description\": \"采用传统工艺制作，非遗传承\",
              \"coverImage\": \"/uploads/images/cover.jpg\",
              \"images\": \"[\"/uploads/images/1.jpg\",\"/uploads/images/2.jpg\"]\",
              \"videoUrl\": \"/uploads/videos/demo.mp4\",
              \"categoryId\": 1,
              \"tags\": \"木雕,非遗\",
              \"price\": 299.00,
              \"stock\": 50,
              \"status\": \"draft\"
            }";

    public static final String PRODUCT_LIST_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": {
                \"rows\": [
                  {
                    \"id\": 1001,
                    \"title\": \"传统木雕摆件\",
                    \"summary\": \"手工木雕，工艺精湛\",
                    \"price\": 299,
                    \"stock\": 50,
                    \"status\": \"published\"
                  }
                ],
                \"total\": 1,
                \"page\": 1,
                \"size\": 10
              }
            }";

    public static final String PRODUCT_DETAIL_RESPONSE = "" +
            "{
              \"code\": 200,
              \"message\": \"success\",
              \"data\": {
                \"id\": 1001,
                \"title\": \"传统木雕摆件\",
                \"slug\": \"wood-carving\",
                \"summary\": \"手工木雕，工艺精湛\",
                \"description\": \"采用传统工艺制成，千年传承\",
                \"price\": 299.00,
                \"stock\": 50,
                \"status\": \"published\",
                \"coverImage\": \"/uploads/images/cover.jpg\"
              }
            }";

    public static final String MEDIA_BATCH_UPLOAD_EXAMPLE = "" +
            "[
              {
                \"productId\": 1001,
                \"fileType\": \"image\",
                \"fileName\": \"demo1.jpg\",
                \"fileUrl\": \"/uploads/images/demo1.jpg\",
                \"filePath\": \"D:/heritage-ecommerce/uploads/images/demo1.jpg\",
                \"sortOrder\": 1
              },
              {
                \"productId\": 1001,
                \"fileType\": \"image\",
                \"fileName\": \"demo2.jpg\",
                \"fileUrl\": \"/uploads/images/demo2.jpg\",
                \"filePath\": \"D:/heritage-ecommerce/uploads/images/demo2.jpg\",
                \"sortOrder\": 2
              }
            ]";
}
