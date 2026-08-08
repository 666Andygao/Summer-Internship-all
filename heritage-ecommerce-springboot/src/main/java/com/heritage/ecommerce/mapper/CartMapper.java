package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.CartItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CartMapper {
    CartItem selectByUserAndProduct(@Param("userId") Long userId, @Param("productId") Long productId);

    int insertCartItem(CartItem cartItem);

    int updateCartItemQuantity(@Param("id") Long id, @Param("quantity") Integer quantity);

    int updateCartItemSelection(@Param("id") Long id, @Param("selected") Integer selected);

    int batchUpdateSelection(@Param("userId") Long userId, @Param("itemIds") List<Long> itemIds, @Param("selected") Integer selected);

    int deleteCartItem(@Param("id") Long id, @Param("userId") Long userId);

    int deleteCartItemsByIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    List<CartItem> queryCartItemsByUser(@Param("userId") Long userId);

    CartItem selectById(@Param("id") Long id, @Param("userId") Long userId);

    int updateCartItem(@Param("id") Long id, @Param("quantity") Integer quantity, @Param("selected") Integer selected);
}
