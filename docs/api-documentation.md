# 华夏风物 · 非遗传承电商平台 - 完整接口文档

> 版本: v2.0 | 基础路径: `http://localhost:3000`
>
> 通用请求头:
> ```
> Content-Type: application/json
> Authorization: Bearer <token>   # 需鉴权接口必填
> ```
>
> 通用响应格式:
> ```json
> {
>   "code": 0,
>   "data": { ... },
>   "message": "success"
> }
> ```
>
> 错误响应:
> ```json
> {
>   "code": 40001,
>   "message": "参数校验失败: username 不能为空",
>   "detail": { "username": ["username 不能为空"] }
> }
> ```

---

## 一、认证模块

### 1.1 用户注册

- **URL**: `POST /api/register`
- **鉴权**: 否
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 (3-32位) |
| password | string | 是 | 密码 (6-32位) |
| role | string | 是 | 角色: buyer / artisan / admin |
| display_name | string | 是 | 昵称 (2-32位) |
| phone | string | 否 | 手机号 |

- **请求示例**:
```json
{
  "username": "testuser",
  "password": "123456",
  "role": "buyer",
  "display_name": "测试用户",
  "phone": "13800000000"
}
```

- **响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "testuser",
    "role": "buyer",
    "display_name": "测试用户",
    "phone": "13800000000"
  }
}
```

### 1.2 用户登录

- **URL**: `POST /api/login`
- **鉴权**: 否
- **限流**: 10次/15分钟/账号IP
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| role | string | 是 | 角色: buyer / artisan / admin |

- **响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "display_name": "平台管理员",
    "phone": "13800000000"
  }
}
```

### 1.3 获取当前用户信息

- **URL**: `GET /api/me`
- **鉴权**: 是

- **响应示例**:
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "display_name": "平台管理员",
  "phone": "13800000000",
  "email": "",
  "avatar": "",
  "bio": "",
  "status": "active",
  "created_at": "2026-08-01T10:00:00.000Z"
}
```

### 1.4 获取角色列表

- **URL**: `GET /api/roles`
- **鉴权**: 否

- **响应示例**:
```json
{
  "roles": [
    { "value": "buyer", "label": "普通买家" },
    { "value": "artisan", "label": "非遗手艺人商家" },
    { "value": "admin", "label": "平台管理员" }
  ]
}
```

### 1.5 修改个人资料

- **URL**: `PUT /api/users/me`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| display_name | string | 否 | 昵称 |
| phone | string | 否 | 手机号 |
| email | string | 否 | 邮箱 |
| avatar | string | 否 | 头像URL |
| bio | string | 否 | 个人简介 |

### 1.6 修改用户角色（管理员）

- **URL**: `PUT /api/users/:id/role`
- **鉴权**: 是 (admin)
- **请求体**: `{ "role": "artisan" }`

### 1.7 修改密码

- **URL**: `POST /api/password`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| old_password | string | 是 | 原密码 |
| new_password | string | 是 | 新密码 (6-32位) |

---

## 二、商家模块

### 2.1 申请成为商家

- **URL**: `POST /api/merchants/apply`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shop_name | string | 是 | 店铺名称 (2-64位) |
| intro | string | 是 | 店铺简介 (10-500位) |
| heritage_category | string | 是 | 非遗类别 |
| contact_phone | string | 是 | 联系电话 |
| contact_email | string | 否 | 联系邮箱 |

### 2.2 获取我的商家信息

- **URL**: `GET /api/merchants/me`
- **鉴权**: 是 (artisan)

### 2.3 更新我的商家信息

- **URL**: `PUT /api/merchants/me`
- **鉴权**: 是 (artisan)
- **请求体**: `{ shop_name, intro, heritage_category, contact_phone, ... }`

### 2.4 商家资质审核（管理员）

- **URL**: `PUT /api/merchants/qualification`
- **鉴权**: 是 (admin)

### 2.5 商家认证信息

- **URL**: `GET /api/merchants/certification`
- **鉴权**: 是 (artisan)

### 2.6 更新认证信息

- **URL**: `PUT /api/merchants/certification`
- **鉴权**: 是 (artisan)

### 2.7 商家权限管理

- **URL**: `GET /api/merchants/permissions`  |  `PUT /api/merchants/permissions`
- **鉴权**: 是 (artisan)

---

## 三、商品模块

### 3.1 发布商品

- **URL**: `POST /api/products`
- **鉴权**: 是 (artisan)
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 商品标题 (2-200位) |
| category | string | 是 | 商品分类 |
| heritage_category | string | 是 | 非遗分类 |
| price | number | 是 | 售价 (大于0) |
| stock | number | 是 | 库存 (0-99999) |
| brief | string | 否 | 商品简介 |
| description | string | 否 | 商品详情(富文本) |
| story | string | 否 | 非遗故事 |
| artisan_intro | string | 否 | 手艺人介绍 |
| cover_image | string | 否 | 封面图URL |
| images | array | 否 | 商品图片数组 |
| tags | array | 否 | 标签数组 |
| attributes | object | 否 | 规格属性 |
| status | string | 否 | draft / on_sale / off_sale |

### 3.2 商品搜索（分页）

- **URL**: `GET /api/products`
- **鉴权**: 是
- **查询参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| category | string | 否 | 分类筛选 |
| tag | string | 否 | 标签筛选 |
| sort | string | 否 | 排序: newest / sales / price_asc / price_desc |
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页条数，默认20 |

- **响应示例**:
```json
{
  "items": [
    {
      "id": 1,
      "title": "手工青花瓷茶具套装",
      "brief": "景德镇非遗传承人手绘",
      "price": 688.00,
      "stock": 50,
      "sales_count": 120,
      "cover_image": "/uploads/sample/blue-white-tea.jpg",
      "category": "陶瓷",
      "heritage_category": "景德镇瓷",
      "merchant_user_id": 1,
      "status": "on_sale"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20,
  "total_pages": 1
}
```

### 3.3 获取商品详情

- **URL**: `GET /api/products/:id`
- **鉴权**: 是

### 3.4 更新商品

- **URL**: `PUT /api/products/:id`
- **鉴权**: 是 (artisan, 仅本商品所属商家)

### 3.5 更新商品详情/属性

- **URL**: `PUT /api/products/:id/content`  |  `PUT /api/products/:id/attributes`
- **鉴权**: 是 (artisan)

### 3.6 商品状态管理

| 操作 | URL | 说明 |
|------|-----|------|
| 上架/下架 | `PATCH /api/products/:id/status` | `{ "status": "on_sale" }` |
| 修改库存 | `PATCH /api/products/:id/stock` | `{ "stock": 100 }` |
| 修改价格 | `PATCH /api/products/:id/price` | `{ "price": 299.00 }` |
| 发布 | `POST /api/products/:id/publish` | - |
| 取消发布 | `POST /api/products/:id/unpublish` | - |
| 删除商品 | `DELETE /api/products/:id` | 软删除 |

### 3.7 商品展示

| URL | 说明 |
|-----|------|
| `GET /api/products/recommend` | 推荐商品列表 |
| `GET /api/products/featured` | 特色非遗商品列表 |
| `GET /api/products/categories` | 商品分类列表 |

---

## 四、购物车模块

### 4.1 获取购物车列表

- **URL**: `GET /api/cart`
- **鉴权**: 可选（未登录返回空列表）

### 4.2 添加商品到购物车

- **URL**: `POST /api/cart/items`
- **鉴权**: 可选
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| product_id | number | 是 | 商品ID |
| quantity | number | 否 | 数量，默认1 |

### 4.3 修改购物车项

- **URL**: `PUT /api/cart/items/:productId`
- **请求体**: `{ "quantity": 2 }`

### 4.4 选中/取消选中

- `PATCH /api/cart/items/:productId/selected` → `{ "selected": true }`
- `PATCH /api/cart/select-all` → `{ "selected": true }`

### 4.5 删除购物车项

- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`  (清空购物车)

### 4.6 购物车结算预览

- **URL**: `GET /api/cart/settlement`
- **鉴权**: 是

### 4.7 购物车结算提交

- **URL**: `POST /api/cart/checkout`
- **鉴权**: 是

---

## 五、订单模块

### 5.1 直接下单

- **URL**: `POST /api/orders/direct`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| product_id | number | 是 | 商品ID |
| quantity | number | 是 | 购买数量 |
| address_id | number | 否 | 收货地址ID |
| remark | string | 否 | 买家备注 |

### 5.2 订单预览

- **URL**: `GET /api/orders/preview`
- **鉴权**: 是

### 5.3 获取我的订单列表

- **URL**: `GET /api/orders`
- **鉴权**: 是
- **查询参数**: `status` / `page` / `limit`

### 5.4 获取订单详情

- **URL**: `GET /api/orders/:id`
- **鉴权**: 是 (买家或商家)

### 5.5 取消订单

- **URL**: `POST /api/orders/:id/cancel`
- **鉴权**: 是

### 5.6 确认收货

- **URL**: `POST /api/orders/:id/confirm-receipt`
- **鉴权**: 是

### 5.7 申请售后

- **URL**: `POST /api/orders/:id/apply-after-sales`
- **鉴权**: 是

### 5.8 查询物流

- **URL**: `GET /api/orders/:id/logistics`
- **鉴权**: 是

---

## 六、支付模块

### 6.1 获取可用支付方式

- **URL**: `GET /api/payments/methods`
- **鉴权**: 是

- **响应示例**:
```json
{
  "methods": [
    { "code": "wechat", "name": "微信支付", "enabled": true },
    { "code": "alipay", "name": "支付宝", "enabled": true },
    { "code": "bank_transfer", "name": "银行卡转账", "enabled": true },
    { "code": "balance", "name": "余额支付", "enabled": false }
  ]
}
```

### 6.2 发起支付

- **URL**: `POST /api/orders/:id/pay`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| payment_method | string | 是 | wechat / alipay / bank_transfer / balance |

- **响应示例**:
```json
{
  "payment_id": 1001,
  "order_id": 100,
  "amount": 688.00,
  "payment_method": "wechat",
  "status": "pending",
  "pay_url": "weixin://pay?prepay_id=xxx",
  "qr_code": "data:image/png;base64,..."
}
```

### 6.3 支付回调

- **URL**: `POST /api/orders/:id/pay/callback`
- **鉴权**: 否 (第三方支付平台回调)
- **请求体**: 支付平台原始回调数据

### 6.4 查询支付状态

- **URL**: `GET /api/orders/:id/payment`
- **鉴权**: 是

### 6.5 支付重试

- **URL**: `POST /api/orders/:id/pay/retry`
- **鉴权**: 是

### 6.6 超时支付取消

- **URL**: `POST /api/orders/:id/pay/timeout`
- **鉴权**: 是

### 6.7 支付日志

- **URL**: `GET /api/orders/:id/payment/logs`
- **鉴权**: 是

### 6.8 支付安全验证

- **URL**: `GET /api/orders/:id/payment/verify`
- **鉴权**: 是

### 6.9 订单退款

- `POST /api/orders/:id/refund` — 申请退款
- `POST /api/orders/:id/refund/:refundId/complete` — 完成退款

### 6.10 管理员超时扫描

- **URL**: `POST /api/admin/orders/scan-timeout`
- **鉴权**: 是 (admin)

---

## 七、商家订单管理

### 7.1 商家订单列表

- **URL**: `GET /api/merchant/orders`
- **鉴权**: 是 (artisan / admin)
- **查询参数**: `status` / `page` / `limit` / `order_no`

### 7.2 商家订单统计

- **URL**: `GET /api/merchant/orders/stats`
- **鉴权**: 是 (artisan / admin)

### 7.3 商品销量排行

- **URL**: `GET /api/merchant/stats/sales-rank`
- **鉴权**: 是 (artisan / admin)
- **查询参数**: `page` / `limit` / `category`

### 7.4 营收统计

- **URL**: `GET /api/merchant/stats/revenue`
- **鉴权**: 是 (artisan / admin)

- **响应示例**:
```json
{
  "today": {
    "order_count": 12,
    "total_revenue": 8256.00
  },
  "history": {
    "order_count": 328,
    "total_revenue": 186420.00
  }
}
```

### 7.5 商家发货

- **URL**: `POST /api/merchant/orders/:id/ship`
- **鉴权**: 是 (artisan / admin)
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shipping_company | string | 是 | 物流公司 |
| tracking_number | string | 是 | 运单号 |

### 7.6 关闭订单

- **URL**: `POST /api/merchant/orders/:id/close`
- **鉴权**: 是 (artisan / admin)

---

## 八、售后模块

### 8.1 创建售后单

- **URL**: `POST /api/after-sales`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | number | 是 | 订单ID |
| type | string | 是 | refund / return / exchange |
| reason | string | 是 | 售后原因 |
| description | string | 否 | 详细描述 |
| images | array | 否 | 凭证图片 |
| refund_amount | number | 否 | 申请退款金额 |

### 8.2 修改售后单

- **URL**: `PUT /api/after-sales/:id`
- **鉴权**: 是 (仅待处理状态可修改)

### 8.3 获取我的售后列表

- **URL**: `GET /api/after-sales`
- **鉴权**: 是

### 8.4 获取售后详情

- **URL**: `GET /api/after-sales/:id`
- **鉴权**: 是

### 8.5 商家审核售后

- **URL**: `PATCH /api/after-sales/:id/review`
- **鉴权**: 是 (artisan / admin)
- **请求体**: `{ "decision": "approve" | "reject", "note": "审核备注" }`

### 8.6 商家处理售后

- **URL**: `POST /api/after-sales/:id/decision`
- **鉴权**: 是 (artisan / admin)

### 8.7 更新售后物流

- **URL**: `PATCH /api/after-sales/:id/logistics`
- **鉴权**: 是
- **请求体**: `{ "logistics_company": "...", "tracking_number": "..." }`

### 8.8 完成售后

- **URL**: `POST /api/after-sales/:id/complete`
- **鉴权**: 是

### 8.9 售后跟踪

- **URL**: `GET /api/after-sales/:id/trace`
- **鉴权**: 是

### 8.10 商家售后管理

| URL | 说明 |
|-----|------|
| `GET /api/merchant/after-sales` | 商家售后列表 |
| `GET /api/merchant/after-sales/stats` | 售后统计 |
| `POST /api/merchant/after-sales/:id/reply` | 商家回复售后 |

---

## 九、评价模块

### 9.1 发布评价

- **URL**: `POST /api/orders/:id/reviews`
- **鉴权**: 是
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| rating | number | 是 | 评分 1-5 |
| content | string | 是 | 评价内容 |
| images | array | 否 | 评价图片 |

### 9.2 追加评价

- **URL**: `POST /api/reviews/:id/additional`
- **鉴权**: 是

### 9.3 获取商品评价列表

- **URL**: `GET /api/products/:id/reviews`
- **鉴权**: 否

### 9.4 商家回复评价

- **URL**: `POST /api/reviews/:id/reply`
- **鉴权**: 是 (artisan / admin)

### 9.5 评价管理（商家/管理员）

| URL | 说明 |
|-----|------|
| `PATCH /api/reviews/:id/approve` | 审核通过 |
| `PATCH /api/reviews/:id/block` | 屏蔽评价 |
| `PATCH /api/reviews/:id/hide` | 隐藏评价 |
| `DELETE /api/reviews/:id` | 删除评价 |
| `GET /api/reviews/stats` | 评价统计 |
| `GET /api/profile/reviews` | 我的评价列表 |

---

## 十、个人中心

### 10.1 获取/修改个人资料

| URL | 说明 |
|-----|------|
| `GET /api/profile` | 获取个人资料 |
| `PUT /api/profile` | 修改个人资料 |

### 10.2 收货地址管理

| URL | 说明 |
|-----|------|
| `GET /api/addresses` | 地址列表 |
| `POST /api/addresses` | 新增地址 |
| `PUT /api/addresses/:id` | 修改地址 |
| `DELETE /api/addresses/:id` | 删除地址 |
| `PATCH /api/addresses/:id/default` | 设为默认地址 |

### 10.3 我的订单/收藏

| URL | 说明 |
|-----|------|
| `GET /api/profile/orders` | 我的订单列表 |
| `GET /api/profile/favorites` | 我的收藏列表 |
| `GET /api/profile/reviews` | 我的评价列表 |

---

## 十一、客服与消息

### 11.1 客服会话

| URL | 说明 |
|-----|------|
| `GET /api/contacts` | 获取联系人列表 |
| `POST /api/conversations` | 创建会话 |
| `GET /api/conversations` | 获取会话列表 |
| `GET /api/conversations/:id/messages` | 获取消息历史 |
| `POST /api/conversations/:id/messages` | 发送消息（支持文件上传） |
| `DELETE /api/conversations/:id` | 删除会话 |

### 11.2 好友系统

| URL | 说明 |
|-----|------|
| `GET /api/users/find` | 搜索用户 |
| `POST /api/friends/request` | 发送好友请求 |
| `GET /api/friends/requests` | 收到的好友请求 |
| `GET /api/friends/requests/sent` | 发出的好友请求 |
| `POST /api/friends/requests/:id/accept` | 接受好友请求 |
| `POST /api/friends/requests/:id/reject` | 拒绝好友请求 |
| `GET /api/friends` | 好友列表 |
| `DELETE /api/friends/:id` | 删除好友 |

---

## 十二、投诉与客服

### 12.1 投诉管理

| URL | 说明 |
|-----|------|
| `POST /api/complaints` | 提交投诉 |
| `GET /api/complaints` | 我的投诉列表 |
| `GET /api/merchant/complaints` | 商家投诉列表 |
| `PATCH /api/merchant/complaints/:id/status` | 处理投诉 |

### 12.2 商家咨询

| URL | 说明 |
|-----|------|
| `GET /api/merchant/inquiries` | 商家咨询列表 |
| `POST /api/merchant/inquiries/:id/reply` | 回复咨询 |

---

## 十三、数据统计

### 13.1 商家数据统计

| URL | 说明 |
|-----|------|
| `GET /api/stats/sales` | 销量排行（全平台） |
| `GET /api/stats/revenue` | 营收统计 |
| `GET /api/stats/orders/trend` | 订单趋势 |
| `GET /api/stats/hot-products` | 热门商品 |

### 13.2 商家订单统计

| URL | 说明 |
|-----|------|
| `GET /api/merchant/orders/stats` | 订单统计 |
| `GET /api/merchant/stats/sales-rank` | 商品销量排行 |
| `GET /api/merchant/stats/revenue` | 营收统计 |

---

## 十四、第三方商品导入扩展模块

### 14.1 导入京东/淘宝商品

- **URL**: `POST /api/products/import`
- **鉴权**: 是 (artisan)
- **请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source | string | 是 | jd / taobao / tmall |
| source_url | string | 是 | 第三方商品链接 |
| auto_publish | boolean | 否 | 是否自动发布，默认false |

- **响应示例**:
```json
{
  "task_id": "import_1700000000000",
  "status": "pending",
  "message": "商品导入任务已提交"
}
```

### 14.2 导入状态查询

- **URL**: `GET /api/products/import/:taskId`
- **鉴权**: 是

### 14.3 我的导入历史

- **URL**: `GET /api/products/imports`
- **鉴权**: 是 (artisan)
- **查询参数**: `page` / `limit` / `source` / `status`

### 14.4 抓取日志

- **URL**: `GET /api/crawl/logs`
- **鉴权**: 是 (artisan / admin)

### 14.5 第三方商品映射

- `GET /api/third-party/mapping` — 映射列表
- `POST /api/third-party/mapping/:id/sync` — 同步更新

---

## 十五、系统管理

### 15.1 业务流程图

| URL | 说明 |
|-----|------|
| `GET /api/business-flow` | 业务流程JSON |
| `GET /api/business-flow/mermaid` | Mermaid流程图源码 |

### 15.2 设计规范文档

| URL | 说明 |
|-----|------|
| `GET /api/database-er` | 数据库ER图 |
| `GET /api/design/restful-spec` | RESTful接口规范 |
| `GET /api/design/project-architecture` | 项目分层架构 |
| `GET /api/design/delivery-checklist` | 交付清单 |

### 15.3 数据清理

- **URL**: `POST /api/cleanup`
- **鉴权**: 是 (admin)
- **说明**: 清理过期数据、测试账号等

---

## 十六、状态码说明

| HTTP状态码 | 业务Code | 说明 |
|-----------|---------|------|
| 200 | 0 | 成功 |
| 400 | 40001 | 参数校验失败 |
| 400 | 40002 | 业务规则校验失败 |
| 401 | 40101 | 未登录或Token过期 |
| 401 | 40102 | Token无效 |
| 403 | 40301 | 无权限访问 |
| 404 | 40401 | 资源不存在 |
| 409 | 40901 | 数据冲突(如重复创建) |
| 409 | 40902 | 库存冲突(并发扣减) |
| 429 | 42901 | 请求过于频繁(限流) |
| 500 | 50001 | 服务器内部错误 |

## 十七、角色权限矩阵

| 模块 | buyer | artisan | admin |
|------|-------|---------|-------|
| 浏览/搜索商品 | ✅ | ✅ | ✅ |
| 下单/支付 | ✅ | ✅ | ✅ |
| 评价/售后 | ✅ | ✅ | ✅ |
| 发布/管理商品 | ❌ | ✅ | ✅ |
| 商家订单管理 | ❌ | ✅ | ✅ |
| 数据统计 | ❌ | ✅ | ✅ |
| 审核/投诉处理 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |
| 商品导入 | ❌ | ✅ | ✅ |