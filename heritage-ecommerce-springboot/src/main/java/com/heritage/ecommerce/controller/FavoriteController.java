package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.FavoriteAddDTO;
import com.heritage.ecommerce.service.FavoriteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/favorite")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService;

    @PostMapping
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<String> addFavorite(@RequestHeader("Authorization") String token,
                                     @Validated @RequestBody FavoriteAddDTO dto) {
        return Result.success(favoriteService.addFavorite(token, dto));
    }

    @DeleteMapping("/{productId}")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<String> cancelFavorite(@RequestHeader("Authorization") String token,
                                        @PathVariable Long productId) {
        return Result.success(favoriteService.cancelFavorite(token, productId));
    }

    @GetMapping
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<Map<String, Object>> listFavorites(@RequestHeader("Authorization") String token,
                                                    @RequestParam(defaultValue = "1") Integer page,
                                                    @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(favoriteService.listFavorites(token, page, size));
    }
}
