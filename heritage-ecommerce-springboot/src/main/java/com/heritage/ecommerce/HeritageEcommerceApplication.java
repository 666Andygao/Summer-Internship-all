package com.heritage.ecommerce;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.heritage.ecommerce.mapper")
public class HeritageEcommerceApplication {
    public static void main(String[] args) {
        SpringApplication.run(HeritageEcommerceApplication.class, args);
    }
}
