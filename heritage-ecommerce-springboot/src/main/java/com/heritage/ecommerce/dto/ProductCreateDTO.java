package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;

@Data
public class ProductCreateDTO {
    @NotBlank(message = "商品标题不能为空")
    private String title;

    private String slug;
    private String summary;
    private String description;
    private String coverImage;
    private String images;
    private String videoUrl;

    @NotNull(message = "分类不能为空")
    private Long categoryId;

    private String tags;

    @NotNull(message = "商品单价不能为空")
    private BigDecimal price;

    @NotNull(message = "库存不能为空")
    private Integer stock;

    private String productType;
    private String targetPlatform;
    private String sourceProductId;
    private String purchaseUrl;
    private String status;
}
