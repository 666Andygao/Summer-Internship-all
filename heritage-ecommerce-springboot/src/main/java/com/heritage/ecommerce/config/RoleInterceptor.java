package com.heritage.ecommerce.config;

import com.heritage.ecommerce.annotation.RequireRole;
import com.heritage.ecommerce.constants.UserRole;
import com.heritage.ecommerce.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;

@Component
public class RoleInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        if (requireRole == null) {
            return true;
        }

        String token = request.getHeader("Authorization");
        if (token == null || !token.startsWith("Bearer ")) {
            response.setStatus(401);
            response.setContentType("application/json;charset=utf-8");
            response.getWriter().write("{\"code\":401,\"message\":\"请先登录\"}");
            return false;
        }

        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            response.setStatus(401);
            response.setContentType("application/json;charset=utf-8");
            response.getWriter().write("{\"code\":401,\"message\":\"登录已失效\"}");
            return false;
        }

        String role = jwtUtil.getRoleFromToken(jwt);
        if (role == null || !Arrays.asList(requireRole.value()).contains(role)) {
            response.setStatus(403);
            response.setContentType("application/json;charset=utf-8");
            response.getWriter().write("{\"code\":403,\"message\":\"当前角色无权限访问此接口\"}");
            return false;
        }

        request.setAttribute("currentRole", role);
        request.setAttribute("currentUsername", jwtUtil.getUsernameFromToken(jwt));
        return true;
    }
}
