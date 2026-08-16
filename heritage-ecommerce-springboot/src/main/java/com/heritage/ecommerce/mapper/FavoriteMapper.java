package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.FavoriteProduct;
import com.heritage.ecommerce.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FavoriteMapper {
    FavoriteProduct selectByUserAndProduct(@Param("userId") Long userId, @Param("productId") Long productId);

    int insertFavorite(FavoriteProduct favoriteProduct);

    int deleteFavorite(@Param("userId") Long userId, @Param("productId") Long productId);

    List<Product> queryFavoriteProducts(@Param("userId") Long userId,
                                       @Param("offset") Integer offset,
                                       @Param("size") Integer size);

    Long countFavoriteProducts(@Param("userId") Long userId);
}
