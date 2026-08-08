package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.CartAddDTO;
import com.heritage.ecommerce.dto.CartBatchSelectDTO;
import com.heritage.ecommerce.dto.CartUpdateDTO;
import com.heritage.ecommerce.entity.CartItem;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.CartMapper;
import com.heritage.ecommerce.mapper.ProductMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.CartService;
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

@Service
public class CartServiceImpl implements CartService {

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public CartItem addToCart(String token, CartAddDTO dto) {
        User user = getCurrentUser(token);
        if (!UserRole.BUYER.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅买家可操作购物车");
        }

        Product product = productMapper.selectProductById(dto.getProductId());
        if (product == null || product.getIsDeleted() != null && product.getIsDeleted() == 1) {
            throw new BusinessException(404, "商品不存在");
        }

        if ("leadout".equalsIgnoreCase(product.getProductType())) {
            throw new BusinessException(400, "导流商品不能加入购物车");
        }

        CartItem existing = cartMapper.selectByUserAndProduct(user.getId(), dto.getProductId());
        if (existing != null) {
            int newQty = existing.getQuantity() + dto.getQuantity();
            cartMapper.updateCartItemQuantity(existing.getId(), newQty);
            existing.setQuantity(newQty);
            return existing;
        }

        CartItem item = new CartItem();
        item.setUserId(user.getId());
        item.setProductId(dto.getProductId());
        item.setQuantity(dto.getQuantity());
        item.setSelected(1);
        item.setCreatedAt(new Date());
        item.setUpdatedAt(new Date());
        cartMapper.insertCartItem(item);
        return item;
    }

    @Override
    public CartItem updateCartQuantity(String token, Long id, CartUpdateDTO dto) {
        User user = getCurrentUser(token);
        CartItem item = cartMapper.selectById(id, user.getId());
        if (item == null) {
            throw new BusinessException(404, "购物车商品不存在");
        }

        Product product = productMapper.selectProductById(item.getProductId());
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if ("leadout".equalsIgnoreCase(product.getProductType())) {
            throw new BusinessException(400, "导流商品不能加入购物车");
        }

        cartMapper.updateCartItem(id, dto.getQuantity(), item.getSelected());
        item.setQuantity(dto.getQuantity());
        return item;
    }

    @Override
    public String deleteCartItem(String token, Long id) {
        User user = getCurrentUser(token);
        int affected = cartMapper.deleteCartItem(id, user.getId());
        if (affected <= 0) {
            throw new BusinessException(404, "购物车商品不存在");
        }
        return "删除成功";
    }

    @Override
    public String batchSelectCartItems(String token, CartBatchSelectDTO dto) {
        User user = getCurrentUser(token);
        if (dto == null || dto.getItemIds() == null || dto.getItemIds().isEmpty()) {
            throw new BusinessException(400, "请选择商品");
        }
        int selected = dto.getSelected() != null && dto.getSelected() ? 1 : 0;
        cartMapper.batchUpdateSelection(user.getId(), dto.getItemIds(), selected);
        return "更新成功";
    }

    @Override
    public Map<String, Object> listCart(String token) {
        User user = getCurrentUser(token);
        List<CartItem> items = cartMapper.queryCartItemsByUser(user.getId());
        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem item : items) {
            Product product = productMapper.selectProductById(item.getProductId());
            if (product == null) continue;
            Map<String, Object> map = new HashMap<>();
            map.put("id", item.getId());
            map.put("productId", item.getProductId());
            map.put("title", product.getTitle());
            map.put("coverImage", product.getCoverImage());
            map.put("price", product.getPrice());
            map.put("quantity", item.getQuantity());
            map.put("selected", item.getSelected());
            map.put("productType", product.getProductType());
            map.put("subtotal", product.getPrice() == null ? BigDecimal.ZERO : product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            rows.add(map);
            if (item.getSelected() == 1) {
                total = total.add(product.getPrice() == null ? BigDecimal.ZERO : product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("rows", rows);
        data.put("selectedTotal", total);
        data.put("selectedCount", rows.stream().filter(r -> Integer.valueOf(1).equals(r.get("selected"))).count());
        return data;
    }

    @Override
    public Map<String, Object> calcSelectedTotal(String token) {
        return listCart(token);
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
}
