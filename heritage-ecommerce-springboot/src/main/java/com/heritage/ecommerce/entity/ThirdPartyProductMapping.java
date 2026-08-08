package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class ThirdPartyProductMapping {
    private Long id;
    private Long localProductId;
    private String sourceName;
    private String sourceProductId;
    private String sourceUrl;
    private String mappingStatus;
    private String syncFields;
    private Date createdAt;
    private Date updatedAt;
}
