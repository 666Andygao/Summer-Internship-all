package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class CartItem {
    private Long id;
    private Long userId;
    private Long productId;
    private Integer quantity;
    private Integer selected;
    private Date createdAt;
    private Date updatedAt;
}
