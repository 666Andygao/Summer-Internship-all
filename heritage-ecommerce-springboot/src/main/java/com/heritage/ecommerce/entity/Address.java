package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class Address {
    private Long id;
    private Long userId;
    private String recipientName;
    private String phone;
    private String province;
    private String city;
    private String district;
    private String detail;
    private Integer isDefault;
    private Date createdAt;
}
