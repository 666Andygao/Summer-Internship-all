package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.FavoriteAddDTO;
import com.heritage.ecommerce.entity.FavoriteProduct;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.FavoriteMapper;
import com.heritage.ecommerce.mapper.ProductMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.FavoriteService;
import com.heritage.ecommerce.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FavoriteServiceImpl implements FavoriteService {

    @Autowired
    private FavoriteMapper favoriteMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public String addFavorite(String token, FavoriteAddDTO dto) {
        User user = getCurrentUser(token);
        if (!UserRole.BUYER.equalsIgnoreCase(user.getRole()) && !UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "当前用户不可收藏商品");
        }

        Product product = productMapper.selectProductById(dto.getProductId());
        if (product == null || product.getIsDeleted() != null && product.getIsDeleted() == 1) {
            throw new BusinessException(404, "商品不存在");
        }

        FavoriteProduct exists = favoriteMapper.selectByUserAndProduct(user.getId(), dto.getProductId());
        if (exists != null) {
            return "已收藏";
        }

        FavoriteProduct favorite = new FavoriteProduct();
        favorite.setUserId(user.getId());
        favorite.setProductId(dto.getProductId());
        favorite.setCreatedAt(new Date());
        favoriteMapper.insertFavorite(favorite);
        return "收藏成功";
    }

    @Override
    public String cancelFavorite(String token, Long productId) {
        User user = getCurrentUser(token);
        int affected = favoriteMapper.deleteFavorite(user.getId(), productId);
        if (affected <= 0) {
            throw new BusinessException(404, "收藏记录不存在");
        }
        return "取消收藏成功";
    }

    @Override
    public Map<String, Object> listFavorites(String token, Integer page, Integer size) {
        User user = getCurrentUser(token);
        Integer currentPage = page == null || page < 1 ? 1 : page;
        Integer currentSize = size == null || size < 1 ? 10 : size;
        Integer offset = (currentPage - 1) * currentSize;

        List<Product> rows = favoriteMapper.queryFavoriteProducts(user.getId(), offset, currentSize);
        Long total = favoriteMapper.countFavoriteProducts(user.getId());

        Map<String, Object> data = new HashMap<>();
        data.put("rows", rows);
        data.put("total", total);
        data.put("page", currentPage);
        data.put("size", currentSize);
        return data;
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
