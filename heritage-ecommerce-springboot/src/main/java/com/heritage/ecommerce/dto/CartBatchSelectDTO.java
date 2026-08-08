package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotEmpty;
import java.util.List;

@Data
public class CartBatchSelectDTO {
    @NotEmpty(message = "至少选择一个商品")
    private List<Long> itemIds;

    private Boolean selected = true;
}
