package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.entity.ThirdPartyProductInfo;
import com.heritage.ecommerce.utils.ThirdPartyProductParserUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/third-party")
public class ThirdPartyProductParseController {

    @Autowired
    private ThirdPartyProductParserUtil thirdPartyProductParserUtil;

    @RequireRole(UserRole.ARTISAN)
    @PostMapping("/parse/jd")
    public Result<ThirdPartyProductInfo> parseJdUrl(@RequestParam String url) {
        return Result.success(thirdPartyProductParserUtil.parseJdUrl(url));
    }

    @RequireRole(UserRole.ARTISAN)
    @PostMapping("/parse/tb")
    public Result<ThirdPartyProductInfo> parseTbUrl(@RequestParam String url) {
        return Result.success(thirdPartyProductParserUtil.parseTbUrl(url));
    }
}
