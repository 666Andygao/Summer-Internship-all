package com.heritage.ecommerce.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class ThirdPartyProductInfo {
    private boolean success;
    private String sourcePlatform;
    private String rawUrl;
    private String sourceProductId;
    private String title;
    private BigDecimal price;
    private List<String> mainImages = new ArrayList<>();
    private String detailHtml;
    private Map<String, String> specs = new LinkedHashMap<>();
    private String errorCode;
    private String errorMessage;

    public static ThirdPartyProductInfo fail(String sourcePlatform, String rawUrl, String errorCode, String errorMessage) {
        ThirdPartyProductInfo info = new ThirdPartyProductInfo();
        info.setSuccess(false);
        info.setSourcePlatform(sourcePlatform);
        info.setRawUrl(rawUrl);
        info.setErrorCode(errorCode);
        info.setErrorMessage(errorMessage);
        return info;
    }
}
