package com.heritage.ecommerce.constants;

public final class OrderStatus {
    public static final String PENDING_PAYMENT = "pending_payment";
    public static final String PENDING_SHIPMENT = "pending_shipment";
    public static final String SHIPPED = "shipped";
    public static final String COMPLETED = "completed";
    public static final String CANCELLED = "cancelled";
    public static final String AFTER_SALES = "after_sales";

    private OrderStatus() {}
}
