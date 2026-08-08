package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.CartAddDTO;
import com.heritage.ecommerce.dto.CartBatchSelectDTO;
import com.heritage.ecommerce.dto.CartUpdateDTO;
import com.heritage.ecommerce.entity.CartItem;

import java.util.List;
import java.util.Map;

public interface CartService {
    CartItem addToCart(String token, CartAddDTO dto);
    CartItem updateCartQuantity(String token, Long id, CartUpdateDTO dto);
    String deleteCartItem(String token, Long id);
    String batchSelectCartItems(String token, CartBatchSelectDTO dto);
    Map<String, Object> listCart(String token);
    Map<String, Object> calcSelectedTotal(String token);
}
