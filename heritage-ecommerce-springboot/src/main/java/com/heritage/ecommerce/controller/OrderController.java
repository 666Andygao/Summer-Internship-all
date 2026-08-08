package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.OrderCreateDTO;
import com.heritage.ecommerce.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/order")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping("/checkout")
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> createOrder(@RequestHeader("Authorization") String token,
                                                  @Validated @RequestBody OrderCreateDTO dto) {
        return Result.success(orderService.createOrder(token, dto));
    }

    @GetMapping("/buyer")
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> listBuyerOrders(@RequestHeader("Authorization") String token,
                                                      @RequestParam(required = false) String status,
                                                      @RequestParam(defaultValue = "1") Integer page,
                                                      @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(orderService.listBuyerOrders(token, status, page, size));
    }

    @GetMapping("/buyer/{id}")
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> getBuyerOrderDetail(@RequestHeader("Authorization") String token,
                                                          @PathVariable Long id) {
        return Result.success(orderService.getBuyerOrderDetail(token, id));
    }

    @PutMapping("/buyer/{id}/cancel")
    @RequireRole({UserRole.BUYER})
    public Result<Map<String, Object>> cancelBuyerOrder(@RequestHeader("Authorization") String token,
                                                       @PathVariable Long id) {
        return Result.success(orderService.cancelBuyerOrder(token, id));
    }

    @GetMapping("/seller")
    @RequireRole({UserRole.ARTISAN})
    public Result<Map<String, Object>> listSellerOrders(@RequestHeader("Authorization") String token,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(defaultValue = "1") Integer page,
                                                       @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(orderService.listSellerOrders(token, status, page, size));
    }

    @PutMapping("/seller/{id}/ship")
    @RequireRole({UserRole.ARTISAN})
    public Result<Map<String, Object>> shipSellerOrder(@RequestHeader("Authorization") String token,
                                                      @PathVariable Long id) {
        return Result.success(orderService.shipSellerOrder(token, id));
    }
}
