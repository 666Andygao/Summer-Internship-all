# Heritage E-Commerce Spring Boot Project

这是基于现有非遗电商需求方案、数据表结构和分层架构规范生成的 Spring Boot 2.7 + MySQL 8.0 Maven 基础工程骨架。

## 目录说明

- `controller`: HTTP 接口层
- `service`: 业务逻辑层
- `service.impl`: 业务实现层
- `mapper`: 数据访问层
- `entity`: 数据实体层
- `dto`: 请求/响应对象层
- `vo`: 展示对象层
- `common`: 全局通用组件
- `config`: 配置类
- `exception`: 自定义异常
- `filter`: 过滤器（如 JWT 拦截）
- `utils`: 工具类

## 运行步骤

1. 安装 JDK 17
2. 安装 Maven 3.8+
3. 安装 MySQL 8.0，并创建数据库 `heritage_ecommerce`
4. 修改 `application.yml` 中的数据库用户名密码
5. 运行：

```bash
mvn clean package
mvn spring-boot:run
```

6. 访问：

```bash
http://localhost:8080/api/actuator/health
```

## 默认接口示例

- `/api/auth/login`
- `/api/auth/register`
- `/api/products/list`
- `/api/orders/list`

## 说明

这是一个“可直接运行并继续扩展”的基础工程骨架，适合作为后续真实业务开发的起点。 
