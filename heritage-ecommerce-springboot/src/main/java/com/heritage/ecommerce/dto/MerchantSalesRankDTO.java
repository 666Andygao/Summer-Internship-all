package com.heritage.ecommerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MerchantSalesRankDTO {
    private Long productId;
    private String productTitle;
    private String productCoverImage;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
}