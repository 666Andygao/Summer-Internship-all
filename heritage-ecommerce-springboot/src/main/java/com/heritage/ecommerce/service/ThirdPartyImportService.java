package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.ThirdPartyImportRequestDTO;
import com.heritage.ecommerce.dto.ThirdPartyPreviewRequestDTO;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ThirdPartyCrawlLog;

import java.util.Map;

public interface ThirdPartyImportService {
    Map<String, Object> preview(String token, ThirdPartyPreviewRequestDTO dto);
    Product importFromThirdParty(String token, ThirdPartyImportRequestDTO dto);
    Map<String, Object> listCrawlLogs(String token, String status, Integer page, Integer size);
    String deleteCrawlLog(String token, Long id);
}
