package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;

@Data
public class AuthRegisterDTO {
    @NotBlank(message = "用户名不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9_]{4,20}$", message = "用户名需为4-20位字母数字或下划线")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@#$%^&*()_+=-]{6,20}$", message = "密码需6-20位，包含字母和数字")
    private String password;

    @NotBlank(message = "角色不能为空")
    private String role;

    private String displayName;
    private String phone;
    private String captchaKey;
    private String captchaCode;
}
