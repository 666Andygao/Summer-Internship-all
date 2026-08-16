package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestParam String username,
                                            @RequestParam String password) {
        Map<String, Object> data = new HashMap<>();
        data.put("username", username);
        data.put("role", "buyer");
        data.put("token", jwtUtil.generateToken(username, "buyer"));
        return Result.success(data);
    }

    @GetMapping("/info")
    public Result<Map<String, Object>> info(@RequestHeader(value = "Authorization", required = false) String token) {
        Map<String, Object> data = new HashMap<>();
        data.put("username", "demo-user");
        data.put("role", "buyer");
        data.put("token", token);
        return Result.success(data);
    }
}
