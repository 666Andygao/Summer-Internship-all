package com.heritage.ecommerce.common;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class PageResult<T> implements Serializable {
    private List<T> rows;
    private Long total;
    private Integer page;
    private Integer size;

    public PageResult(List<T> rows, Long total, Integer page, Integer size) {
        this.rows = rows;
        this.total = total;
        this.page = page;
        this.size = size;
    }
}
