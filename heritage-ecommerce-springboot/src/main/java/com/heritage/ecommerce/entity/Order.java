package com.heritage.ecommerce.entity;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class Order {
    private Long id;
    private Long userId;
    private Long merchantId;
    private String orderNo;
    private String status;
    private BigDecimal totalAmount;
    private BigDecimal freight;
    private BigDecimal payAmount;
    private String receiverName;
    private String receiverPhone;
    private String receiverProvince;
    private String receiverCity;
    private String receiverDistrict;
    private String receiverDetail;
    private String remark;
    private Date createdAt;
    private Date updatedAt;
    private Date paidAt;
    private Date shippedAt;
    private Date completedAt;
    private Date cancelledAt;
}
