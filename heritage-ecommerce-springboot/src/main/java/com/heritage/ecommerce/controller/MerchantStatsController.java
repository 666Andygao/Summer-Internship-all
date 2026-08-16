package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.PageResult;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.MerchantRevenueDTO;
import com.heritage.ecommerce.dto.MerchantSalesRankDTO;
import com.heritage.ecommerce.service.MerchantStatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/merchant/stats")
public class MerchantStatsController {

    @Autowired
    private MerchantStatsService merchantStatsService;

    @GetMapping("/sales-rank")
    @RequireRole({UserRole.ARTISAN})
    public Result<PageResult<MerchantSalesRankDTO>> listSalesRank(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(merchantStatsService.listSalesRank(token, page, size));
    }

    @GetMapping("/revenue")
    @RequireRole({UserRole.ARTISAN})
    public Result<MerchantRevenueDTO> getRevenueSummary(
            @RequestHeader("Authorization") String token) {
        return Result.success(merchantStatsService.getRevenueSummary(token));
    }
}