package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.*;
import com.heritage.ecommerce.entity.Address;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.UserService;
import com.heritage.ecommerce.utils.CaptchaUtil;
import com.heritage.ecommerce.utils.JwtUtil;
import com.heritage.ecommerce.vo.UserInfoVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CaptchaUtil captchaUtil;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public Map<String, Object> register(AuthRegisterDTO dto) {
        if (userMapper.selectByUsername(dto.getUsername()) != null) {
            throw new BusinessException(400, "用户名已存在");
        }
        if (dto.getCaptchaKey() == null || dto.getCaptchaCode() == null || !captchaUtil.validate(dto.getCaptchaKey(), dto.getCaptchaCode())) {
            throw new BusinessException(400, "图片验证码不正确");
        }

        String role = dto.getRole() == null ? UserRole.BUYER : dto.getRole();
        if (!UserRole.BUYER.equalsIgnoreCase(role) && !UserRole.ARTISAN.equalsIgnoreCase(role)) {
            throw new BusinessException(400, "角色仅支持 buyer 或 artisan");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole(role);
        user.setDisplayName(dto.getDisplayName() == null ? dto.getUsername() : dto.getDisplayName());
        user.setPhone(dto.getPhone());
        user.setStatus("active");
        user.setCreatedAt(new Date());
        user.setUpdatedAt(new Date());

        userMapper.insert(user);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("role", user.getRole());
        data.put("token", jwtUtil.generateToken(user.getUsername(), user.getRole()));
        return data;
    }

    @Override
    public Map<String, Object> login(AuthLoginDTO dto) {
        User user = userMapper.selectByUsername(dto.getUsername());
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        if (dto.getCaptchaKey() != null && dto.getCaptchaCode() != null && !captchaUtil.validate(dto.getCaptchaKey(), dto.getCaptchaCode())) {
            throw new BusinessException(400, "图片验证码不正确");
        }
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException(400, "用户名或密码错误");
        }

        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("role", user.getRole());
        data.put("token", jwtUtil.generateToken(user.getUsername(), user.getRole()));
        return data;
    }

    @Override
    public String updatePassword(String token, PasswordUpdateDTO dto) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BusinessException(400, "旧密码不正确");
        }
        userMapper.updatePassword(user.getId(), passwordEncoder.encode(dto.getNewPassword()));
        return "密码修改成功";
    }

    @Override
    public Map<String, String> generateCaptcha() {
        return captchaUtil.createCaptcha();
    }

    @Override
    public String verifyCaptcha(String key, String code) {
        boolean ok = captchaUtil.validate(key, code);
        if (!ok) {
            throw new BusinessException(400, "验证码校验失败");
        }
        return "验证码校验成功";
    }

    @Override
    public UserInfoVO getUserInfo(String token) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        UserInfoVO vo = new UserInfoVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setDisplayName(user.getDisplayName());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatar());
        vo.setRole(user.getRole());
        vo.setStatus(user.getStatus());
        return vo;
    }

    @Override
    public UserInfoVO updateUserInfo(String token, UserUpdateDTO dto) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        if (dto.getDisplayName() != null) user.setDisplayName(dto.getDisplayName());
        if (dto.getPhone() != null) user.setPhone(dto.getPhone());
        if (dto.getAvatar() != null) user.setAvatar(dto.getAvatar());
        user.setUpdatedAt(new Date());
        userMapper.updateUserInfo(user);

        UserInfoVO vo = new UserInfoVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setDisplayName(user.getDisplayName());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatar());
        vo.setRole(user.getRole());
        vo.setStatus(user.getStatus());
        return vo;
    }

    @Override
    public String uploadAvatar(String token, byte[] fileBytes, String originalName) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        if (fileBytes == null || fileBytes.length == 0) {
            throw new BusinessException(400, "文件不能为空");
        }

        String dir = "D:/heritage-ecommerce/uploads/images";
        File folder = new File(dir);
        if (!folder.exists()) folder.mkdirs();

        String fileName = System.currentTimeMillis() + "_" + originalName;
        File targetFile = new File(folder, fileName);
        try {
            org.apache.commons.io.FileUtils.writeByteArrayToFile(targetFile, fileBytes);
        } catch (IOException e) {
            throw new BusinessException(500, "头像保存失败");
        }

        String imageUrl = "/uploads/images/" + fileName;
        userMapper.updateUserAvatar(user.getId(), imageUrl);
        return imageUrl;
    }

    @Override
    public Map<String, Object> queryAddressList(String token, Integer page, Integer size) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        List<Address> list = userMapper.queryAddressList(user.getId(), page, size);
        Long total = userMapper.countAddress(user.getId());
        Map<String, Object> data = new HashMap<>();
        data.put("rows", list);
        data.put("total", total);
        data.put("page", page == null ? 1 : page);
        data.put("size", size == null ? 10 : size);
        return data;
    }

    @Override
    public Address addAddress(String token, AddressDTO dto) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        Address address = new Address();
        address.setUserId(user.getId());
        address.setRecipientName(dto.getRecipientName());
        address.setPhone(dto.getPhone());
        address.setProvince(dto.getProvince());
        address.setCity(dto.getCity());
        address.setDistrict(dto.getDistrict());
        address.setDetail(dto.getDetail());
        address.setIsDefault(dto.getIsDefault() == null ? 0 : dto.getIsDefault());

        if (address.getIsDefault() == 1) {
            userMapper.clearDefaultAddress(user.getId());
        }

        userMapper.insertAddress(address);
        return address;
    }

    @Override
    public Address updateAddress(String token, Long id, AddressDTO dto) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        Address existing = userMapper.selectAddressById(id, user.getId());
        if (existing == null) {
            throw new BusinessException(404, "收货地址不存在");
        }

        existing.setRecipientName(dto.getRecipientName());
        existing.setPhone(dto.getPhone());
        existing.setProvince(dto.getProvince());
        existing.setCity(dto.getCity());
        existing.setDistrict(dto.getDistrict());
        existing.setDetail(dto.getDetail());
        if (dto.getIsDefault() != null && dto.getIsDefault() == 1) {
            userMapper.clearDefaultAddress(user.getId());
            existing.setIsDefault(1);
        }

        userMapper.updateAddress(existing);
        return existing;
    }

    @Override
    public String deleteAddress(String token, Long id) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        int effect = userMapper.deleteAddress(id, user.getId());
        if (effect <= 0) {
            throw new BusinessException(404, "收货地址不存在");
        }
        return "删除成功";
    }

    @Override
    public String setDefaultAddress(String token, Long id) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        Address address = userMapper.selectAddressById(id, user.getId());
        if (address == null) {
            throw new BusinessException(404, "收货地址不存在");
        }

        userMapper.clearDefaultAddress(user.getId());
        userMapper.updateDefaultAddress(user.getId(), id);
        return "已设置为默认地址";
    }
}
