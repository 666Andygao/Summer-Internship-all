package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.common.PageResult;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.MerchantRevenueDTO;
import com.heritage.ecommerce.dto.MerchantSalesRankDTO;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.MerchantStatsMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.MerchantStatsService;
import com.heritage.ecommerce.utils.JwtUtil;
import com.heritage.ecommerce.utils.StatPageUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MerchantStatsServiceImpl implements MerchantStatsService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private MerchantStatsMapper merchantStatsMapper;

    private Long assertMerchantAndGetId(String token) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        if (!UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅商家可查看数据统计");
        }
        return user.getId();
    }

    @Override
    public PageResult<MerchantSalesRankDTO> listSalesRank(String token, Integer page, Integer size) {
        Long merchantId = assertMerchantAndGetId(token);
        int currentPage = StatPageUtil.normalizePage(page);
        int currentSize = StatPageUtil.normalizeSize(size);
        int offset = StatPageUtil.toOffset(currentPage, currentSize);

        List<MerchantSalesRankDTO> rows = merchantStatsMapper.querySalesRankByMerchant(merchantId, offset, currentSize);
        Long total = merchantStatsMapper.countSalesRankByMerchant(merchantId);

        return StatPageUtil.build(rows, total, currentPage, currentSize);
    }

    @Override
    public MerchantRevenueDTO getRevenueSummary(String token) {
        Long merchantId = assertMerchantAndGetId(token);
        MerchantRevenueDTO summary = merchantStatsMapper.queryRevenueSummaryByMerchant(merchantId);
        if (summary == null) {
            summary = new MerchantRevenueDTO();
        }
        if (summary.getTodayOrderCount() == null) summary.setTodayOrderCount(0L);
        if (summary.getTotalOrderCount() == null) summary.setTotalOrderCount(0L);
        return summary;
    }
}