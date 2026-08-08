package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.Order;
import com.heritage.ecommerce.entity.OrderItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OrderMapper {
    int insertOrder(Order order);
    int insertOrderItem(OrderItem orderItem);
    Order selectById(@Param("id") Long id, @Param("userId") Long userId);
    Order selectByIdForMerchant(@Param("id") Long id, @Param("merchantId") Long merchantId);
    List<Order> queryOrderListByUser(@Param("userId") Long userId,
                                     @Param("status") String status,
                                     @Param("offset") Integer offset,
                                     @Param("size") Integer size);
    Long countOrderListByUser(@Param("userId") Long userId, @Param("status") String status);
    List<Order> queryOrderListByMerchant(@Param("merchantId") Long merchantId,
                                        @Param("status") String status,
                                        @Param("offset") Integer offset,
                                        @Param("size") Integer size);
    Long countOrderListByMerchant(@Param("merchantId") Long merchantId, @Param("status") String status);
    List<OrderItem> queryItemsByOrderId(@Param("orderId") Long orderId);
    int updateOrderStatus(@Param("id") Long id, @Param("status") String status);
    int updateOrderStatusByUser(@Param("id") Long id, @Param("userId") Long userId, @Param("status") String status);
    int cancelOrderIfPending(@Param("id") Long id, @Param("userId") Long userId, @Param("status") String status);
    List<Order> queryExpiredUnpaidOrders();
    int updateOrderStatusByOrderNo(@Param("orderNo") String orderNo, @Param("status") String status);
}
