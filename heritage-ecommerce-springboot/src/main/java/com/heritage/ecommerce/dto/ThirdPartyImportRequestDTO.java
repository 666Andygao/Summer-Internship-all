package com.heritage.ecommerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ThirdPartyImportRequestDTO {
    private String sourceUrl;
    private String platform;
    private Long categoryId;
    private String title;
    private BigDecimal price;
    private Integer stock;
    private String status;
    private String description;
    private String coverImage;
    private String images;
}
