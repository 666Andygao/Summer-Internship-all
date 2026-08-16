package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class ProductCategory {
    private Long id;
    private Long parentId;
    private String name;
    private Integer level;
    private Integer sortOrder;
    private Integer isDeleted;
    private Date createdAt;
}
