package com.heritage.ecommerce.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class ProductCategoryDTO {
    private Long id;

    @NotNull(message = "父分类不能为空")
    private Long parentId;

    @NotBlank(message = "分类名称不能为空")
    private String name;

    private Integer sortOrder;
    private Integer level;
}
