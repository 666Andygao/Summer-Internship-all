package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.ThirdPartyImportRequestDTO;
import com.heritage.ecommerce.dto.ThirdPartyPreviewRequestDTO;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.service.ThirdPartyImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/third-party")
public class ThirdPartyImportController {

    @Autowired
    private ThirdPartyImportService thirdPartyImportService;

    @PostMapping("/preview")
    @RequireRole({UserRole.ARTISAN})
    public Result<Map<String, Object>> preview(@RequestHeader("Authorization") String token,
                                              @Validated @RequestBody ThirdPartyPreviewRequestDTO dto) {
        return Result.success(thirdPartyImportService.preview(token, dto));
    }

    @PostMapping("/import")
    @RequireRole({UserRole.ARTISAN})
    public Result<Product> importFromThirdParty(@RequestHeader("Authorization") String token,
                                               @Validated @RequestBody ThirdPartyImportRequestDTO dto) {
        return Result.success(thirdPartyImportService.importFromThirdParty(token, dto));
    }

    @GetMapping("/logs")
    @RequireRole({UserRole.ARTISAN})
    public Result<Map<String, Object>> listLogs(@RequestHeader("Authorization") String token,
                                               @RequestParam(required = false) String status,
                                               @RequestParam(defaultValue = "1") Integer page,
                                               @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(thirdPartyImportService.listCrawlLogs(token, status, page, size));
    }

    @DeleteMapping("/logs/{id}")
    @RequireRole({UserRole.ARTISAN})
    public Result<String> deleteLog(@RequestHeader("Authorization") String token,
                                   @PathVariable Long id) {
        return Result.success(thirdPartyImportService.deleteCrawlLog(token, id));
    }
}
