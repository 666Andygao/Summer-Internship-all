package com.heritage.ecommerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductUpdateDTO {
    private String title;
    private String summary;
    private String description;
    private String coverImage;
    private String images;
    private String videoUrl;
    private Long categoryId;
    private String tags;
    private BigDecimal price;
    private Integer stock;
    private String productType;
    private String targetPlatform;
    private String sourceProductId;
    private String purchaseUrl;
    private String status;
}
