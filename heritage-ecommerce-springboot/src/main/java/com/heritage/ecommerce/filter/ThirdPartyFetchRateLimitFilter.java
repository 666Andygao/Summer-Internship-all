package com.heritage.ecommerce.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heritage.ecommerce.common.Result;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ThirdPartyFetchRateLimitFilter extends OncePerRequestFilter {

    private static final int LIMIT = 5;
    private static final long WINDOW_MILLIS = 60_000L;
    private final Map<String, Deque<Long>> requestBuckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return !uri.startsWith("/third-party/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = buildKey(request);
        Deque<Long> bucket = requestBuckets.computeIfAbsent(key, k -> new ArrayDeque<>());
        long now = System.currentTimeMillis();

        synchronized (bucket) {
            while (!bucket.isEmpty() && now - bucket.peekFirst() > WINDOW_MILLIS) {
                bucket.pollFirst();
            }

            if (bucket.size() >= LIMIT) {
                response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(objectMapper.writeValueAsString(
                        Result.error(429, "单商家1分钟内最多解析5条第三方链接，已超限请稍后重试"))
                );
                return;
            }
            bucket.offerLast(now);
        }

        filterChain.doFilter(request, response);
    }

    private String buildKey(HttpServletRequest request) {
        String username = (String) request.getAttribute("username");
        String merchantId = request.getParameter("merchantId");
        String ip = getClientIp(request);

        if (merchantId != null && !merchantId.isBlank()) {
            return merchantId + ":" + ip;
        }
        if (username != null && !username.isBlank()) {
            return username + ":" + ip;
        }
        return ip;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
