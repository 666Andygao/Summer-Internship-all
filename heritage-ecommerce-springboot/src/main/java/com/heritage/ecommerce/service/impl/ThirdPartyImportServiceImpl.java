package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.ThirdPartyImportRequestDTO;
import com.heritage.ecommerce.dto.ThirdPartyPreviewRequestDTO;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ThirdPartyCrawlLog;
import com.heritage.ecommerce.entity.ThirdPartyProductInfo;
import com.heritage.ecommerce.entity.ThirdPartyProductMapping;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.ProductMapper;
import com.heritage.ecommerce.mapper.ThirdPartyImportMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.ThirdPartyImportService;
import com.heritage.ecommerce.utils.JwtUtil;
import com.heritage.ecommerce.utils.ThirdPartyProductParserUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ThirdPartyImportServiceImpl implements ThirdPartyImportService {

    @Autowired
    private ThirdPartyProductParserUtil parserUtil;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ThirdPartyImportMapper thirdPartyImportMapper;

    @Override
    public Map<String, Object> preview(String token, ThirdPartyPreviewRequestDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);
        validatePreviewRequest(dto);

        ThirdPartyProductInfo info = parseUrl(dto);
        Map<String, Object> data = new HashMap<>();
        data.put("sourcePlatform", info.getSourcePlatform());
        data.put("sourceProductId", info.getSourceProductId());
        data.put("title", info.getTitle());
        data.put("price", info.getPrice());
        data.put("mainImages", info.getMainImages());
        data.put("detailHtml", info.getDetailHtml());
        data.put("specs", info.getSpecs());
        data.put("importable", info.isSuccess());
        data.put("errorCode", info.getErrorCode());
        data.put("errorMessage", info.getErrorMessage());
        return data;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Product importFromThirdParty(String token, ThirdPartyImportRequestDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        if (dto == null || !StringUtils.hasText(dto.getSourceUrl())) {
            throw new BusinessException(400, "第三方链接不能为空");
        }
        if (dto.getCategoryId() == null) {
            throw new BusinessException(400, "商品分类不能为空");
        }

        ThirdPartyProductInfo parsed = parseUrl(dto.getSourceUrl(), dto.getPlatform());
        if (!parsed.isSuccess()) {
            throw new BusinessException(422, parsed.getErrorMessage());
        }

        String filteredTitle = cleanAdAndPromotion(parsed.getTitle());
        if (!StringUtils.hasText(filteredTitle)) {
            throw new BusinessException(400, "抓取商品标题无效，已过滤广告外链内容");
        }

        String filteredImages = filterInvalidImages(parsed.getMainImages());
        String cleanedDescription = filterInvalidHtml(parsed.getDetailHtml());

        Product product = new Product();
        product.setMerchantId(user.getId());
        product.setMerchantUserId(user.getId());
        product.setTitle(StringUtils.hasText(dto.getTitle()) ? dto.getTitle() : filteredTitle);
        product.setSlug(product.getTitle());
        product.setSummary(filteredTitle);
        product.setDescription(StringUtils.hasText(dto.getDescription()) ? dto.getDescription() : cleanedDescription);
        product.setCoverImage(StringUtils.hasText(dto.getCoverImage()) ? dto.getCoverImage() : firstImage(filteredImages));
        product.setImages(StringUtils.hasText(dto.getImages()) ? dto.getImages() : filteredImages);
        product.setCategoryId(dto.getCategoryId());
        product.setPrice(dto.getPrice() == null ? parsed.getPrice() : dto.getPrice());
        product.setStock(dto.getStock() == null ? 1 : dto.getStock());
        product.setStatus(dto.getStatus() == null ? "draft" : dto.getStatus());
        product.setSalesCount(0);
        product.setIsDeleted(0);
        product.setCreatedAt(new Date());
        product.setUpdatedAt(new Date());

        productMapper.insertProduct(product);

        ThirdPartyProductMapping mapping = new ThirdPartyProductMapping();
        mapping.setLocalProductId(product.getId());
        mapping.setSourceName(parsed.getSourcePlatform());
        mapping.setSourceProductId(parsed.getSourceProductId());
        mapping.setSourceUrl(dto.getSourceUrl());
        mapping.setMappingStatus("active");
        mapping.setSyncFields("{}");
        mapping.setCreatedAt(new Date());
        mapping.setUpdatedAt(new Date());
        thirdPartyImportMapper.insertProductMapping(mapping);

        ThirdPartyCrawlLog log = new ThirdPartyCrawlLog();
        log.setMerchantUserId(user.getId());
        log.setSourceName(parsed.getSourcePlatform());
        log.setSourceUrl(dto.getSourceUrl());
        log.setSourceProductId(parsed.getSourceProductId());
        log.setTaskName("import-from-third-party");
        log.setStatus("success");
        log.setRequestUrl(dto.getSourceUrl());
        log.setResponseCode(200);
        log.setResponseBody("{} ");
        log.setErrorMessage(null);
        log.setCostMs(1500);
        log.setCreatedAt(new Date());
        log.setUpdatedAt(new Date());
        thirdPartyImportMapper.insertCrawlLog(log);

        return product;
    }

    @Override
    public Map<String, Object> listCrawlLogs(String token, String status, Integer page, Integer size) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Integer currentPage = page == null || page < 1 ? 1 : page;
        Integer currentSize = size == null || size < 1 ? 10 : size;
        Integer offset = (currentPage - 1) * currentSize;

        List<ThirdPartyCrawlLog> rows = thirdPartyImportMapper.queryCrawlLogsByMerchant(user.getId(), status, offset, currentSize);
        Long total = thirdPartyImportMapper.countCrawlLogsByMerchant(user.getId(), status);

        Map<String, Object> data = new HashMap<>();
        data.put("rows", rows);
        data.put("total", total);
        data.put("page", currentPage);
        data.put("size", currentSize);
        return data;
    }

    @Override
    public String deleteCrawlLog(String token, Long id) {
        User user = getCurrentUser(token);
        assertMerchant(user);
        int affected = thirdPartyImportMapper.deleteCrawlLog(id, user.getId());
        if (affected <= 0) {
            throw new BusinessException(404, "抓取日志不存在或无权限删除");
        }
        return "抓取日志删除成功";
    }

    private User getCurrentUser(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new BusinessException(401, "请先登录");
        }
        String jwt = token.substring(7);
        String username = jwtUtil.getUsernameFromToken(jwt);
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        return user;
    }

    private void assertMerchant(User user) {
        if (!UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅非遗商家账号可访问第三方导入功能");
        }
    }

    private void validatePreviewRequest(ThirdPartyPreviewRequestDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.getSourceUrl())) {
            throw new BusinessException(400, "商品链接不能为空");
        }
        if (!StringUtils.hasText(dto.getPlatform())) {
            dto.setPlatform(detectPlatform(dto.getSourceUrl()));
        }
    }

    private ThirdPartyProductInfo parseUrl(ThirdPartyPreviewRequestDTO dto) {
        if ("jd".equalsIgnoreCase(dto.getPlatform())) {
            return parserUtil.parseJdUrl(dto.getSourceUrl());
        }
        if ("tb".equalsIgnoreCase(dto.getPlatform()) || "taobao".equalsIgnoreCase(dto.getPlatform()) || "tmall".equalsIgnoreCase(dto.getPlatform())) {
            return parserUtil.parseTbUrl(dto.getSourceUrl());
        }
        return parserUtil.parseTbUrl(dto.getSourceUrl());
    }

    private ThirdPartyProductInfo parseUrl(String sourceUrl, String platform) {
        if ("jd".equalsIgnoreCase(platform)) {
            return parserUtil.parseJdUrl(sourceUrl);
        }
        return parserUtil.parseTbUrl(sourceUrl);
    }

    private String detectPlatform(String url) {
        if (url.contains("jd.")) {
            return "jd";
        }
        return "tb";
    }

    private String cleanAdAndPromotion(String source) {
        if (!StringUtils.hasText(source)) {
            return "";
        }
        String value = source.replaceAll("(?i)(广告|推广|点击查看|扫码购买|复制链接|领券|优惠|专享|直达链接)", "");
        value = value.replaceAll("\\s+", " ").trim();
        return value;
    }

    private String filterInvalidImages(List<String> images) {
        List<String> valid = new ArrayList<>();
        if (images == null) {
            return "";
        }
        for (String image : images) {
            if (!StringUtils.hasText(image)) {
                continue;
            }
            String cleaned = image.trim();
            if (cleaned.contains("ad") || cleaned.contains("ads") || cleaned.contains("promotion") || cleaned.contains("coupon") || cleaned.endsWith(".gif")) {
                continue;
            }
            valid.add(cleaned);
        }
        return String.join(",", valid);
    }

    private String filterInvalidHtml(String html) {
        if (!StringUtils.hasText(html)) {
            return "";
        }
        String value = html.replaceAll("(?i)<(script|iframe|object|embed|style)[^>]*>.*?</\\1>", "");
        value = value.replaceAll("(?i)(https?:\\/\\/|www\\.)?(ad|ads|promotion|coupon|click)\\S*", "");
        return value;
    }

    private String firstImage(String images) {
        if (!StringUtils.hasText(images)) {
            return "";
        }
        String[] arr = images.split(",");
        for (String s : arr) {
            if (StringUtils.hasText(s)) {
                return s.trim();
            }
        }
        return "";
    }
}
