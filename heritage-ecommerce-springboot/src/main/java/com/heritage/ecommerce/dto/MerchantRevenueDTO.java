package com.heritage.ecommerce.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MerchantRevenueDTO {
    private Long todayOrderCount;
    private BigDecimal todayRevenue;
    private Long totalOrderCount;
    private BigDecimal totalRevenue;
}