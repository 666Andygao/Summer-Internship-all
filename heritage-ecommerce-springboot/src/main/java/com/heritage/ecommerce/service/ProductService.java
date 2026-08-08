package com.heritage.ecommerce.service;

import com.heritage.ecommerce.dto.*;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ProductCategory;
import com.heritage.ecommerce.entity.ProductMedia;

import java.util.List;
import java.util.Map;

public interface ProductService {
    List<ProductCategory> listCategory(String token, Long parentId, String keyword);
    ProductCategory addCategory(String token, ProductCategoryDTO dto);
    ProductCategory updateCategory(String token, Long id, ProductCategoryDTO dto);
    String deleteCategory(String token, Long id);

    Product addProduct(String token, ProductCreateDTO dto);
    Product updateProduct(String token, Long id, ProductUpdateDTO dto);
    String updateProductStatus(String token, Long id, String status);
    String updateProductStock(String token, Long id, ProductStockDTO dto);
    Map<String, Object> listMerchantProducts(String token, String keyword, String status, Integer page, Integer size);

    Map<String, Object> listProducts(ProductQueryDTO dto);
    Product getProductDetail(Long id);

    List<ProductMedia> batchUploadMedia(String token, Long productId, List<MediaUploadDTO> mediaList);
}
