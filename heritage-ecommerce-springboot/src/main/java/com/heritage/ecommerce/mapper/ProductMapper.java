package com.heritage.ecommerce.mapper;

import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ProductCategory;
import com.heritage.ecommerce.entity.ProductMedia;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ProductMapper {
    int insertCategory(ProductCategory category);
    int updateCategory(ProductCategory category);
    int deleteCategory(@Param("id") Long id, @Param("merchantUserId") Long merchantUserId);
    List<ProductCategory> queryCategoryList(@Param("parentId") Long parentId,
                                          @Param("merchantUserId") Long merchantUserId,
                                          @Param("keyword") String keyword);
    ProductCategory selectCategoryById(@Param("id") Long id);

    int insertProduct(Product product);
    int updateProduct(Product product);
    int updateProductStatus(@Param("id") Long id, @Param("status") String status, @Param("merchantUserId") Long merchantUserId);
    int updateProductStock(@Param("id") Long id, @Param("stock") Integer stock, @Param("merchantUserId") Long merchantUserId);
    int decreaseStock(@Param("id") Long id, @Param("quantity") Integer quantity);
    int increaseStock(@Param("id") Long id, @Param("quantity") Integer quantity);
    Product selectProductById(@Param("id") Long id);
    List<Product> queryProductListByMerchant(@Param("merchantUserId") Long merchantUserId,
                                           @Param("keyword") String keyword,
                                           @Param("status") String status,
                                           @Param("page") Integer page,
                                           @Param("size") Integer size);
    Long countProductListByMerchant(@Param("merchantUserId") Long merchantUserId,
                                   @Param("keyword") String keyword,
                                   @Param("status") String status);

    List<Product> queryProducts(@Param("keyword") String keyword,
                               @Param("categoryId") Long categoryId,
                               @Param("minPrice") java.math.BigDecimal minPrice,
                               @Param("maxPrice") java.math.BigDecimal maxPrice,
                               @Param("tag") String tag,
                               @Param("status") String status,
                               @Param("productType") String productType,
                               @Param("page") Integer page,
                               @Param("size") Integer size,
                               @Param("sort") String sort);
    Long countProducts(@Param("keyword") String keyword,
                       @Param("categoryId") Long categoryId,
                       @Param("minPrice") java.math.BigDecimal minPrice,
                       @Param("maxPrice") java.math.BigDecimal maxPrice,
                       @Param("tag") String tag,
                       @Param("status") String status,
                       @Param("productType") String productType);

    int insertMedia(ProductMedia media);
    List<ProductMedia> listMediaByProduct(@Param("productId") Long productId);
}
