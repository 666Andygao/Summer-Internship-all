package com.heritage.ecommerce.entity;

import lombok.Data;

import java.util.Date;

@Data
public class User {
    private Long id;
    private String username;
    private String password;
    private String role;
    private String displayName;
    private String phone;
    private String avatar;
    private String status;
    private Date createdAt;
    private Date updatedAt;
}
