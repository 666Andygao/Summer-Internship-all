package com.heritage.ecommerce.utils;

import com.heritage.ecommerce.common.PageResult;

import java.util.List;

public final class StatPageUtil {

    private StatPageUtil() {}

    public static int normalizePage(Integer page) {
        return (page == null || page < 1) ? 1 : page;
    }

    public static int normalizeSize(Integer size) {
        return (size == null || size < 1) ? 10 : Math.min(size, 100);
    }

    public static int toOffset(Integer page, Integer size) {
        return (normalizePage(page) - 1) * normalizeSize(size);
    }

    public static <T> PageResult<T> build(List<T> rows, Long total, Integer page, Integer size) {
        return new PageResult<>(rows, total, normalizePage(page), normalizeSize(size));
    }
}