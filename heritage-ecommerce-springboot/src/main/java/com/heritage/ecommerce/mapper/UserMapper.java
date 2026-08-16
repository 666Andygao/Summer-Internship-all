package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.Address;
import com.heritage.ecommerce.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {
    int insert(User user);
    User selectByUsername(@Param("username") String username);
    User selectById(@Param("id") Long id);
    int updatePassword(@Param("id") Long id, @Param("password") String password);
    int updateUserInfo(User user);
    int insertAddress(Address address);
    int updateAddress(Address address);
    int deleteAddress(@Param("id") Long id, @Param("userId") Long userId);
    List<Address> queryAddressList(@Param("userId") Long userId,
                                  @Param("page") Integer page,
                                  @Param("size") Integer size);
    Long countAddress(@Param("userId") Long userId);
    Address selectAddressById(@Param("id") Long id, @Param("userId") Long userId);
    int updateDefaultAddress(@Param("userId") Long userId, @Param("id") Long id);
    int clearDefaultAddress(@Param("userId") Long userId);
    int updateUserAvatar(@Param("id") Long id, @Param("avatar") String avatar);
}
