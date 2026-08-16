package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class ThirdPartyCrawlLog {
    private Long id;
    private Long merchantUserId;
    private String sourceName;
    private String sourceUrl;
    private String sourceProductId;
    private String taskName;
    private String status;
    private String requestUrl;
    private Integer responseCode;
    private String responseBody;
    private String errorMessage;
    private Integer costMs;
    private Date createdAt;
    private Date updatedAt;
}
