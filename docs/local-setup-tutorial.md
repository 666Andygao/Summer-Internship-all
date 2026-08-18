# 华夏风物 · 非遗传承电商平台 - VS Code 本地启动完整教程

> 适用对象: 全栈开发工程师 / 后端开发工程师
> 涵盖内容: Node.js 快速原型版 + Spring Boot 正式版双版本本地启动

---

## 一、环境准备

### 1.1 软件版本要求

| 软件 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | 18.x+ (推荐 LTS) | https://nodejs.org/ |
| npm | 9.x+ (随 Node.js 安装) | https://nodejs.org/ |
| JDK | 17 (Spring Boot 版) | https://adoptium.net/ |
| Maven | 3.8+ (Spring Boot 版) | https://maven.apache.org/ |
| MySQL | 8.0+ | https://dev.mysql.com/ |
| VS Code | 最新版 | https://code.visualstudio.com/ |
| Git | 2.x+ | https://git-scm.com/ |

### 1.2 VS Code 推荐插件

```
# Node.js 开发
- ESLint
- Prettier
- REST Client (或 Thunder Client)
- Node.js Exec

# Java / Spring Boot 开发
- Extension Pack for Java
- Spring Boot Extension Pack
- Lombok Annotations Support
- MyBatis and Free Marker

# 通用
- Chinese Language Pack
- GitLens
- Live Server
```

### 1.3 环境变量配置

**Windows 系统:**
```powershell
# 检查 Node.js
node -v   # 应输出 v18.x.x
npm -v    # 应输出 9.x.x

# 检查 Java (Spring Boot 版)
java -version   # 应输出 17.x.x
mvn -version    # 应输出 3.8.x

# 检查 MySQL
mysql -u root -p # 能正常登录即可
```

---

## 二、Node.js 快速原型版启动 (server.js)

### 2.1 项目结构

```
Summer-Internship-all/
├── server.js                    # 后端主入口
├── package.json                 # Node.js 依赖配置
├── data/                        # JSON 数据持久化目录
│   └── db.json                  # 自动生成
├── src/                         # 源码模块
│   ├── constants/               # 常量定义
│   ├── db/                      # SQL 优化脚本
│   ├── mappers/                 # 数据访问层
│   ├── middleware/              # 中间件
│   ├── services/                # 业务逻辑层
│   ├── tasks/                   # 定时任务
│   └── utils/                   # 工具类
├── sql/                         # 数据库初始化脚本
├── docs/                        # 项目文档
├── tests/                       # 测试脚本
├── login.html                   # 前端登录页
├── MainPage.html                # 前端主页
├── shop/                        # 商城前端
└── ...
```

### 2.2 启动步骤

#### 第一步: 安装依赖

```bash
cd c:\Users\LENOVO\Desktop\Summer-Internship-all
npm install
```

依赖说明 (`package.json`):
| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.18.2 | Web 框架 |
| jsonwebtoken | ^9.0.2 | JWT 令牌 |
| bcryptjs | ^2.4.3 | 密码加密 |
| multer | ^1.4.5 | 文件上传 |
| cors | ^2.8.5 | 跨域支持 |
| uuid | ^9.0.0 | ID 生成 |

#### 第二步: 启动服务

```bash
# 开发模式 (前台运行，Ctrl+C 停止)
node server.js

# 或使用 npm scripts
npm run dev
```

启动成功后控制台输出:
```
========================================
  华夏风物 · 非遗传承 后端服务
========================================
  ✅ 服务器运行在: http://localhost:3000
  🏠 主页:        http://localhost:3000/MainPage.html
  🔐 登录注册:    http://localhost:3000/login.html
  👤 用户中心:    http://localhost:3000/user-dashboard.html
  👨‍💻 开发者中心:  http://localhost:3000/developer-dashboard.html
  🛍️ 商城:        http://localhost:3000/shop/
========================================
```

#### 第三步: 验证服务

**方式一: 浏览器访问**
- 打开 `http://localhost:3000/login.html` 进入登录注册页
- 打开 `http://localhost:3000/MainPage.html` 进入主页

**方式二: API 测试**
```bash
# 获取角色列表
curl http://localhost:3000/api/roles

# 响应: {"roles":[{"value":"buyer","label":"普通买家"},...]}
```

**方式三: VS Code REST Client**

在 VS Code 中创建文件 `test.http`:
```http
@base = http://localhost:3000

### 获取角色列表
GET {{base}}/api/roles HTTP/1.1

### 用户注册
POST {{base}}/api/register HTTP/1.1
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456",
  "role": "buyer",
  "display_name": "测试用户"
}

### 用户登录
POST {{base}}/api/login HTTP/1.1
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456",
  "role": "buyer"
}
```

点击 "Send Request" 即可测试接口。

#### 第四步: 测试账号

| 账号 | 密码 | 角色 | 用途 |
|------|------|------|------|
| admin | admin123456 | admin | 平台管理员 |
| test_buyer | buyer123456 | buyer | 测试买家 |
| test_artisan | artisan123456 | artisan | 测试商家 |

### 2.3 本地开发调试

#### VS Code 调试配置

在项目根目录创建 `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Node.js Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server.js",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "console": "integratedTerminal",
      "outFiles": ["${workspaceFolder}/data/**/*.js"]
    },
    {
      "name": "Attach to Process",
      "type": "node",
      "request": "attach",
      "port": 9229
    }
  ]
}
```

#### 常用调试技巧

1. **在代码中设置断点**: 直接在 VS Code 左侧边栏点击行号旁设置红点
2. **启动调试**: 按 `F5` 或点击"运行和调试"面板
3. **查看变量**: 调试时左侧面板可实时查看所有变量值
4. **条件断点**: 右键断点 → "编辑条件断点"，设置 `req.url === '/api/orders'` 这样的条件
5. **日志点**: 右键行号 → "添加日志点"，不中断但输出日志到控制台

### 2.4 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `端口 3000 被占用` | 其他程序占用端口 | 修改 `server.js` 中的 `PORT` 或关闭占用程序 |
| `模块加载失败` | node_modules 未安装或损坏 | 执行 `npm install` 或 `rm -rf node_modules && npm install` |
| `JSON 解析错误` | 请求体格式错误 | 检查 Content-Type 是否为 `application/json` |
| `数据库文件损坏` | 异常中断导致 db.json 损坏 | 删除 `data/db.json` 重启服务（会清空测试数据） |
| `Token 过期` | 登录超过 7 天 | 重新登录获取新 Token |
| `跨域报错` | 前端页面端口不同 | CORS 已配置支持，检查前端请求地址是否正确 |

---

## 三、Spring Boot 正式版启动 (heritage-ecommerce-springboot)

### 3.1 项目结构

```
heritage-ecommerce-springboot/
├── pom.xml                              # Maven 配置
├── src/
│   └── main/
│       ├── java/com/heritage/ecommerce/
│       │   ├── HeritageEcommerceApplication.java  # 启动类
│       │   ├── controller/              # 接口层
│       │   ├── service/                 # 业务层
│       │   ├── mapper/                  # 数据访问层
│       │   ├── entity/                  # 实体类
│       │   ├── dto/                     # 请求 DTO
│       │   ├── vo/                      # 响应 VO
│       │   ├── config/                  # 配置类
│       │   ├── exception/              # 异常处理
│       │   ├── filter/                  # 过滤器
│       │   ├── annotation/             # 自定义注解
│       │   ├── constants/              # 常量枚举
│       │   ├── common/                 # 通用组件
│       │   ├── task/                    # 定时任务
│       │   ├── utils/                   # 工具类
│       │   └── design/                  # 设计文档
│       └── resources/
│           ├── application.yml         # 主配置
│           ├── mapper/                  # MyBatis XML
│           └── sql/                     # 额外 SQL
```

### 3.2 第一步: 创建数据库

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE heritage_ecommerce
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 切换数据库
USE heritage_ecommerce;

-- 执行初始化脚本 (文件在项目根目录 sql/ 下)
SOURCE c:/Users/LENOVO/Desktop/Summer-Internship-all/sql/init_heritage_ecommerce.sql;
```

或使用 MySQL Workbench / Navicat 等 GUI 工具执行 `sql/init_heritage_ecommerce.sql`。

### 3.3 第二步: 修改配置

编辑 `heritage-ecommerce-springboot/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://127.0.0.1:3306/heritage_ecommerce?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root          # ← 修改为你的 MySQL 用户名
    password: 123456        # ← 修改为你的 MySQL 密码

upload:
  base-path: D:/heritage-ecommerce/uploads  # ← 修改为你本地的上传目录
```

### 3.4 第三步: 安装 Maven 依赖

```bash
cd c:\Users\LENOVO\Desktop\Summer-Internship-all\heritage-ecommerce-springboot

# 编译并下载依赖
mvn clean compile

# 如果依赖下载慢，可配置国内镜像
# 编辑 ~/.m2/settings.xml 添加阿里云镜像:
# <mirror>
#   <id>aliyun</id>
#   <mirrorOf>central</mirrorOf>
#   <url>https://maven.aliyun.com/repository/public</url>
# </mirror>
```

### 3.5 第四步: 启动 Spring Boot

**方式一: 命令行启动**
```bash
cd heritage-ecommerce-springboot
mvn spring-boot:run
```

**方式二: VS Code 启动**
1. 打开 `heritage-ecommerce-springboot` 文件夹
2. 找到 `HeritageEcommerceApplication.java`
3. 点击 `main` 方法上方的 `Run | Debug`
4. 或创建 `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Run HeritageEcommerceApplication",
      "request": "launch",
      "mainClass": "com.heritage.ecommerce.HeritageEcommerceApplication",
      "projectName": "heritage-ecommerce"
    }
  ]
}
```

### 3.6 第五步: 验证服务

启动成功后:
```
访问: http://localhost:8080/api

测试登录接口:
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123456",
  "role": "admin"
}
```

### 3.7 常见问题

| 问题 | 解决方案 |
|------|---------|
| `端口 8080 被占用` | 修改 `application.yml` 中的 `server.port` |
| `数据库连接失败` | 检查 MySQL 是否启动、用户名密码是否正确、数据库是否存在 |
| `时区错误` | URL 添加 `&serverTimezone=Asia/Shanghai` |
| `Maven 依赖下载慢` | 配置阿里云镜像 |
| `Lombok 不生效` | 安装 VS Code Lombok 插件，启用 Annotation Processing |
| `Mapper 扫描失败` | 检查 `@MapperScan` 注解和 XML 路径是否一致 |
| `上传目录不存在` | 创建 `D:/heritage-ecommerce/uploads` 目录 |

---

## 四、双版本对比说明

| 对比项 | Node.js 版 | Spring Boot 版 |
|--------|-----------|---------------|
| 启动命令 | `node server.js` | `mvn spring-boot:run` |
| 默认端口 | 3000 | 8080 |
| 数据存储 | JSON 文件 (data/db.json) | MySQL 数据库 |
| 适用场景 | 快速原型、演示、前端联调 | 生产环境、正式部署 |
| 接口路径 | `/api/xxx` | `/api/xxx` (context-path: /api) |
| 认证方式 | JWT (7天有效) | JWT (24小时有效，可配置) |
| 文件上传 | multer (内存存储) | MultipartFile (磁盘存储) |
| 依赖管理 | npm / package.json | Maven / pom.xml |
| 适用版本 | 迭代演示 | 正式交付 |

---

## 五、日常开发工作流

```
1. 打开 VS Code → File → Open Folder → 选择项目目录
2. 启动后端服务 → Node.js: node server.js 或 Spring Boot: F5
3. 打开浏览器访问: http://localhost:3000 (Node.js) / 8080 (Spring Boot)
4. 前端开发: 修改 HTML/CSS/JS 文件，刷新浏览器
5. 后端开发: 修改 server.js 或 Java 代码，重启服务
6. 接口测试: 使用 REST Client / Postman / Thunder Client
7. 提交代码: Git 提交到远程仓库
```

---

## 六、Git 版本控制

```bash
# 首次初始化
cd Summer-Internship-all
git init
git add .
git commit -m "feat: 非遗电商后端初始化"

# 推送到远程 (GitHub/Gitee)
git remote add origin https://github.com/your-username/heritage-ecommerce.git
git branch -M main
git push -u origin main

# 日常开发
git checkout -b feature/merchant-module  # 创建功能分支
# ... 开发代码 ...
git add .
git commit -m "feat: 完成商家模块"
git push origin feature/merchant-module
git checkout main
git merge feature/merchant-module
```

---

## 七、开发规范速查

### 7.1 代码规范
- Node.js: 使用 CommonJS 模块规范，文件命名使用 kebab-case
- Java: 使用驼峰命名，Controller/Service/Mapper 分层清晰
- 统一错误处理: Node.js 使用全局中间件，Java 使用 `@RestControllerAdvice`
- 日志: Node.js 使用 console.log + 文件日志，Java 使用 SLF4J

### 7.2 Git 提交规范
```
feat:     新功能
fix:      修复 BUG
docs:     文档更新
style:    代码格式调整
refactor: 代码重构
test:     测试相关
chore:    构建/工具变更
```

### 7.3 接口规范
- RESTful 风格: GET 查询 / POST 创建 / PUT 更新 / DELETE 删除
- 统一返回格式: `{ code, data, message }`
- 分页参数: `page` + `limit`
- 日期格式: ISO-8601 (2026-08-18T10:00:00.000Z)
- 状态码: 200 成功 / 400 参数错误 / 401 未登录 / 403 无权限 / 404 资源不存在 / 500 服务器错误