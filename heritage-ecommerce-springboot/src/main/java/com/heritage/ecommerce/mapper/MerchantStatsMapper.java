package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.dto.MerchantRevenueDTO;
import com.heritage.ecommerce.dto.MerchantSalesRankDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MerchantStatsMapper {

    List<MerchantSalesRankDTO> querySalesRankByMerchant(@Param("merchantId") Long merchantId,
                                                       @Param("offset") Integer offset,
                                                       @Param("size") Integer size);

    Long countSalesRankByMerchant(@Param("merchantId") Long merchantId);

    MerchantRevenueDTO queryRevenueSummaryByMerchant(@Param("merchantId") Long merchantId);
}