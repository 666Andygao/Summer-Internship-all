package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class AddressDTO {
    private Long id;

    @NotBlank(message = "收货人不能为空")
    private String recipientName;

    @NotBlank(message = "联系电话不能为空")
    private String phone;

    @NotBlank(message = "省份不能为空")
    private String province;

    @NotBlank(message = "城市不能为空")
    private String city;

    @NotBlank(message = "区县不能为空")
    private String district;

    @NotBlank(message = "详细地址不能为空")
    private String detail;

    private Integer isDefault;
}
