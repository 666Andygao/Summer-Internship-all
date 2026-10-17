# 华夏风物 · 非遗传承平台

一个非物质文化遗产主题的展示 + 电商 + 交流平台。后端用 Express 同时提供 API 和静态页面（前后端同源，便于共享登录态），数据持久化在 MySQL。

---

## 功能一览

| 模块 | 页面 | 说明 |
| --- | --- | --- |
| 主站 | `MainPage.html` | 非遗项目总览、3D 展品模型、工艺流程 |
| 登录注册 | `login.html` | 买家 / 开发者两种角色 |
<<<<<<< HEAD
| 用户中心 | `user-dashboard.html` | 好友管理、消息会话、订单与售后 |
| 开发者中心 | `developer-dashboard.html` | 好友、消息、商品与订单管理、管理用户（含在线状态） |
=======
<<<<<<< HEAD
| 用户中心 | `user-dashboard.html` | 好友管理、消息会话、订单与售后、提交商家入驻申请并查看审核状态 |
| 开发者中心 | `developer-dashboard.html` | 好友与消息、审核商家申请（一名开发者同意即可）、查看已批准商家及批准人、已通过商家的商品上架与管理、管理用户 |
=======
| 用户中心 | `user-dashboard.html` | 好友管理、消息会话、订单与售后 |
| 开发者中心 | `developer-dashboard.html` | 好友、消息、商品与订单管理、管理用户（含在线状态） |
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
| 非遗商城 | `/shop/` | Vue 3 单页应用，与主站同源共享登录态 |
| 内容页 | `archive*.html`、`process*.html`、`model*.html` | 项目档案、工艺详情、3D 模型展示 |

核心交互：**用户之间可以加好友、发起会话、互发文字与图片/视频消息**；开发者可以看到谁在线、管理自己的用户。

---

## 技术栈

- **后端**：Node.js 18+ / Express 4，单文件入口 `server.js`
- **数据库**：MySQL 8+（`mysql2/promise`），数据层 `db/store.js` 采用「内存缓存 + 定期写回 MySQL」
- **鉴权**：JWT（`jsonwebtoken`）+ bcrypt 密码哈希（`bcryptjs`，强度 12）
- **文件上传**：multer（图片 / 视频，上限 200MB）
- **商城前端**：Vue 3 + Vite + Element Plus（源码在 `feiyi-ecommerce/`）

---

## 快速开始（本地运行）

**前置条件**

1. **Node.js ≥ 18** —— <https://nodejs.org/>
2. **MySQL ≥ 8** —— 安装后确认服务已启动（Windows 服务名通常是 `MySQL90`）

**五步跑起来**

```bash
# 1. 准备配置文件（.env 不入库，必须自己建）
copy .env.example .env          # Windows cmd
cp .env.example .env            # Git Bash / macOS / Linux
```

打开 `.env`，至少改这两项：

```ini
DB_USER=root
DB_PASSWORD=你的MySQL密码        # 模板里是空的，不填连不上数据库
JWT_SECRET=一串随机长字符串      # 不设置会用不安全的开发默认密钥
```

<<<<<<< HEAD
=======
<<<<<<< HEAD
默认 `DB_MODE=mysql`。MySQL 不可用或初始化失败时，服务会停止启动，不会自动切换到 `database.json`，避免注册到一份存储后又从另一份存储登录而误报“用户名不存在”。只有明确需要 JSON 本地存储时，才设置 `DB_MODE=json`。

=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
# 2. 安装依赖（必做，见下方「依赖说明」）
npm install
# 国内网络慢可加镜像：
# npm install --registry=https://registry.npmmirror.com

# 3. 建库建表（自动创建 heritage 数据库，可重复执行）
npm run db:init

# 4. 导入演示数据（把 database.json 里的内容写进 MySQL）
npm run db:migrate

# 5. 启动
npm start
```

看到这段输出就成功了：

```
✅ 已连接 MySQL（heritage，8.x），载入用户 6 · 会话 5 · 消息 5 条
✅ 服务已启动，监听 0.0.0.0:3000
```

**访问地址**

- 主页 <http://localhost:3000/MainPage.html>
- 登录 <http://localhost:3000/login.html>
- 商城 <http://localhost:3000/shop/>

> **依赖说明**：⚠️ **必须执行 `npm install`**。
> 仓库里虽然残留了一份 `node_modules/`，但它是不同时期装出来的、版本互相错乱
> （`mysql2` 整个包缺失、`iconv-lite` 停在 0.4.x 而 mysql2 需要 ^0.7.3），
> 直接 clone 下来后端会报 `Cannot find module 'mysql2/promise'` 起不来。
> 执行一次 `npm install` 即可修正；`deploy/deploy.sh` 也会自动检测并补装。
>
> 商城的构建产物 `feiyi-ecommerce/dist/` 是**故意入库**的，所以 /shop/ 无需构建即可访问。
> 只有在你要改动商城源码（`feiyi-ecommerce/src/`）时，才需要 `cd feiyi-ecommerce && npm install && npm run build`，
> 并把重新生成的 `dist/` 一并提交。

---

## 演示账号

导入 `db:migrate` 之后自带这些账号，密码都是 `123456`：

| 用户名 | 角色 | 用途 |
| --- | --- | --- |
| `testuser` | 买家 | 登录用户中心 |
| `testdev` | 开发者 | 登录开发者中心 |
| `newuser` | 买家 | 第二个买家账号，用于测试双方对话 |
| `newdev` | 开发者 | 第二个开发者账号 |

> ⚠️ 这套账号仅用于本地开发与演示。**正式对外部署前必须删除或改掉密码。**

登录时**角色要选对**（买家账号选「买家」，开发者账号选「开发者」），选错会提示密码错误。

---

## 部署到云服务器

想让队友、老师或评委直接打开一个网址就能用，需要把服务部署到一台公网服务器上。

- **完整流程（含服务器选购、安全组、防火墙、上传代码、HTTPS）**：见 [`docs/云服务器部署-从零开始.md`](docs/云服务器部署-从零开始.md)
- **运维细节（PM2、Nginx、备份、上线检查清单）**：见 [`docs/DEPLOY.md`](docs/DEPLOY.md)
- **一键脚本**：`deploy/setup-server.sh`（装环境）、`deploy/deploy.sh`（部署应用）

> ⚠️ **重要**：不要让每个队友各自在自己电脑上跑一份服务。
> 每份服务背后是各自独立的 MySQL，账号和数据完全隔离，
> 结果是互相搜不到好友、也收不到对方消息。
> 要么所有人访问**同一台服务器**，要么在局域网里访问**同一台机器**。

---

## 常见问题

**Q：启动报「无法连接 MySQL，服务启动中止」？**
按提示依次检查：① MySQL 服务是否启动；② `.env` 里的 `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` 是否正确；③ 是否执行过 `npm run db:init` 和 `npm run db:migrate`。

**Q：访问 `/shop/` 返回 404？**
说明 `feiyi-ecommerce/dist/` 不存在。本仓库已包含该目录，若缺失请确认拉取完整，或自行构建（见上文「依赖说明」）。

**Q：加好友搜不到对方？**
如果对方是在**另一台电脑**上注册的账号，那是两套独立数据库，本来就互相搜不到——见上文「部署到云服务器」的提示。若在同一套数据里仍搜不到，请确认用户名拼写完整。

**Q：改了 `.env` 不生效？**
`.env` 只在进程启动时读取一次，改完必须重启服务。

**Q：端口 3000 被占用？**
改 `.env` 里的 `PORT`，或关掉占用该端口的程序。

---

## 目录结构

```
├── server.js                  # 后端入口（API + 静态页面托管，单文件）
├── ecosystem.config.js        # PM2 进程守护配置
├── nginx.conf.example         # Nginx 反向代理示例
├── .env.example               # 环境变量模板（复制为 .env 使用）
├── database.json              # 演示数据源（db:migrate 从这里导入）
├── db/
│   ├── init.js                # 建库 + 建表
│   ├── migrate.js             # database.json → MySQL
│   ├── schema.sql             # 表结构
│   ├── pool.js                # 连接池
│   └── store.js               # 内存缓存 + MySQL 写回
├── lib/env.js                 # 零依赖 .env 加载器
├── deploy/                    # 服务器一键脚本
├── docs/                      # 部署与运维文档
├── theme/                     # 全局样式（gufeng.css）
├── uploads/                   # 用户上传的图片/视频
└── feiyi-ecommerce/           # 商城前端（Vue 3 + Vite）
    ├── src/                   # 源码
    └── dist/                  # 构建产物（已入库，直接可访问 /shop/）
```
