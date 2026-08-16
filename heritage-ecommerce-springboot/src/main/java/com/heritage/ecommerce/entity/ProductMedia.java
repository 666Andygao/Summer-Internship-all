package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class ProductMedia {
    private Long id;
    private Long productId;
    private String fileType;
    private String fileName;
    private String fileUrl;
    private String filePath;
    private Integer sortOrder;
    private Date createdAt;
}
