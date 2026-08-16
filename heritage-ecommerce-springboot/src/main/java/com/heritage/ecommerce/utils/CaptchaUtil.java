package com.heritage.ecommerce.utils;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Component
public class CaptchaUtil {
    private final Map<String, String> captchaStore = new HashMap<>();

    public Map<String, String> createCaptcha() {
        String key = String.valueOf(System.currentTimeMillis());
        Random random = new Random();
        int code = 1000 + random.nextInt(9000);
        String value = String.valueOf(code);
        captchaStore.put(key, value);
        Map<String, String> map = new HashMap<>();
        map.put("key", key);
        map.put("imageBase64", "data:image/png;base64,stub-image-" + value);
        return map;
    }

    public boolean validate(String key, String code) {
        if (key == null || code == null) {
            return false;
        }
        String expected = captchaStore.get(key);
        if (expected == null) {
            return false;
        }
        boolean ok = expected.equalsIgnoreCase(code.trim());
        captchaStore.remove(key);
        return ok;
    }
}
