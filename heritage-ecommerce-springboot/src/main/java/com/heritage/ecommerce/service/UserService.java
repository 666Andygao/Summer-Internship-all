package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.*;
import com.heritage.ecommerce.entity.Address;
import com.heritage.ecommerce.vo.UserInfoVO;

import java.util.Map;

public interface UserService {
    Map<String, Object> register(AuthRegisterDTO dto);
    Map<String, Object> login(AuthLoginDTO dto);
    String updatePassword(String token, PasswordUpdateDTO dto);
    Map<String, String> generateCaptcha();
    String verifyCaptcha(String key, String code);
    UserInfoVO getUserInfo(String token);
    UserInfoVO updateUserInfo(String token, UserUpdateDTO dto);
    String uploadAvatar(String token, byte[] fileBytes, String originalName);
    Map<String, Object> queryAddressList(String token, Integer page, Integer size);
    Address addAddress(String token, AddressDTO dto);
    Address updateAddress(String token, Long id, AddressDTO dto);
    String deleteAddress(String token, Long id);
    String setDefaultAddress(String token, Long id);
}
