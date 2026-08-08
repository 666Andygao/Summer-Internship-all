package com.heritage.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${upload.base-path}")
    private String uploadBasePath;

    @Value("${upload.static-access-prefix}")
    private String staticAccessPrefix;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(staticAccessPrefix + "**")
                .addResourceLocations("file:" + uploadBasePath + "/");
    }
}
