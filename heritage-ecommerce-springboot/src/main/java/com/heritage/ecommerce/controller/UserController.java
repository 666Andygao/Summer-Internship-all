package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.AddressDTO;
import com.heritage.ecommerce.dto.UserUpdateDTO;
import com.heritage.ecommerce.entity.Address;
import com.heritage.ecommerce.service.UserService;
import com.heritage.ecommerce.vo.UserInfoVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/info")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<UserInfoVO> getUserInfo(@RequestHeader("Authorization") String token) {
        return Result.success(userService.getUserInfo(token));
    }

    @PutMapping("/info")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<UserInfoVO> updateUserInfo(@RequestHeader("Authorization") String token,
                                            @RequestBody UserUpdateDTO dto) {
        return Result.success(userService.updateUserInfo(token, dto));
    }

    @PostMapping("/avatar")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<String> uploadAvatar(@RequestHeader("Authorization") String token,
                                      @RequestParam("file") MultipartFile file) throws IOException {
        return Result.success(userService.uploadAvatar(token, file.getBytes(), file.getOriginalFilename()));
    }

    @GetMapping("/addresses")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<Map<String, Object>> getAddressList(@RequestHeader("Authorization") String token,
                                                    @RequestParam(defaultValue = "1") Integer page,
                                                    @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(userService.queryAddressList(token, page, size));
    }

    @PostMapping("/addresses")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<Address> addAddress(@RequestHeader("Authorization") String token,
                                     @Validated @RequestBody AddressDTO dto) {
        return Result.success(userService.addAddress(token, dto));
    }

    @PutMapping("/addresses/{id}")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<Address> updateAddress(@RequestHeader("Authorization") String token,
                                        @PathVariable Long id,
                                        @Validated @RequestBody AddressDTO dto) {
        return Result.success(userService.updateAddress(token, id, dto));
    }

    @DeleteMapping("/addresses/{id}")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<String> deleteAddress(@RequestHeader("Authorization") String token,
                                       @PathVariable Long id) {
        return Result.success(userService.deleteAddress(token, id));
    }

    @PutMapping("/addresses/{id}/default")
    @RequireRole({UserRole.BUYER, UserRole.ARTISAN})
    public Result<String> setDefaultAddress(@RequestHeader("Authorization") String token,
                                           @PathVariable Long id) {
        return Result.success(userService.setDefaultAddress(token, id));
    }
}
