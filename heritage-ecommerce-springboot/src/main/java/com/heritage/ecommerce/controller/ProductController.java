package com.heritage.ecommerce.controller;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.common.Result;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.dto.*;
import com.heritage.ecommerce.entity.Product;
import com.heritage.ecommerce.entity.ProductCategory;
import com.heritage.ecommerce.entity.ProductMedia;
import com.heritage.ecommerce.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/product")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping("/categories")
    @RequireRole({UserRole.ARTISAN})
    public Result<List<ProductCategory>> listCategory(@RequestHeader("Authorization") String token,
                                                    @RequestParam(required = false) Long parentId,
                                                    @RequestParam(required = false) String keyword) {
        return Result.success(productService.listCategory(token, parentId, keyword));
    }

    @PostMapping("/categories")
    @RequireRole({UserRole.ARTISAN})
    public Result<ProductCategory> addCategory(@RequestHeader("Authorization") String token,
                                              @Validated @RequestBody ProductCategoryDTO dto) {
        return Result.success(productService.addCategory(token, dto));
    }

    @PutMapping("/categories/{id}")
    @RequireRole({UserRole.ARTISAN})
    public Result<ProductCategory> updateCategory(@RequestHeader("Authorization") String token,
                                                 @PathVariable Long id,
                                                 @Validated @RequestBody ProductCategoryDTO dto) {
        return Result.success(productService.updateCategory(token, id, dto));
    }

    @DeleteMapping("/categories/{id}")
    @RequireRole({UserRole.ARTISAN})
    public Result<String> deleteCategory(@RequestHeader("Authorization") String token,
                                        @PathVariable Long id) {
        return Result.success(productService.deleteCategory(token, id));
    }

    @PostMapping("/merchant")
    @RequireRole({UserRole.ARTISAN})
    public Result<Product> addProduct(@RequestHeader("Authorization") String token,
                                     @Validated @RequestBody ProductCreateDTO dto) {
        return Result.success(productService.addProduct(token, dto));
    }

    @PutMapping("/merchant/{id}")
    @RequireRole({UserRole.ARTISAN})
    public Result<Product> updateProduct(@RequestHeader("Authorization") String token,
                                        @PathVariable Long id,
                                        @Validated @RequestBody ProductUpdateDTO dto) {
        return Result.success(productService.updateProduct(token, id, dto));
    }

    @PutMapping("/merchant/{id}/status")
    @RequireRole({UserRole.ARTISAN})
    public Result<String> updateProductStatus(@RequestHeader("Authorization") String token,
                                             @PathVariable Long id,
                                             @RequestParam String status) {
        return Result.success(productService.updateProductStatus(token, id, status));
    }

    @PutMapping("/merchant/{id}/stock")
    @RequireRole({UserRole.ARTISAN})
    public Result<String> updateProductStock(@RequestHeader("Authorization") String token,
                                            @PathVariable Long id,
                                            @Validated @RequestBody ProductStockDTO dto) {
        return Result.success(productService.updateProductStock(token, id, dto));
    }

    @GetMapping("/merchant")
    @RequireRole({UserRole.ARTISAN})
    public Result<Map<String, Object>> listMerchantProducts(@RequestHeader("Authorization") String token,
                                                          @RequestParam(required = false) String keyword,
                                                          @RequestParam(required = false) String status,
                                                          @RequestParam(defaultValue = "1") Integer page,
                                                          @RequestParam(defaultValue = "10") Integer size) {
        return Result.success(productService.listMerchantProducts(token, keyword, status, page, size));
    }

    @GetMapping("/search")
    public Result<Map<String, Object>> listProducts(@ModelAttribute ProductQueryDTO dto) {
        return Result.success(productService.listProducts(dto));
    }

    @GetMapping("/{id}")
    public Result<Product> getProductDetail(@PathVariable Long id) {
        return Result.success(productService.getProductDetail(id));
    }

    @PostMapping("/{id}/media")
    @RequireRole({UserRole.ARTISAN})
    public Result<List<ProductMedia>> batchUploadMedia(@RequestHeader("Authorization") String token,
                                                     @PathVariable Long id,
                                                     @RequestBody List<MediaUploadDTO> mediaList) {
        return Result.success(productService.batchUploadMedia(token, id, mediaList));
    }
}
