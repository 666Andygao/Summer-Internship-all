package com.heritage.ecommerce.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class OrderItem {
    private Long id;
    private Long orderId;
    private Long productId;
    private Long merchantId;
    private String productTitle;
    private String productCoverImage;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    private String status;
    private Date createdAt;
    private Date updatedAt;
}
