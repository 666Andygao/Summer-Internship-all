package com.heritage.ecommerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductQueryDTO {
    private Integer page = 1;
    private Integer size = 10;
    private String keyword;
    private Long categoryId;
    private String status;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private String productType;
    private String sort;
    private String tag;
}
