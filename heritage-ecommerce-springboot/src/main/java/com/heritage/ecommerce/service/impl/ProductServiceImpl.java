package com.heritage.ecommerce.service.impl;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.*;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ProductCategory;
import com.heritage.ecommerce.entity.ProductMedia;
import com.heritage.ecommerce.entity.User;
import com.heritage.ecommerce.exception.BusinessException;
import com.heritage.ecommerce.mapper.ProductMapper;
import com.heritage.ecommerce.mapper.UserMapper;
import com.heritage.ecommerce.service.ProductService;
import com.heritage.ecommerce.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private User getCurrentUser(String token) {
        String username = jwtUtil.getUsernameFromToken(token.replace("Bearer ", ""));
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }
        return user;
    }

    private void assertMerchant(User user) {
        if (!UserRole.ARTISAN.equalsIgnoreCase(user.getRole())) {
            throw new BusinessException(403, "仅商家角色可操作商品");
        }
    }

    @Override
    public List<ProductCategory> listCategory(String token, Long parentId, String keyword) {
        User user = getCurrentUser(token);
        assertMerchant(user);
        return productMapper.queryCategoryList(parentId, user.getId(), keyword);
    }

    @Override
    public ProductCategory addCategory(String token, ProductCategoryDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        ProductCategory category = new ProductCategory();
        category.setParentId(dto.getParentId());
        category.setName(dto.getName());
        category.setLevel(dto.getLevel() == null ? 1 : dto.getLevel());
        category.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        category.setIsDeleted(0);
        category.setCreatedAt(new Date());
        productMapper.insertCategory(category);
        return category;
    }

    @Override
    public ProductCategory updateCategory(String token, Long id, ProductCategoryDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        ProductCategory existing = productMapper.selectCategoryById(id);
        if (existing == null) {
            throw new BusinessException(404, "分类不存在");
        }

        if (dto.getName() != null) existing.setName(dto.getName());
        if (dto.getParentId() != null) existing.setParentId(dto.getParentId());
        if (dto.getSortOrder() != null) existing.setSortOrder(dto.getSortOrder());
        if (dto.getLevel() != null) existing.setLevel(dto.getLevel());

        productMapper.updateCategory(existing);
        return existing;
    }

    @Override
    public String deleteCategory(String token, Long id) {
        User user = getCurrentUser(token);
        assertMerchant(user);
        productMapper.deleteCategory(id, user.getId());
        return "分类删除成功";
    }

    @Override
    public Product addProduct(String token, ProductCreateDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Product product = new Product();
        product.setMerchantId(user.getId());
        product.setMerchantUserId(user.getId());
        product.setTitle(dto.getTitle());
        product.setSlug(dto.getSlug() == null ? dto.getTitle() : dto.getSlug());
        product.setSummary(dto.getSummary());
        product.setDescription(dto.getDescription());
        product.setCoverImage(dto.getCoverImage());
        product.setImages(dto.getImages());
        product.setVideoUrl(dto.getVideoUrl());
        product.setCategoryId(dto.getCategoryId());
        product.setTags(dto.getTags());
        product.setPrice(dto.getPrice() == null ? BigDecimal.ZERO : dto.getPrice());
        product.setStock(dto.getStock() == null ? 0 : dto.getStock());
        product.setStatus(dto.getStatus() == null ? "draft" : dto.getStatus());
        product.setProductType(normalizeProductType(dto.getProductType()));
        product.setTargetPlatform(normalizePlatform(dto.getTargetPlatform(), dto.getProductType()));
        product.setSourceProductId(dto.getSourceProductId());
        product.setPurchaseUrl(dto.getPurchaseUrl());
        product.setSalesCount(0);
        product.setIsDeleted(0);
        product.setCreatedAt(new Date());
        product.setUpdatedAt(new Date());

        productMapper.insertProduct(product);
        return product;
    }

    @Override
    public Product updateProduct(String token, Long id, ProductUpdateDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Product product = productMapper.selectProductById(id);
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if (!product.getMerchantUserId().equals(user.getId())) {
            throw new BusinessException(403, "不能操作其他商家的商品");
        }

        if (dto.getTitle() != null) product.setTitle(dto.getTitle());
        if (dto.getSummary() != null) product.setSummary(dto.getSummary());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getCoverImage() != null) product.setCoverImage(dto.getCoverImage());
        if (dto.getImages() != null) product.setImages(dto.getImages());
        if (dto.getVideoUrl() != null) product.setVideoUrl(dto.getVideoUrl());
        if (dto.getCategoryId() != null) product.setCategoryId(dto.getCategoryId());
        if (dto.getTags() != null) product.setTags(dto.getTags());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getStock() != null) product.setStock(dto.getStock());
        if (dto.getStatus() != null) product.setStatus(dto.getStatus());
        if (dto.getProductType() != null) product.setProductType(normalizeProductType(dto.getProductType()));
        if (dto.getTargetPlatform() != null) product.setTargetPlatform(normalizePlatform(dto.getTargetPlatform(), dto.getProductType()));
        if (dto.getSourceProductId() != null) product.setSourceProductId(dto.getSourceProductId());
        if (dto.getPurchaseUrl() != null) product.setPurchaseUrl(dto.getPurchaseUrl());
        product.setUpdatedAt(new Date());

        productMapper.updateProduct(product);
        return product;
    }

    @Override
    public String updateProductStatus(String token, Long id, String status) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Product product = productMapper.selectProductById(id);
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if (!product.getMerchantUserId().equals(user.getId())) {
            throw new BusinessException(403, "不能操作其他商家的商品");
        }

        if (status == null || ("draft".equals(status) == false && "published".equals(status) == false && "offline".equals(status) == false)) {
            throw new BusinessException(400, "状态值非法，支持 draft/published/offline");
        }

        productMapper.updateProductStatus(id, status, user.getId());
        return "商品状态更新成功";
    }

    @Override
    public String updateProductStock(String token, Long id, ProductStockDTO dto) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Product product = productMapper.selectProductById(id);
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if (!product.getMerchantUserId().equals(user.getId())) {
            throw new BusinessException(403, "不能操作其他商家的商品");
        }

        productMapper.updateProductStock(id, dto.getStock(), user.getId());
        return "库存更新成功";
    }

    @Override
    public Map<String, Object> listMerchantProducts(String token, String keyword, String status, Integer page, Integer size) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Integer currentPage = page == null || page < 1 ? 1 : page;
        Integer currentSize = size == null || size < 1 ? 10 : size;

        List<Product> list = productMapper.queryProductListByMerchant(user.getId(), keyword, status, currentPage, currentSize);
        Long total = productMapper.countProductListByMerchant(user.getId(), keyword, status);

        Map<String, Object> data = new HashMap<>();
        data.put("rows", list);
        data.put("total", total);
        data.put("page", currentPage);
        data.put("size", currentSize);
        return data;
    }

    @Override
    public Map<String, Object> listProducts(ProductQueryDTO dto) {
        if (dto == null) dto = new ProductQueryDTO();
        Integer page = dto.getPage() == null || dto.getPage() < 1 ? 1 : dto.getPage();
        Integer size = dto.getSize() == null || dto.getSize() < 1 ? 10 : dto.getSize();

        List<Product> list = productMapper.queryProducts(
                dto.getKeyword(),
                dto.getCategoryId(),
                dto.getMinPrice(),
                dto.getMaxPrice(),
                dto.getTag(),
                dto.getStatus() == null ? "published" : dto.getStatus(),
                dto.getProductType(),
                page,
                size,
                dto.getSort() == null ? "created_at desc" : dto.getSort()
        );

        Long total = productMapper.countProducts(
                dto.getKeyword(),
                dto.getCategoryId(),
                dto.getMinPrice(),
                dto.getMaxPrice(),
                dto.getTag(),
                dto.getStatus() == null ? "published" : dto.getStatus(),
                dto.getProductType()
        );

        Map<String, Object> data = new HashMap<>();
        data.put("rows", list);
        data.put("total", total);
        data.put("page", page);
        data.put("size", size);
        return data;
    }

    @Override
    public Product getProductDetail(Long id) {
        Product product = productMapper.selectProductById(id);
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if (!"published".equals(product.getStatus())) {
            throw new BusinessException(403, "商品当前不可见");
        }
        return product;
    }

    @Override
    public List<ProductMedia> batchUploadMedia(String token, Long productId, List<MediaUploadDTO> mediaList) {
        User user = getCurrentUser(token);
        assertMerchant(user);

        Product product = productMapper.selectProductById(productId);
        if (product == null) {
            throw new BusinessException(404, "商品不存在");
        }
        if (!product.getMerchantUserId().equals(user.getId())) {
            throw new BusinessException(403, "不能操作其他商家的商品");
        }

        if (mediaList == null || mediaList.isEmpty()) {
            throw new BusinessException(400, "素材不能为空");
        }

        for (ProductMedia media : convertToMedia(productId, mediaList)) {
            productMapper.insertMedia(media);
        }
        return productMapper.listMediaByProduct(productId);
    }

    private List<ProductMedia> convertToMedia(Long productId, List<MediaUploadDTO> mediaList) {
        List<ProductMedia> list = new java.util.ArrayList<>();
        for (MediaUploadDTO dto : mediaList) {
            ProductMedia media = new ProductMedia();
            media.setProductId(productId);
            media.setFileType(dto.getFileType() == null ? "image" : dto.getFileType());
            media.setFileName(dto.getFileName());
            media.setFileUrl(dto.getFileUrl());
            media.setFilePath(dto.getFilePath());
            media.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
            media.setCreatedAt(new Date());
            list.add(media);
        }
        return list;
    }

    private String normalizeProductType(String productType) {
        if (productType == null || productType.isBlank()) {
            return "self";
        }
        String normalized = productType.trim().toLowerCase();
        return "leadout".equals(normalized) || "third_party".equals(normalized) || "导流".equals(normalized) ? "leadout" : "self";
    }

    private String normalizePlatform(String targetPlatform, String productType) {
        if ("leadout".equalsIgnoreCase(normalizeProductType(productType))) {
            if (targetPlatform == null || targetPlatform.isBlank()) {
                return "jd";
            }
            String normalized = targetPlatform.trim().toLowerCase();
            return "tb".equals(normalized) || "taobao".equals(normalized) || "tmall".equals(normalized) ? "tb" : "jd";
        }
        return null;
    }
}
