package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.constants.OrderStatus;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.OrderCreateDTO;
import com.heritage.ecommerce.entity.Address;
import com.heritage.ecommerce.entity.CartItem;
import com.heritage.ecommerce.entity.Order;
import com.heritage.ecommerce.entity.OrderItem;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.CartMapper;
import com.heritage.ecommerce.mapper.OrderMapper;
import com.heritage.ecommerce.mapper.ProductMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.OrderService;
import com.heritage.ecommerce.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createOrder(String token, OrderCreateDTO dto) {
        User user = getCurrentUser(token);
        if (!UserRole.BUYER.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅买家可创建订单");
        }
        if (dto == null || dto.getCartItemIds() == null || dto.getCartItemIds().isEmpty()) {
            throw new BusinessException(400, "至少选择一个商品结算");
        }

        Address shippingAddress = resolveShippingAddress(user, dto.getAddressId());
        List<CartItem> selectedItems = new ArrayList<>();
        for (Long cartItemId : dto.getCartItemIds()) {
            CartItem cartItem = cartMapper.selectById(cartItemId, user.getId());
            if (cartItem == null) {
                throw new BusinessException(404, "购物车商品不存在：" + cartItemId);
            }
            Product product = productMapper.selectProductById(cartItem.getProductId());
            if (product == null || product.getIsDeleted() != null && product.getIsDeleted() == 1) {
                throw new BusinessException(404, "商品不存在：" + cartItem.getProductId());
            }
            if ("leadout".equalsIgnoreCase(product.getProductType())) {
                throw new BusinessException(400, "导流商品不能下单");
            }
            if (product.getStock() == null || product.getStock() < cartItem.getQuantity()) {
                throw new BusinessException(400, "商品库存不足：" + product.getTitle());
            }
            selectedItems.add(cartItem);
        }

        Map<Long, List<CartItem>> groupedByMerchant = selectedItems.stream()
                .collect(Collectors.groupingBy(cartItem -> {
                    Product product = productMapper.selectProductById(cartItem.getProductId());
                    return product == null ? null : product.getMerchantUserId();
                }));

        List<Map<String, Object>> orderSummaries = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Map.Entry<Long, List<CartItem>> entry : groupedByMerchant.entrySet()) {
            Long merchantId = entry.getKey();
            if (merchantId == null) {
                throw new BusinessException(400, "商品商家信息异常");
            }
            List<CartItem> merchantCartItems = entry.getValue();

            Order order = new Order();
            order.setUserId(user.getId());
            order.setMerchantId(merchantId);
            order.setOrderNo(generateOrderNo());
            order.setStatus(OrderStatus.PENDING_PAYMENT);
            order.setReceiverName(shippingAddress.getRecipientName());
            order.setReceiverPhone(shippingAddress.getPhone());
            order.setReceiverProvince(shippingAddress.getProvince());
            order.setReceiverCity(shippingAddress.getCity());
            order.setReceiverDistrict(shippingAddress.getDistrict());
            order.setReceiverDetail(shippingAddress.getDetail());
            order.setRemark(dto.getRemark());
            order.setCreatedAt(new Date());
            order.setUpdatedAt(new Date());

            BigDecimal orderTotal = BigDecimal.ZERO;
            List<OrderItem> orderItems = new ArrayList<>();

            for (CartItem cartItem : merchantCartItems) {
                Product product = productMapper.selectProductById(cartItem.getProductId());
                if (product == null) {
                    throw new BusinessException(404, "商品不存在：" + cartItem.getProductId());
                }

                int affected = productMapper.decreaseStock(product.getId(), cartItem.getQuantity());
                if (affected <= 0) {
                    throw new BusinessException(400, "商品库存不足：" + product.getTitle());
                }

                BigDecimal subtotal = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
                orderTotal = orderTotal.add(subtotal);

                OrderItem orderItem = new OrderItem();
                orderItem.setOrderId(null);
                orderItem.setProductId(product.getId());
                orderItem.setMerchantId(merchantId);
                orderItem.setProductTitle(product.getTitle());
                orderItem.setProductCoverImage(product.getCoverImage());
                orderItem.setUnitPrice(product.getPrice() == null ? BigDecimal.ZERO : product.getPrice());
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setSubtotal(subtotal);
                orderItem.setStatus(OrderStatus.PENDING_PAYMENT);
                orderItem.setCreatedAt(new Date());
                orderItem.setUpdatedAt(new Date());
                orderItems.add(orderItem);
            }

            order.setTotalAmount(orderTotal);
            order.setFreight(BigDecimal.ZERO);
            order.setPayAmount(orderTotal);
            order.setUpdatedAt(new Date());
            int orderInserted = orderMapper.insertOrder(order);
            if (orderInserted <= 0) {
                throw new BusinessException(500, "订单创建失败");
            }

            for (OrderItem item : orderItems) {
                item.setOrderId(order.getId());
                orderMapper.insertOrderItem(item);
            }

            List<Long> cartIds = merchantCartItems.stream().map(CartItem::getId).collect(Collectors.toList());
            cartMapper.deleteCartItemsByIds(user.getId(), cartIds);

            totalAmount = totalAmount.add(orderTotal);
            Map<String, Object> summary = new HashMap<>();
            summary.put("orderId", order.getId());
            summary.put("orderNo", order.getOrderNo());
            summary.put("status", order.getStatus());
            summary.put("totalAmount", order.getPayAmount());
            orderSummaries.add(summary);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("orders", orderSummaries);
        result.put("totalAmount", totalAmount);
        result.put("address", shippingAddress);
        return result;
    }

    @Override
    public Map<String, Object> listBuyerOrders(String token, String status, Integer page, Integer size) {
        User user = getCurrentUser(token);
        int currentPage = page == null || page < 1 ? 1 : page;
        int currentSize = size == null || size < 1 ? 10 : size;
        int offset = (currentPage - 1) * currentSize;

        List<Order> rows = orderMapper.queryOrderListByUser(user.getId(), status, offset, currentSize);
        Long total = orderMapper.countOrderListByUser(user.getId(), status);
        List<Map<String, Object>> resultRows = new ArrayList<>();
        for (Order order : rows) {
            Map<String, Object> row = new HashMap<>();
            row.put("order", order);
            row.put("items", orderMapper.queryItemsByOrderId(order.getId()));
            resultRows.add(row);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", resultRows);
        result.put("total", total);
        result.put("page", currentPage);
        result.put("size", currentSize);
        return result;
    }

    @Override
    public Map<String, Object> getBuyerOrderDetail(String token, Long orderId) {
        User user = getCurrentUser(token);
        Order order = orderMapper.selectById(orderId, user.getId());
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("order", order);
        result.put("items", orderMapper.queryItemsByOrderId(orderId));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> cancelBuyerOrder(String token, Long orderId) {
        User user = getCurrentUser(token);
        Order order = orderMapper.selectById(orderId, user.getId());
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }
        if (!OrderStatus.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            throw new BusinessException(400, "仅可取消待支付订单");
        }

        int affected = orderMapper.cancelOrderIfPending(orderId, user.getId(), OrderStatus.PENDING_PAYMENT);
        if (affected <= 0) {
            throw new BusinessException(400, "订单已无法取消");
        }
        for (OrderItem item : orderMapper.queryItemsByOrderId(orderId)) {
            productMapper.increaseStock(item.getProductId(), item.getQuantity());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("status", OrderStatus.CANCELLED);
        result.put("message", "取消成功");
        return result;
    }

    @Override
    public Map<String, Object> listSellerOrders(String token, String status, Integer page, Integer size) {
        User user = getCurrentUser(token);
        if (!UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅商家可查看订单");
        }

        int currentPage = page == null || page < 1 ? 1 : page;
        int currentSize = size == null || size < 1 ? 10 : size;
        int offset = (currentPage - 1) * currentSize;

        List<Order> rows = orderMapper.queryOrderListByMerchant(user.getId(), status, offset, currentSize);
        Long total = orderMapper.countOrderListByMerchant(user.getId(), status);
        List<Map<String, Object>> resultRows = new ArrayList<>();
        for (Order order : rows) {
            Map<String, Object> row = new HashMap<>();
            row.put("order", order);
            row.put("items", orderMapper.queryItemsByOrderId(order.getId()));
            resultRows.add(row);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", resultRows);
        result.put("total", total);
        result.put("page", currentPage);
        result.put("size", currentSize);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> shipSellerOrder(String token, Long orderId) {
        User user = getCurrentUser(token);
        if (!UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅商家可发货");
        }

        Order order = orderMapper.selectByIdForMerchant(orderId, user.getId());
        if (order == null) {
            throw new BusinessException(404, "订单不存在");
        }
        if (!OrderStatus.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())
                && !OrderStatus.PENDING_SHIPMENT.equalsIgnoreCase(order.getStatus())) {
            throw new BusinessException(400, "当前订单不能发货");
        }

        String targetStatus = OrderStatus.PENDING_SHIPMENT.equalsIgnoreCase(order.getStatus())
                ? OrderStatus.SHIPPED : OrderStatus.PENDING_SHIPMENT;
        if (OrderStatus.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            int pendingStatusAffected = orderMapper.updateOrderStatus(orderId, OrderStatus.PENDING_SHIPMENT);
            if (pendingStatusAffected <= 0) {
                throw new BusinessException(400, "订单状态更新失败");
            }
            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("status", OrderStatus.PENDING_SHIPMENT);
            result.put("message", "订单已确认支付，等待发货");
            return result;
        }

        int affected = orderMapper.updateOrderStatus(orderId, OrderStatus.SHIPPED);
        if (affected <= 0) {
            throw new BusinessException(400, "发货失败");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("status", targetStatus);
        result.put("message", "发货成功");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelExpiredOrders() {
        List<Order> expiredOrders = orderMapper.queryExpiredUnpaidOrders();
        for (Order order : expiredOrders) {
            if (!OrderStatus.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
                continue;
            }
            int affected = orderMapper.updateOrderStatus(order.getId(), OrderStatus.CANCELLED);
            if (affected <= 0) {
                continue;
            }
            for (OrderItem item : orderMapper.queryItemsByOrderId(order.getId())) {
                productMapper.increaseStock(item.getProductId(), item.getQuantity());
            }
        }
    }

    private User getCurrentUser(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new BusinessException(401, "请先登录");
        }
        String jwt = token.substring(7);
        String username = jwtUtil.getUsernameFromToken(jwt);
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        return user;
    }

    private Address resolveShippingAddress(User user, Long addressId) {
        List<Address> addresses = userMapper.queryAddressList(user.getId(), 0, 100);
        if (addresses == null || addresses.isEmpty()) {
            throw new BusinessException(400, "请先添加收货地址");
        }

        Address selected = null;
        if (addressId != null) {
            for (Address address : addresses) {
                if (addressId.equals(address.getId())) {
                    selected = address;
                    break;
                }
            }
        }
        if (selected == null) {
            for (Address address : addresses) {
                if (address.getIsDefault() != null && address.getIsDefault() == 1) {
                    selected = address;
                    break;
                }
            }
        }
        if (selected == null) {
            selected = addresses.get(0);
        }
        return selected;
    }

    private String generateOrderNo() {
        long ts = System.currentTimeMillis();
        int random = new Random().nextInt(900000) + 100000;
        return "SO" + ts + random;
    }
}
