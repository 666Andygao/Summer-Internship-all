package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.OrderCreateDTO;

import java.util.Map;

public interface OrderService {
    Map<String, Object> createOrder(String token, OrderCreateDTO dto);
    Map<String, Object> listBuyerOrders(String token, String status, Integer page, Integer size);
    Map<String, Object> getBuyerOrderDetail(String token, Long orderId);
    Map<String, Object> cancelBuyerOrder(String token, Long orderId);
    Map<String, Object> listSellerOrders(String token, String status, Integer page, Integer size);
    Map<String, Object> shipSellerOrder(String token, Long orderId);
    void cancelExpiredOrders();
}
