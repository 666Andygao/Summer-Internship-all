package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class FavoriteProduct {
    private Long id;
    private Long userId;
    private Long productId;
    private Date createdAt;
}
