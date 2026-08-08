package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.FavoriteAddDTO;
import com.heritage.ecommerce.entity.Product;

import java.util.Map;

public interface FavoriteService {
    String addFavorite(String token, FavoriteAddDTO dto);
    String cancelFavorite(String token, Long productId);
    Map<String, Object> listFavorites(String token, Integer page, Integer size);
}
