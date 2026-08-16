package com.heritage.ecommerce.service;

import com.heritage.ecommerce.common.PageResult;
import com.heritage.ecommerce.dto.MerchantRevenueDTO;
import com.heritage.ecommerce.dto.MerchantSalesRankDTO;

public interface MerchantStatsService {

    PageResult<MerchantSalesRankDTO> listSalesRank(String token, Integer page, Integer size);

    MerchantRevenueDTO getRevenueSummary(String token);
}