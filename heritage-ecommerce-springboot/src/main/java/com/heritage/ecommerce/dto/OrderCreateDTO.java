package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotEmpty;
import java.util.List;

@Data
public class OrderCreateDTO {
    @NotEmpty(message = "至少选择一个商品结算")
    private List<Long> cartItemIds;

    private String remark;
    private Long addressId;
}
