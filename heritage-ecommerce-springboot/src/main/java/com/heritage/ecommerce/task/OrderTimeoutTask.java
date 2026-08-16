package com.heritage.ecommerce.task;

import com.heritage.ecommerce.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderTimeoutTask {

    @Autowired
    private OrderService orderService;

    @Scheduled(fixedRate = 60000)
    public void processExpiredOrders() {
        orderService.cancelExpiredOrders();
    }
}
