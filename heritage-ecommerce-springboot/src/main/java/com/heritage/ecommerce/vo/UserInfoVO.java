package com.heritage.ecommerce.vo;

import lombok.Data;

@Data
public class UserInfoVO {
    private Long id;
    private String username;
    private String displayName;
    private String phone;
    private String avatar;
    private String role;
    private String status;
}
