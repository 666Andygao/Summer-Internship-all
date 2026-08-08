package com.heritage.ecommerce.utils;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PageUtil {

    public <T> PageInfo<T> toPageInfo(List<T> list) {
        return new PageInfo<>(list);
    }

    public <T> Page<T> startPage(Integer page, Integer size) {
        int currentPage = page == null || page < 1 ? 1 : page;
        int pageSize = size == null || size < 1 ? 10 : size;
        return PageHelper.startPage(currentPage, pageSize);
    }
}
