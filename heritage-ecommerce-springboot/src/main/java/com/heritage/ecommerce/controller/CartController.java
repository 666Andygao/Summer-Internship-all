package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.CartAddDTO;
import com.heritage.ecommerce.dto.CartBatchSelectDTO;
import com.heritage.ecommerce.dto.CartUpdateDTO;
import com.heritage.ecommerce.entity.CartItem;
import com.heritage.ecommerce.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @PostMapping
    @RequireRole({UserRole.BUYER})
    public Result<CartItem> addToCart(@RequestHeader("Authorization") String token,
                                     @Validated @RequestBody CartAddDTO dto) {
        return Result.success(cartService.addToCart(token, dto));
    }

    @PutMapping("/{id}")
    @RequireRole({UserRole.BUYER})
    public Result<CartItem> updateCartQuantity(@RequestHeader("Authorization") String token,
                                              @PathVariable Long id,
                                              @Validated @RequestBody CartUpdateDTO dto) {
        return Result.success(cartService.updateCartQuantity(token, id, dto));
    }

    @DeleteMapping("/{id}")
    @RequireRole({UserRole.BUYER})
    public Result<String> deleteCartItem(@RequestHeader("Authorization") String token,
                                        @PathVariable Long id) {
        return Result.success(cartService.deleteCartItem(token, id));
    }

    @PostMapping("/select")
    @RequireRole({UserRole.BUYER})
    public Result<String> batchSelectCartItems(@RequestHeader("Authorization") String token,
                                              @Validated @RequestBody CartBatchSelectDTO dto) {
        return Result.success(cartService.batchSelectCartItems(token, dto));
    }

    @GetMapping
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> listCart(@RequestHeader("Authorization") String token) {
        return Result.success(cartService.listCart(token));
    }

    @GetMapping("/selected-total")
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> calcSelectedTotal(@RequestHeader("Authorization") String token) {
        return Result.success(cartService.calcSelectedTotal(token));
    }
}
