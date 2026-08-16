package com.heritage.ecommerce.dto;

import lombok.Data;

@Data
public class MediaUploadDTO {
    private Long productId;
    private String fileType;
    private String fileName;
    private String fileUrl;
    private String filePath;
    private Integer sortOrder;
}
