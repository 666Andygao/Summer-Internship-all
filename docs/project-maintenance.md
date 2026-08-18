# 华夏风物 · 非遗传承电商平台 - 项目维护说明书

> 版本: v2.0 | 适用版本: 全部 | 最后更新: 2026-08-18

---

## 一、项目概述

### 1.1 项目简介

**华夏风物 · 非遗传承电商平台** 是一个面向中国非物质文化遗产的垂直电商系统，致力于为非遗手艺人（陶瓷、刺绣、漆器、木版年画等）搭建数字化销售渠道，让传统工艺走进现代生活。

### 1.2 技术栈

| 层次 | 技术选型 | 版本 |
|------|---------|------|
| 后端（原型） | Node.js + Express | 18.x / 4.x |
| 后端（正式） | Spring Boot + MyBatis | 2.7.18 / 2.3.1 |
| 数据库 | MySQL | 8.0+ |
| 缓存 | Redis (预留) | 7.x |
| 前端 | HTML/CSS/JavaScript + Vue.js | 3.x |
| 反向代理 | Nginx | 1.22+ |
| 部署 | systemd + Jar 包 | - |
| 认证 | JWT (jjwt) | 0.11.5 |
| 分页 | PageHelper | 1.4.7 |

### 1.3 项目模块

```
┌─────────────────────────────────────────────────────────┐
│                    非遗电商平台                          │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ 用户模块  │ 商品模块  │ 订单模块  │ 支付模块  │ 第三方导入  │
│ · 注册   │ · 发布   │ · 下单   │ · 微信   │ · 京东抓取  │
│ · 登录   │ · 搜索   │ · 支付   │ · 支付宝 │ · 淘宝抓取  │
│ · 权限   │ · 分类   │ · 发货   │ · 退款   │ · 数据清洗  │
│ · 个人中心│ · 属性   │ · 售后   │          │ · 映射管理  │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│ 购物车   │ 评价模块  │ 客服模块  │ 数据统计  │ 内容管理    │
│ · 加购   │ · 评分   │ · 会话   │ · 销量   │ · 非遗故事  │
│ · 结算   │ · 回复   │ · 消息   │ · 营收   │ · 匠人介绍  │
│ · 数量   │ · 审核   │ · 投诉   │ · 趋势   │ · 图文详情  │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

---

## 二、目录结构说明

### 2.1 Node.js 原型版

```
Summer-Internship-all/
├── server.js                     # 主入口 (路由 + 业务逻辑)
├── package.json                  # 依赖配置
├── data/                         # JSON 数据存储
├── src/
│   ├── constants/                # 常量定义
│   │   ├── order.constant.js     #   订单状态常量
│   │   ├── payment.constant.js   #   支付方式常量
│   │   ├── after-sales.constant.js # 售后状态常量
│   │   └── review.constant.js    #   评价状态常量
│   ├── middleware/                # 中间件
│   │   ├── validator.middleware.js # 入参校验
│   │   ├── error-handler.middleware.js # 全局异常
│   │   └── rate-limit.middleware.js # 限流
│   ├── services/                 # 业务逻辑
│   │   ├── payment.service.js    #   支付服务
│   │   ├── after-sales.service.js # 售后服务
│   │   ├── review.service.js     #   评价服务
│   │   └── merchant-stats.service.js # 商家统计
│   ├── mappers/                  # 数据访问
│   ├── tasks/                    # 定时任务
│   ├── utils/                    # 工具类
│   └── db/                       # SQL 优化脚本
├── sql/                          # 数据库初始化
├── docs/                         # 项目文档
├── tests/                        # 测试脚本
└── shop/                         # 商城前端
```

### 2.2 Spring Boot 正式版

```
heritage-ecommerce-springboot/
├── pom.xml                              # Maven 配置
└── src/main/
    ├── java/com/heritage/ecommerce/
    │   ├── HeritageEcommerceApplication.java  # 启动类
    │   ├── controller/                  # 接口层 (10+ 控制器)
    │   ├── service/                    # 业务层 (含 impl 子包)
    │   ├── mapper/                     # 数据访问层
    │   ├── entity/                     # 数据库实体
    │   ├── dto/                        # 请求传输对象
    │   ├── vo/                         # 响应视图对象
    │   ├── config/                     # 配置类 (CORS/JWT/拦截器)
    │   ├── exception/                  # 异常处理
    │   ├── filter/                     # 过滤器
    │   ├── annotation/                 # 自定义注解
    │   ├── constants/                  # 枚举常量
    │   ├── common/                     # 通用组件 (Result/PageResult)
    │   ├── task/                       # 定时任务
    │   ├── utils/                      # 工具类
    │   ├── design/                     # 设计文档
    │   └── docs/                       # API 文档
    └── resources/
        ├── application.yml             # 主配置
        ├── mapper/                     # MyBatis XML
        └── sql/                        # 额外 SQL
```

---

## 三、日常维护操作手册

### 3.1 服务管理

```bash
# 查看服务状态
sudo systemctl status heritage-ecommerce

# 启动服务
sudo systemctl start heritage-ecommerce

# 停止服务
sudo systemctl stop heritage-ecommerce

# 重启服务 (更新后使用)
sudo systemctl restart heritage-ecommerce

# 设置开机自启
sudo systemctl enable heritage-ecommerce
```

### 3.2 日志管理

```bash
# 实时查看应用日志
tail -f /opt/heritage-ecommerce/logs/heritage-ecommerce.log

# 查看错误日志
grep -i "error\|exception" /opt/heritage-ecommerce/logs/heritage-ecommerce.log | tail -100

# 查看特定时间段日志
grep "2026-08-18 14:" /opt/heritage-ecommerce/logs/heritage-ecommerce.log

# 查看 systemd 日志
sudo journalctl -u heritage-ecommerce --since "10 minutes ago"

# 日志轮转 (自动，logrotate 配置)
cat /etc/logrotate.d/heritage-ecommerce
```

### 3.3 数据管理

```bash
# 数据库备份
mysqldump -u heritage -p heritage_ecommerce > backup_$(date +%Y%m%d_%H%M%S).sql

# 数据库恢复
mysql -u heritage -p heritage_ecommerce < backup_20260818_120000.sql

# 定时备份 (crontab)
# 每天凌晨 2 点备份
0 2 * * * mysqldump -u heritage -pPASSWORD heritage_ecommerce | gzip > /backup/heritage_$(date +\%Y\%m\%d).sql.gz

# 数据库优化
mysql -u heritage -p -e "OPTIMIZE TABLE orders, order_items, products;" heritage_ecommerce

# 清理过期数据
mysql -u heritage -p heritage_ecommerce <<EOF
DELETE FROM product_crawl_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
DELETE FROM third_party_product_mapping WHERE mapping_status = 'disabled' AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
DELETE FROM payments WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
EOF
```

### 3.4 性能监控

```bash
# 查看 CPU / 内存
top -bn1 | head -20
free -h

# 查看 Java 进程
ps aux | grep java
jstat -gcmetime $(pgrep -f heritage-ecommerce) 1000 10

# 查看数据库连接
mysql -u heritage -p -e "SHOW PROCESSLIST;" heritage_ecommerce
mysql -u heritage -p -e "SHOW STATUS LIKE 'Threads_connected';" heritage_ecommerce

# 查看慢查询
mysql -u heritage -p -e "SHOW VARIABLES LIKE 'slow_query_log';" heritage_ecommerce
# 开启慢查询: SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 2;

# 查看商品搜索 SQL 执行计划
mysql -u heritage -p heritage_ecommerce -e "
EXPLAIN SELECT * FROM products WHERE title LIKE '%陶瓷%' AND status = 'on_sale' ORDER BY sales_count DESC LIMIT 20;
"
```

---

## 四、BUG 修复记录规范

### 4.1 BUG 报告模板

```
【BUG 标题】简洁描述问题

【严重程度】P0(崩溃) / P1(严重) / P2(一般) / P3(轻微)
【模块】用户/商品/订单/支付/售后/评价/统计
【版本】v1.x.x
【发现时间】YYYY-MM-DD

【复现步骤】
1. 登录买家账号 test_buyer
2. 进入商品详情页
3. 点击"加入购物车"按钮
4. 观察页面无响应

【预期结果】
购物车显示已添加商品

【实际结果】
按钮点击后无任何响应，控制台报错: TypeError: ...

【错误日志】
[具体错误日志堆栈]

【影响范围】
所有用户 / 部分用户 / 特定角色用户

【临时解决方案】
...
```

### 4.2 修复流程

```
1. 问题记录 → 2. 问题定位 → 3. 问题分析 → 4. 代码修复
     ↓                                        ↓
5. 单元测试 → 6. 代码审查 → 7. 测试环境验证 → 8. 生产环境发布
     ↓
9. 回归测试 → 10. 文档更新 → 11. 关闭工单
```

### 4.3 版本号规范

```
主版本.功能版本.BUG 修复版本

示例:
v1.0.0 → 初始版本
v1.1.0 → 新增评价模块
v1.1.1 → 修复评价分页 BUG
v2.0.0 → 支付模块大版本升级
```

---

## 五、扩展功能开发方案

### 5.1 优惠券营销模块

#### 5.1.1 功能概述

为平台增加优惠券系统，支持满减、折扣、新人券、活动券等多种玩法，提升用户粘性和复购率。

#### 5.1.2 数据库设计

```sql
-- 优惠券模板表
CREATE TABLE coupon_templates (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(128) NOT NULL COMMENT '优惠券名称',
    type            VARCHAR(32)  NOT NULL COMMENT '类型: fixed(满减)/discount(折扣)/shipping(免运费)',
    value           DECIMAL(10,2) NOT NULL COMMENT '面值(金额或折扣率)',
    min_amount      DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '最低消费金额',
    scope           VARCHAR(32)  NOT NULL DEFAULT 'all' COMMENT '适用范围: all/category/product',
    scope_ids       JSON         DEFAULT NULL COMMENT '适用范围ID列表',
    total_count     INT          NOT NULL COMMENT '发行总量',
    remain_count    INT          NOT NULL COMMENT '剩余数量',
    per_user_limit  INT          NOT NULL DEFAULT 1 COMMENT '每人限领数量',
    start_time      DATETIME     NOT NULL COMMENT '生效开始时间',
    end_time        DATETIME     NOT NULL COMMENT '生效结束时间',
    status          VARCHAR(32)  NOT NULL DEFAULT 'enabled',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coupon_time (start_time, end_time, status)
) ENGINE=InnoDB COMMENT='优惠券模板表';

-- 用户优惠券表
CREATE TABLE user_coupons (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    coupon_id       BIGINT       NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'unused' COMMENT 'unused/used/expired',
    used_order_id   BIGINT       DEFAULT NULL COMMENT '使用的订单ID',
    used_at         DATETIME     NULL,
    expire_at       DATETIME     NOT NULL COMMENT '过期时间',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_coupon_user (user_id, status),
    INDEX idx_user_coupon_expire (expire_at, status)
) ENGINE=InnoDB COMMENT='用户优惠券表';

-- 优惠券领取记录表
CREATE TABLE coupon_activities (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    coupon_id       BIGINT       NOT NULL,
    activity_name   VARCHAR(128) NOT NULL,
    start_time      DATETIME     NOT NULL,
    end_time        DATETIME     NOT NULL,
    total_quota     INT          NOT NULL,
    received_count  INT          NOT NULL DEFAULT 0,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='优惠券活动表';
```

#### 5.1.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/coupons/available` | GET | 获取当前可领取优惠券列表 |
| `/api/coupons/receive/:couponId` | POST | 领取优惠券 |
| `/api/coupons/my` | GET | 我的优惠券列表 |
| `/api/coupons/validate` | POST | 下单时验证优惠券可用性 |
| `/api/coupons/use` | POST | 使用优惠券（下单时调用） |
| `/api/admin/coupons` | GET | 管理端-优惠券列表 |
| `/api/admin/coupons` | POST | 管理端-创建优惠券 |
| `/api/admin/coupons/:id` | PUT | 管理端-编辑优惠券 |
| `/api/admin/coupons/:id/toggle` | PATCH | 管理端-启用/禁用 |

#### 5.1.4 核心业务规则

```
1. 优惠券类型:
   - fixed: 满 N 减 M (min_amount=100, value=20 表示满100减20)
   - discount: N 折 (value=0.8 表示 8 折)
   - shipping: 免运费 (无金额门槛)

2. 使用规则:
   - 订单金额 >= min_amount 才能使用
   - 每个订单只能使用一张优惠券
   - 优惠券不可叠加使用
   - 退款时优惠券不退回（业务决策）
   - 优惠券到期自动失效

3. 扩展点:
   - 支持品类优惠券 (指定 heritage_category)
   - 支持商品优惠券 (指定 product_id)
   - 支持新人专享 (注册自动发放)
   - 支持满赠活动 (后续版本)
```

#### 5.1.5 代码结构

```
新增文件:
├── controller/CouponController.java
├── service/CouponService.java
├── service/impl/CouponServiceImpl.java
├── mapper/CouponMapper.java
├── entity/Coupon.java
├── entity/UserCoupon.java
├── dto/CouponReceiveDTO.java
├── dto/CouponUseDTO.java
├── vo/CouponVO.java
```

---

### 5.2 非遗直播商品关联模块

#### 5.2.1 功能概述

为非遗手艺人提供直播带货能力，直播时实时展示商品列表，观众可一键跳转购买。

#### 5.2.2 数据库设计

```sql
-- 直播间表
CREATE TABLE live_rooms (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_user_id BIGINT      NOT NULL COMMENT '开播商家',
    title           VARCHAR(200) NOT NULL COMMENT '直播标题',
    cover_image     VARCHAR(500) DEFAULT '' COMMENT '直播封面',
    live_url        VARCHAR(500) DEFAULT '' COMMENT '直播流地址(RTMP/HLS)',
    stream_key      VARCHAR(128) DEFAULT '' COMMENT '推流密钥',
    status          VARCHAR(32)  NOT NULL DEFAULT 'ended' COMMENT 'pending/live/ended',
    started_at      DATETIME     NULL,
    ended_at        DATETIME     NULL,
    scheduled_start DATETIME     NULL COMMENT '预约开播时间',
    viewer_count    INT          NOT NULL DEFAULT 0 COMMENT '观看人数',
    peak_viewers    INT          NOT NULL DEFAULT 0 COMMENT '峰值观众',
    total_sales     DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '直播销售额',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_live_merchant (merchant_user_id, status),
    INDEX idx_live_status (status),
    INDEX idx_live_started (started_at DESC)
) ENGINE=InnoDB COMMENT='直播间表';

-- 直播商品关联表
CREATE TABLE live_room_products (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    live_room_id    BIGINT        NOT NULL,
    product_id      BIGINT        NOT NULL,
    sort_order      INT           NOT NULL DEFAULT 0,
    is_featured     TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否当前讲解商品',
    promo_price     DECIMAL(12,2) DEFAULT NULL COMMENT '直播专属价',
    promo_stock     INT           DEFAULT NULL COMMENT '直播库存',
    sold_count      INT           NOT NULL DEFAULT 0 COMMENT '直播销量',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_live_products_room (live_room_id, sort_order)
) ENGINE=InnoDB COMMENT='直播商品关联表';

-- 直播互动消息表
CREATE TABLE live_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    live_room_id    BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    content         VARCHAR(500) NOT NULL,
    type            VARCHAR(32)  NOT NULL DEFAULT 'chat' COMMENT 'chat/like/gift/follow',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_live_msg_room (live_room_id, created_at)
) ENGINE=InnoDB COMMENT='直播互动消息表';

-- 直播预约表
CREATE TABLE live_subscriptions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    live_room_id    BIGINT   NOT NULL,
    user_id         BIGINT   NOT NULL,
    notified        TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已通知',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_live_sub (live_room_id, user_id)
) ENGINE=InnoDB COMMENT='直播预约表';
```

#### 5.2.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/live/rooms` | GET | 直播广场（进行中+即将开始） |
| `/api/live/rooms/:id` | GET | 直播间详情（含商品列表） |
| `/api/live/rooms/:id/join` | POST | 进入直播间 |
| `/api/live/rooms/:id/leave` | POST | 离开直播间 |
| `/api/live/rooms/:id/chat` | POST | 发送聊天消息 |
| `/api/live/rooms/:id/like` | POST | 点赞 |
| `/api/live/rooms/:id/gift` | POST | 送礼物 |
| `/api/live/rooms/:id/subscribe` | POST | 预约开播提醒 |
| `/api/merchant/live/rooms` | GET | 商家-我的直播间列表 |
| `/api/merchant/live/rooms` | POST | 商家-创建直播间 |
| `/api/merchant/live/rooms/:id/start` | POST | 商家-开始直播 |
| `/api/merchant/live/rooms/:id/end` | POST | 商家-结束直播 |
| `/api/merchant/live/rooms/:id/products` | POST | 商家-添加直播商品 |
| `/api/merchant/live/rooms/:id/products/:pid/feature` | PATCH | 商家-标记当前讲解商品 |
| `/api/merchant/live/stats` | GET | 商家-直播数据统计 |

#### 5.2.4 技术方案

```
1. 直播推流方案:
   - 方案一: 自建 RTMP 服务 (Node Media Server / SRS)
     推流: RTMP → 服务器 → HLS/DASH → 前端播放
   - 方案二: 第三方直播云 (腾讯云/阿里云直播)
     推流: 浏览器 → 云直播 → CDN → 前端播放
   - 推荐: 初期使用第三方方案，成本低、稳定性高

2. 实时通信方案:
   - WebSocket (Socket.IO) 实现聊天、点赞等互动功能
   - Redis Pub/Sub 广播消息
   - 直播间状态变更通知

3. 商品联动:
   - 直播间商品与普通商品共享 product_id
   - 支持直播专属价 (promo_price)
   - 支持直播专属库存 (promo_stock)
   - 下单时校验直播状态和专属价有效性

4. 扩展路线图:
   v2.1: 直播基础功能 (创建/开播/下播)
   v2.2: 互动功能 (聊天/点赞/礼物)
   v2.3: 商品联动 (讲解标记/专属价/一键购买)
   v2.4: 数据统计 (观看数据/销售转化)
   v2.5: 回放功能 (录制+回放)
```

---

### 5.3 消息通知模块

#### 5.3.1 功能概述

为用户提供站内消息、邮件、短信等多渠道通知能力，覆盖订单状态变更、优惠活动提醒、直播开播提醒等场景。

#### 5.3.2 数据库设计

```sql
-- 消息模板表
CREATE TABLE message_templates (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(64)  NOT NULL COMMENT '模板编码',
    title           VARCHAR(200) NOT NULL COMMENT '模板标题',
    content         TEXT         NOT NULL COMMENT '模板内容(支持变量)',
    channel         VARCHAR(32)  NOT NULL COMMENT 'in_app/email/sms/push',
    variables       JSON         DEFAULT NULL COMMENT '可用变量列表',
    status          VARCHAR(32)  NOT NULL DEFAULT 'enabled',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_msg_template_code (code)
) ENGINE=InnoDB COMMENT='消息模板表';

-- 用户消息表
CREATE TABLE user_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT        NOT NULL,
    template_code   VARCHAR(64)   DEFAULT NULL COMMENT '关联模板编码',
    title           VARCHAR(200)  NOT NULL,
    content         TEXT          NOT NULL,
    type            VARCHAR(32)   NOT NULL COMMENT 'system/order/promotion/live/social',
    biz_type        VARCHAR(32)   DEFAULT '' COMMENT '业务类型',
    biz_id          VARCHAR(64)   DEFAULT NULL COMMENT '业务ID',
    is_read         TINYINT(1)    NOT NULL DEFAULT 0,
    is_deleted      TINYINT(1)    NOT NULL DEFAULT 0,
    sender_id       BIGINT        DEFAULT NULL COMMENT '发送者ID(系统消息为null)',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_user (user_id, is_read, created_at DESC),
    INDEX idx_msg_type (user_id, type, created_at DESC)
) ENGINE=InnoDB COMMENT='用户消息表';

-- 消息发送记录表
CREATE TABLE message_send_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id      BIGINT        NOT NULL,
    channel         VARCHAR(32)   NOT NULL,
    recipient       VARCHAR(200)  NOT NULL COMMENT '接收者(用户ID/邮箱/手机号)',
    status          VARCHAR(32)   NOT NULL COMMENT 'sent/failed/pending',
    error_message   VARCHAR(500)  DEFAULT '',
    retry_count     INT           NOT NULL DEFAULT 0,
    sent_at         DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_log_status (status),
    INDEX idx_msg_log_created (created_at DESC)
) ENGINE=InnoDB COMMENT='消息发送记录表';

-- 用户通知偏好设置
CREATE TABLE user_notification_settings (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL UNIQUE,
    in_app_order    TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '站内-订单通知',
    in_app_promotion TINYINT(1)  NOT NULL DEFAULT 1 COMMENT '站内-营销通知',
    in_app_live     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '站内-直播通知',
    email_order     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '邮件-订单通知',
    email_promotion TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '邮件-营销通知',
    sms_order       TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '短信-订单通知',
    push_order      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '推送-订单通知',
    push_live       TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '推送-直播通知',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='用户通知偏好表';
```

#### 5.3.3 接口设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/messages` | GET | 我的消息列表（分页） |
| `/api/messages/unread-count` | GET | 未读消息数量 |
| `/api/messages/:id/read` | PATCH | 标记已读 |
| `/api/messages/read-all` | PATCH | 全部标记已读 |
| `/api/messages/:id` | DELETE | 删除消息 |
| `/api/messages/clear` | DELETE | 清空已读消息 |
| `/api/messages/settings` | GET | 获取通知偏好设置 |
| `/api/messages/settings` | PUT | 更新通知偏好设置 |
| `/api/admin/messages` | POST | 管理端-发送系统消息 |
| `/api/admin/messages/batch` | POST | 管理端-批量发送消息 |
| `/api/admin/messages/templates` | GET | 管理端-消息模板列表 |
| `/api/admin/messages/templates` | POST | 管理端-创建模板 |

#### 5.3.4 核心业务规则

```
1. 消息类型:
   - system: 系统消息（维护通知、版本更新）
   - order: 订单消息（下单成功、发货通知、签收通知）
   - promotion: 营销消息（优惠券到账、活动开始）
   - live: 直播消息（预约开播、直播提醒）
   - social: 社交消息（好友申请、客服回复）

2. 发送渠道:
   - in_app: 站内消息（写入 user_messages 表）
   - email: 邮件通知（SMTP / 阿里云邮件推送）
   - sms: 短信通知（阿里云短信 / 腾讯云短信）
   - push: App 推送（极光推送 / 个推 / 自研 WebSocket 推送）

3. 发送时机:
   - 实时发送: 订单状态变更、直播开播等
   - 批量发送: 优惠券活动、系统公告等（定时任务）
   - 延迟发送: 用户预约的直播开播前 5 分钟

4. 扩展点:
   - 消息队列: 使用 RocketMQ / Kafka 解耦发送
   - 消息去重: 基于业务ID + 用户ID 的唯一约束
   - 失败重试: 指数退避重试（最多 3 次）
   - 消息聚合: 同类型消息合并展示
   - 免打扰时段: 用户设置免打扰时段内不推送
```

#### 5.3.5 代码结构

```
新增文件:
├── controller/MessageController.java
├── controller/NotificationController.java
├── service/MessageService.java
├── service/impl/MessageServiceImpl.java
├── service/EmailService.java
├── service/SmsService.java
├── service/PushService.java
├── mapper/MessageMapper.java
├── entity/UserMessage.java
├── entity/MessageTemplate.java
├── entity/UserNotificationSettings.java
├── dto/MessageSendDTO.java
├── vo/MessageVO.java
├── task/MessageRetryTask.java       # 消息重试定时任务
└── task/MessageBatchSendTask.java   # 批量发送定时任务
```

---

## 六、数据库版本演进

### 6.1 版本变更记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-07-01 | 初始版本: users, products, orders, order_items, addresses |
| v1.1 | 2026-07-15 | 新增: merchants, merchant_ext 表 |
| v1.2 | 2026-07-25 | 新增: payments, payment_logs, after_sales, reviews, favorites |
| v1.3 | 2026-08-01 | 新增: complaints, conversations, messages, friends |
| v1.4 | 2026-08-08 | 新增: third_party_product_mapping, product_crawl_log |
| v1.5 | 2026-08-15 | 性能优化: 新增索引, 视图 v_merchant_sales_stats, v_product_sales_rank |
| v2.0 | 2026-08-18 | 完整版: 全部业务表 + 第三方导入扩展 + 初始化数据 |
| v2.1 (规划) | - | 新增: coupon_templates, user_coupons, live_rooms |
| v2.2 (规划) | - | 新增: live_room_products, live_messages, user_messages |

### 6.2 数据迁移规范

```sql
-- 迁移脚本命名规范: V{version}__{description}.sql
-- 示例: V2_1__add_coupon_module.sql

-- 1. 先备份
mysqldump -u root -p heritage_ecommerce > pre_migration_backup.sql

-- 2. 执行迁移
mysql -u root -p heritage_ecommerce < V2_1__add_coupon_module.sql

-- 3. 验证
SELECT COUNT(*) FROM coupon_templates;
DESCRIBE user_coupons;

-- 4. 应用层验证 (确保旧代码仍兼容)
-- 新字段设默认值，旧代码不受影响
-- 新表独立，旧表不修改
```

---

## 七、安全维护

### 7.1 密钥管理

```
密钥类型:
├── JWT 签名密钥: jwt.secret (application.yml)
├── 支付回调密钥: PAYMENT_CALLBACK_TOKEN (server.js)
├── 数据库密码: spring.datasource.password
├── 邮件 SMTP 密码 (预留)
├── 短信 API Key (预留)
└── 第三方平台 API Key (预留)

安全规范:
1. 生产密钥不得硬编码，使用环境变量或配置中心
2. 密钥定期更换 (建议 90 天)
3. 不同环境使用不同密钥
4. 密钥备份加密存储
5. 密钥泄露立即轮换
```

### 7.2 数据安全

```
1. 敏感字段加密存储:
   - 密码: bcrypt (已实现)
   - 身份证号: AES-256
   - 银行卡号: AES-256
   - 手机号: 部分脱敏展示

2. 防 SQL 注入:
   - MyBatis #{} (已使用)
   - 禁止拼接 SQL
   - 输入参数校验 (Validator)

3. 防 XSS:
   - 输出转义
   - CSP 策略头
   - 输入清洗 (sanitizeBody)

4. 防 CSRF:
   - Token 验证
   - SameSite Cookie
   - Referer 检查

5. 防暴力破解:
   - 登录接口限流 (已实现)
   - 验证码 (预留 CaptchaUtil)
   - 失败锁定

6. 数据备份:
   - 每日全量备份
   - 实时 binlog 增量备份
   - 异地灾备存储
```

### 7.3 安全审计

```
需要记录的操作:
- 用户登录/登出
- 管理员操作 (审核/删除/权限变更)
- 支付相关操作 (创建/退款/回调)
- 敏感信息查看 (个人信息/订单详情)
- 数据导出操作

审计表:
CREATE TABLE audit_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    action      VARCHAR(64)  NOT NULL,
    target_type VARCHAR(32)  NOT NULL,
    target_id   VARCHAR(64)  NOT NULL,
    detail      JSON         DEFAULT NULL,
    ip_address  VARCHAR(64)  DEFAULT '',
    user_agent  VARCHAR(500) DEFAULT '',
    result      VARCHAR(16)  NOT NULL COMMENT 'success/failed',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id, created_at DESC),
    INDEX idx_audit_action (action, created_at DESC)
) ENGINE=InnoDB COMMENT='审计日志表';
```

---

## 八、常见问题 FAQ

### Q1: 如何重置管理员密码？
```bash
mysql -u heritage -p heritage_ecommerce -e "
UPDATE users
SET password = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';
"
# 新密码: admin123456
```

### Q2: 如何批量导入商品？
```
方式一: 第三方链接导入 (已实现)
  POST /api/products/import
  { "source": "jd", "source_url": "https://item.jd.com/xxx.html" }

方式二: Excel 批量导入 (扩展方案)
  1. 下载模板: GET /api/products/import/template
  2. 填写商品数据
  3. 上传 Excel: POST /api/products/import/excel (multipart/form-data)
  4. 查看导入结果: GET /api/products/import/:taskId

方式三: API 对接
  开放 REST API 供第三方 ERP/OMS 系统对接
```

### Q3: 商品详情页图片加载慢怎么办？
```
1. Nginx 开启 gzip 压缩
2. 图片 CDN 加速
3. 前端图片懒加载
4. 商品详情使用缩略图，点击加载高清图
5. 预留 image_size 字段，前端按屏幕尺寸选择
```

### Q4: 订单支付超时如何处理？
```
1. 系统自动处理:
   - 定时任务 OrderTimeoutTask 扫描超时订单
   - 超过 30 分钟未支付自动取消
   - 库存回滚

2. 手动处理:
   POST /api/admin/orders/scan-timeout

3. 通知:
   - 超时前 5 分钟发送提醒
   - 超时取消后发送消息通知

4. 配置:
   修改 ORDER_TIMEOUT_MS (server.js)
```

### Q5: 如何扩展新的支付方式？
```
1. 在 constants/payment.constant.js 中添加新支付方式常量
2. 在 services/payment.service.js 中实现支付逻辑
3. 在 controllers/PaymentController.java 中添加新接口
4. 前端支付方式列表通过 GET /api/payments/methods 动态获取
```

---

## 九、版本路线图

### v2.1 - 营销增强
- [ ] 优惠券模块（满减/折扣/免运费）
- [ ] 新人礼包
- [ ] 限时秒杀
- [ ] 满赠活动

### v2.2 - 直播带货
- [ ] 直播间创建与管理
- [ ] 实时互动（聊天/点赞）
- [ ] 商品讲解联动
- [ ] 直播数据统计
- [ ] 直播回放

### v2.3 - 消息中心
- [ ] 站内消息系统
- [ ] 邮件通知
- [ ] 短信通知
- [ ] App 推送
- [ ] 用户通知偏好设置

### v2.4 - 性能优化
- [ ] Redis 缓存层
- [ ] 商品详情 Redis 缓存
- [ ] 热门搜索词缓存
- [ ] 接口响应缓存
- [ ] 静态资源 CDN 化

### v2.5 - 生态扩展
- [ ] 微信小程序端
- [ ] H5 移动端适配
- [ ] 开放 API 平台
- [ ] 第三方 ERP 对接
- [ ] 数据大屏可视化

### v3.0 - 商业化
- [ ] 多商户入驻
- [ ] 平台佣金结算
- [ ] 财务对账系统
- [ ] 会员体系
- [ ] 积分商城

---

## 十、联系与技术支持

| 角色 | 职责 | 联系方式 |
|------|------|---------|
| 项目经理 | 需求协调、版本规划 | project@heritage.cn |
| 后端开发 | 接口开发、问题排查 | backend@heritage.cn |
| 前端开发 | 页面开发、联调支持 | frontend@heritage.cn |
| 运维工程师 | 服务器维护、部署支持 | ops@heritage.cn |
| 数据库管理员 | 数据库优化、备份恢复 | dba@heritage.cn |

---

> **文档维护说明**: 本文档随项目迭代持续更新，任何修改请同步通知相关人员。