package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class ProductStockDTO {
    @NotNull(message = "库存值不能为空")
    private Integer stock;
}
