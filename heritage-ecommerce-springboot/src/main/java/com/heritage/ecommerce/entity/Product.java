package com.heritage.ecommerce.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class Product {
    private Long id;
    private Long merchantId;
    private Long merchantUserId;
    private String title;
    private String slug;
    private String summary;
    private String description;
    private String coverImage;
    private String images;
    private String videoUrl;
    private Long categoryId;
    private String tags;
    private BigDecimal price;
    private Integer stock;
    private Integer salesCount;
    private String status;
    private String productType;
    private String targetPlatform;
    private String sourceProductId;
    private String purchaseUrl;
    private Integer isDeleted;
    private Date createdAt;
    private Date updatedAt;
}
