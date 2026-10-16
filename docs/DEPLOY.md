# 后端部署与运维指南

> 本文档说明如何把「华夏风物志」后端从本地开发环境部署到公网服务器。
> 内容涵盖：环境准备 → 数据库初始化 → 服务启动 → 进程守护 → 反向代理 → 备份 → 上线检查。
>
> **第一次部署？** 先看 [`云服务器部署-从零开始.md`](云服务器部署-从零开始.md)，
> 那份是从买服务器讲起的手把手版本；本文档偏运维细节，适合已经跑起来之后查阅。
> 想省掉手动配置，可直接用 `deploy/setup-server.sh` + `deploy/deploy.sh` 两个脚本。

---

## 一、环境要求

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | 18 及以上 | 运行后端服务（开发机实测 26.5.0） |
| MySQL | 8.0 及以上 | 数据持久化（开发机实测 9.0.1） |
| PM2 | 最新版 | 进程守护，崩溃自动重启 |
| Nginx | 最新版 | 反向代理（可选，但生产推荐） |

安装 PM2：
```bash
npm install -g pm2
```

---

## 二、本地启动（开发）

```bash
# 1. 准备配置：复制模板并填写数据库密码等
copy .env.example .env        # Windows
cp .env.example .env          # Linux / macOS
# 编辑 .env，至少修改 JWT_SECRET 与 DB_PASSWORD

# 2. 初始化数据库（自动建库 + 建表，可重复执行）
node db/init.js

# 3. 导入现有数据（首次从 database.json 迁移；--force 会先清空目标表）
node db/migrate.js

# 4. 启动服务
node server.js
# 或使用一键脚本（Windows）
start-server.bat
```

> **无需 `npm install`**：本仓库已把 `node_modules/` 与商城构建产物 `feiyi-ecommerce/dist/`
> 一并提交，clone 下来即可运行。只有在你要改动商城源码时才需要重新构建。

启动成功会输出：
```
✅ 已连接 MySQL（heritage，9.0.1），载入用户 6 · 会话 5 · 消息 5 条
✅ 服务已启动，监听 0.0.0.0:3000
```

访问：
- 主页 `http://localhost:3000/MainPage.html`
- 登录 `http://localhost:3000/login.html`
- 商城 `http://localhost:3000/shop/`

> **商城 404？** 说明 `feiyi-ecommerce/dist/` 缺失（该构建产物已入库，正常 clone 就有）。
> 若确实缺失，可在 `feiyi-ecommerce` 目录执行 `npm install && npm run build`（或双击 `build-shop.bat`）重新生成。

---

## 三、生产部署（Linux 服务器）

### 3.1 上传代码与安装依赖

```bash
# 建议部署到 /var/www/heritage
cd /var/www/heritage
npm install --production     # 只装运行时依赖
```

> 若服务器无法访问 npm 官方源，可临时指定国内镜像：
> `npm install --registry=https://mirrors.huaweicloud.com/repository/npm/`

### 3.2 配置环境变量

```bash
cp .env.example .env
nano .env
```

**生产环境必须修改以下几项：**

```ini
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# ★ 必须换成随机长字符串，否则令牌可被伪造
JWT_SECRET=<执行下面命令生成>
PAYMENT_CALLBACK_TOKEN=<随机字符串>

# 前后端同域名部署时留空（最安全）
CORS_ORIGIN=

# 密码哈希强度与反向代理
BCRYPT_COST=12
TRUST_PROXY=1

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=heritage
DB_PASSWORD=<你的数据库密码>
DB_NAME=heritage
```

生成随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**建议为项目创建独立数据库账号**（不要用 root）：
```sql
CREATE USER 'heritage'@'localhost' IDENTIFIED BY '你的密码';
CREATE DATABASE heritage DEFAULT CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON heritage.* TO 'heritage'@'localhost';
FLUSH PRIVILEGES;
```

### 3.3 初始化数据库并迁移数据

```bash
node db/init.js
node db/migrate.js
```

### 3.4 用 PM2 守护进程

```bash
mkdir -p logs              # PM2 日志目录
pm2 start ecosystem.config.js
pm2 status                 # 应显示 heritage-api 为 online
pm2 logs heritage-api      # 查看实时日志

pm2 save                   # 保存进程列表
pm2 startup                # 生成开机自启脚本，按提示执行输出的那条命令
```

### 3.5 配置 Nginx 反向代理

```bash
sudo cp nginx.conf.example /etc/nginx/conf.d/heritage.conf
sudo nano /etc/nginx/conf.d/heritage.conf   # 改 server_name 与静态资源路径
sudo nginx -t                                # 测试语法
sudo systemctl reload nginx
```

配置要点：
- `client_max_body_size 220m` —— 消息中心支持发送视频，需大于 Node 端的 200MB 限制
- 静态资源（`/shop/assets/`、`/uploads/`）由 Nginx 直接返回，减轻 Node 压力

### 3.6 启用 HTTPS（推荐）

登录密码、JWT 令牌、私信在 HTTP 下是明文传输，公网部署务必启用 HTTPS：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

certbot 会自动改写 Nginx 配置、申请证书并配置续期。之后在 `.env` 中设置：
```ini
TRUST_PROXY=1        # 让访问日志记录真实客户端 IP
```

---

## 四、数据备份

### 4.1 手动备份

```bash
mysqldump -u heritage -p heritage > backup_$(date +%F).sql
```

### 4.2 定时自动备份（每天凌晨 3 点，保留 7 天）

```bash
crontab -e
```
加入：
```cron
0 3 * * * mysqldump -u heritage -p'你的密码' heritage > /var/backups/heritage_$(date +\%F).sql && find /var/backups -name 'heritage_*.sql' -mtime +7 -delete
```

### 4.3 恢复

```bash
mysql -u heritage -p heritage < backup_2026-08-20.sql
```

---

## 五、上线前检查清单

- [ ] `.env` 中 `JWT_SECRET` 已改为随机长字符串（**不是**默认值，且**不要复用开发机 `.env` 里的值**）
- [ ] `.env` 中 `DB_PASSWORD` 已设置，且数据库账号不是 root
- [ ] `.env` 已被 `.gitignore` 忽略，**未提交到仓库**
- [ ] `NODE_ENV=production`
- [ ] 经 Nginx 部署时 `TRUST_PROXY=1`（否则限流与日志拿到的是代理 IP，防爆破会失效）
- [ ] 已执行 `node db/init.js` 与 `node db/migrate.js`
- [ ] PM2 进程为 online，且已 `pm2 save` + `pm2 startup`
- [ ] Nginx 已配置并成功反代
- [ ] 已验证敏感文件不可访问：`curl -I http://你的域名/database.json` 应返回 **404**
- [ ] 健康检查可用：`curl http://你的域名/api/health` 返回 `"status":"ok"`
- [ ] **已执行 `git rm --cached database.json`** 并提交（该文件含真实用户密码哈希，不应继续被仓库跟踪）
- [ ] 演示账号（`testuser`/`testdev` 等）的默认密码已修改或删除
- [ ] 已配置数据库定时备份
- [ ] **已启用 HTTPS**（登录密码、JWT 令牌、私信在 HTTP 下明文传输，公网部署为必要条件）

---

## 六、常见问题

| 现象 | 原因与解决 |
| --- | --- |
| 启动报 `无法连接 MySQL` | 检查 MySQL 服务是否启动、`.env` 中 DB_* 配置是否正确；执行 `node db/init.js` 确认能连通 |
| 启动报 `端口 3000 已被占用` | 用 `netstat -ano \| findstr :3000`（Windows）或 `lsof -i:3000`（Linux）找到占用进程并关闭，或改 `PORT` |
| 访问 `/shop/` 返回 404 | 商城未构建。在 `feiyi-ecommerce` 目录执行 `npm install && npm run build` |
| 页面能打开但登录报"未连接服务器" | 必须通过 `http://域名/login.html` 访问，不能直接双击 HTML 文件（`file://` 协议无法访问后端） |
| 数据写入后重启丢失 | 检查启动日志是否有"数据持久化到 MySQL 失败"，通常是数据库连接中断 |
| 日志看不到真实客户端 IP | 在 `.env` 中设置 `TRUST_PROXY=1`（需配合 Nginx 的 `X-Forwarded-For` 头） |

---

## 七、日常运维命令

```bash
pm2 status                  # 查看服务状态
pm2 logs heritage-api       # 实时日志
pm2 logs heritage-api --lines 200   # 最近 200 行
pm2 restart heritage-api    # 重启
pm2 stop heritage-api       # 停止
pm2 monit                   # 资源占用监控
```

查看数据库：
```bash
mysql -u heritage -p heritage
> SELECT COUNT(*) FROM users;
> SELECT id, username, display_name FROM users;
```

---

## 八、架构说明（数据层）

本项目数据层采用 **「内存缓存 + MySQL 持久化」** 模式（见 `db/store.js`）：

- **启动时**：`store.init()` 从 MySQL 全量载入数据到内存
- **读取**：`loadDB()` 同步返回内存数据（保持原有同步语义）
- **写入**：`saveDB()` 更新内存，并**只把发生变化的表**同步回 MySQL（串行队列保证顺序）
- **关闭时**：优雅关闭会等待 `store.flush()`，确保内存变更全部落库

**这样设计的原因**：现有业务代码有 200+ 处同步数据操作，全部改成异步 SQL 查询风险高、工作量大。
兼容层让数据真正落在 MySQL（可备份、可 SQL 查询、可被其他系统读取），同时业务代码零改动。

**局限**：仅支持单进程部署（`ecosystem.config.js` 中 `instances: 1`）。若未来需要多实例或更高并发，
可按 `db/TABLES` 中已定义的字段映射，逐步把热点端点改为直接异步 SQL 查询。
