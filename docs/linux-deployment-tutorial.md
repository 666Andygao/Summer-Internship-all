# 华夏风物 · 非遗传承电商平台 - Linux 服务器 Maven 打包部署完整教程

> 适用环境: Ubuntu 20.04/22.04 / CentOS 7/8 / 阿里云 ECS / 腾讯云 CVM
> 部署方式: Spring Boot Jar 包 + systemd 常驻运行 + Nginx 反向代理

---

## 一、服务器环境准备

### 1.1 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ | 推荐 Ubuntu 22.04 LTS |
| 内存 | 最低 2GB，推荐 4GB+ | MySQL + Java 同时运行 |
| 磁盘 | 最低 20GB | 系统 + 应用 + 上传文件 |
| 带宽 | 最低 3Mbps | 推荐 5Mbps+ |
| Java | OpenJDK 17 | Spring Boot 运行环境 |
| MySQL | 8.0+ | 业务数据库 |
| Nginx | 1.22+ | 反向代理 + 静态资源 |

### 1.2 服务器初始化

```bash
# 以 root 用户登录服务器
ssh root@your-server-ip

# 更新系统
sudo apt update && sudo apt upgrade -y   # Ubuntu
# sudo yum update -y                     # CentOS

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 创建应用用户 (非 root 运行更安全)
sudo useradd -r -s /bin/false heritage
sudo mkdir -p /opt/heritage-ecommerce
sudo chown heritage:heritage /opt/heritage-ecommerce
```

### 1.3 安装 JDK 17

**Ubuntu 系统:**
```bash
sudo apt install openjdk-17-jdk -y

# 验证
java -version
# 输出: openjdk version "17.0.x" ...
javac -version
# 输出: javac 17.0.x
```

**CentOS 系统:**
```bash
sudo yum install java-17-openjdk -y

# 或从 Oracle 官网下载
sudo wget https://download.oracle.com/java/17/latest/jdk-17_linux-x64_bin.tar.gz
sudo tar -xzf jdk-17_linux-x64_bin.tar.gz -C /usr/local/java/
sudo ln -s /usr/local/java/jdk-17* /usr/local/java/current

# 配置环境变量
sudo vim /etc/profile.d/java.sh
# 添加:
# export JAVA_HOME=/usr/local/java/current
# export PATH=$JAVA_HOME/bin:$PATH

source /etc/profile.d/java.sh
java -version
```

### 1.4 安装 MySQL 8.0

```bash
# Ubuntu 安装 MySQL
sudo apt install mysql-server -y

# 启动并设置开机自启
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全初始化 (设置 root 密码、移除匿名用户等)
sudo mysql_secure_installation
# 按提示操作，建议:
# - 设置 root 密码: YOUR_STRONG_PASSWORD
# - 移除匿名用户: Y
# - 禁止 root 远程登录: Y (如需远程管理选 N)
# - 移除测试数据库: Y
# - 重新加载权限表: Y
```

**创建业务数据库:**
```bash
sudo mysql -u root -p

CREATE DATABASE heritage_ecommerce
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'heritage'@'localhost' IDENTIFIED BY 'YOUR_DB_PASSWORD';
GRANT ALL PRIVILEGES ON heritage_ecommerce.* TO 'heritage'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**执行初始化 SQL:**
```bash
# 上传 SQL 文件后执行
sudo mysql -u heritage -p heritage_ecommerce < /opt/heritage-ecommerce/sql/init_heritage_ecommerce.sql
```

### 1.5 安装 Nginx

```bash
sudo apt install nginx -y       # Ubuntu
# sudo yum install nginx -y    # CentOS

sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 开放防火墙端口

```bash
# Ubuntu UFW
sudo ufw allow 80/tcp          # HTTP (Nginx)
sudo ufw allow 443/tcp         # HTTPS
sudo ufw allow 3306/tcp        # MySQL (仅远程管理时)
sudo ufw allow 8080/tcp        # Spring Boot (仅调试时)
sudo ufw enable

# CentOS firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 云平台安全组 (阿里云/腾讯云/AWS)
# 在控制台安全组中开放: 80, 443, 22
```

---

## 二、本地 Maven 打包

### 2.1 开发机环境

确保本地开发机已安装:
- JDK 17 (`java -version`)
- Maven 3.8+ (`mvn -version`)
- Git (`git --version`)

### 2.2 配置 Maven 国内镜像 (推荐)

编辑 `~/.m2/settings.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
  <profiles>
    <profile>
      <id>jdk-17</id>
      <activation>
        <jdk>17</jdk>
      </activation>
    </profile>
  </profiles>
</settings>
```

### 2.3 执行打包

```bash
cd c:\Users\LENOVO\Desktop\Summer-Internship-all\heritage-ecommerce-springboot

# 清理并打包 (跳过测试，速度更快)
mvn clean package -DskipTests

# 如果需要运行测试
mvn clean package

# 查看产物
ls -lh target/
# 输出: heritage-ecommerce-0.0.1-SNAPSHOT.jar (~40MB)
```

### 2.4 配置生产环境参数

在 `heritage-ecommerce-springboot/src/main/resources/application.yml` 中修改:

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/heritage_ecommerce?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=true
    username: heritage
    password: YOUR_DB_PASSWORD

jwt:
  secret: YOUR_PRODUCTION_JWT_SECRET_KEY_AT_LEAST_32_CHARS
  expiration: 86400000

upload:
  base-path: /opt/heritage-ecommerce/uploads
```

---

## 三、部署到服务器

### 3.1 上传 Jar 包

```bash
# 方式一: scp 上传
scp target/heritage-ecommerce-0.0.1-SNAPSHOT.jar heritage@your-server-ip:/opt/heritage-ecommerce/

# 方式二: 使用 rsync (支持断点续传)
rsync -avz --progress target/heritage-ecommerce-0.0.1-SNAPSHOT.jar heritage@your-server-ip:/opt/heritage-ecommerce/

# 方式三: 通过 Git 仓库
# 在服务器上:
cd /opt/heritage-ecommerce
git clone https://github.com/your-username/heritage-ecommerce.git
cd heritage-ecommerce-springboot
mvn clean package -DskipTests
cp target/heritage-ecommerce-0.0.1-SNAPSHOT.jar /opt/heritage-ecommerce/
```

### 3.2 创建配置文件

在服务器上创建生产环境配置:
```bash
sudo mkdir -p /opt/heritage-ecommerce/config
sudo mkdir -p /opt/heritage-ecommerce/uploads
sudo mkdir -p /opt/heritage-ecommerce/logs
```

创建生产环境配置文件 `/opt/heritage-ecommerce/config/application-prod.yml`:
```yaml
server:
  port: 8080

spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/heritage_ecommerce?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai&useSSL=true&allowPublicKeyRetrieval=true
    username: heritage
    password: YOUR_SECURE_DB_PASSWORD
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 50MB

mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.heritage.ecommerce.entity
  configuration:
    map-underscore-to-camel-case: false

pagehelper:
  helper-dialect: mysql
  reasonable: true

jwt:
  secret: CHANGE_ME_TO_A_SECURE_RANDOM_STRING_32CHARS_MINIMUM
  expiration: 86400000
  header: Authorization
  token-prefix: "Bearer "

upload:
  base-path: /opt/heritage-ecommerce/uploads

logging:
  level:
    com.heritage.ecommerce: INFO
    org.mybatis: WARN
    org.springframework: WARN
  file:
    name: /opt/heritage-ecommerce/logs/heritage-ecommerce.log
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

### 3.3 手工测试启动

```bash
# 切换到应用用户
sudo su - heritage

# 测试运行 (前台方式，便于观察日志)
cd /opt/heritage-ecommerce
java -jar heritage-ecommerce-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --spring.config.additional-location=file:./config/

# 观察启动日志，看到以下输出表示成功:
# Started HeritageEcommerceApplication in X.XX seconds
# ...
```

使用 `Ctrl+C` 停止测试。

---

## 四、配置 systemd 后台常驻运行

### 4.1 创建 systemd 服务

```bash
sudo vim /etc/systemd/system/heritage-ecommerce.service
```

写入以下内容:
```ini
[Unit]
Description=Heritage E-Commerce Backend Service
After=network.target mysql.service
Wants=network.target

[Service]
Type=simple
User=heritage
Group=heritage
WorkingDirectory=/opt/heritage-ecommerce
ExecStart=/usr/bin/java -jar /opt/heritage-ecommerce/heritage-ecommerce-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod --spring.config.additional-location=file:./config/
ExecStop=/bin/kill -SIGTERM $MAINPID
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=heritage-ecommerce

# 资源限制
LimitNOFILE=65536
NProcLimit=4096

# 环境变量
Environment="JAVA_OPTS=-Xms512m -Xmx2048m -XX:+UseG1GC"
Environment="SPRING_PROFILES_ACTIVE=prod"

[Install]
WantedBy=multi-user.target
```

### 4.2 启动服务

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start heritage-ecommerce

# 查看状态
sudo systemctl status heritage-ecommerce
# 输出: Active: active (running) since ...

# 设置开机自启
sudo systemctl enable heritage-ecommerce

# 查看日志
sudo journalctl -u heritage-ecommerce -f
# 或查看应用日志
tail -f /opt/heritage-ecommerce/logs/heritage-ecommerce.log
```

### 4.3 常用运维命令

```bash
# 启动
sudo systemctl start heritage-ecommerce

# 停止
sudo systemctl stop heritage-ecommerce

# 重启
sudo systemctl restart heritage-ecommerce

# 查看状态
sudo systemctl status heritage-ecommerce

# 实时查看日志
sudo journalctl -u heritage-ecommerce -f

# 查看最近 100 行日志
sudo journalctl -u heritage-ecommerce -n 100

# 查看错误日志
sudo journalctl -u heritage-ecommerce -p err -n 50

# 查看服务进程
ps aux | grep heritage-ecommerce
```

### 4.4 验证接口

```bash
# 健康检查
curl http://localhost:8080/api/actuator/health

# 登录接口
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456","role":"admin"}'

# 获取商品列表
curl http://localhost:8080/api/products/list
```

---

## 五、Nginx 反向代理配置

### 5.1 基础反向代理

```bash
sudo vim /etc/nginx/sites-available/heritage-ecommerce.conf
```

写入:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 上传文件大小限制
    client_max_body_size 50m;

    # 代理到 Spring Boot 后端
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 60s;
    }

    # 上传文件直接由 Nginx 服务
    location /uploads/ {
        alias /opt/heritage-ecommerce/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /opt/heritage-ecommerce/uploads;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 5.2 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/heritage-ecommerce.conf /etc/nginx/sites-enabled/

# 检查配置
sudo nginx -t
# 输出: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 5.3 配置 HTTPS (推荐)

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加:
# 0 3 * * * certbot renew --quiet
```

---

## 六、版本更新与回滚

### 6.1 版本更新流程

```bash
# 1. 本地打包新版本
cd heritage-ecommerce-springboot
mvn clean package -DskipTests

# 2. 备份当前版本
sudo cp /opt/heritage-ecommerce/heritage-ecommerce-0.0.1-SNAPSHOT.jar \
         /opt/heritage-ecommerce/backup/heritage-ecommerce-$(date +%Y%m%d%H%M%S).jar

# 3. 上传新版本
scp target/heritage-ecommerce-0.0.1-SNAPSHOT.jar heritage@your-server-ip:/opt/heritage-ecommerce/

# 4. 重启服务
sudo systemctl restart heritage-ecommerce

# 5. 验证
curl http://localhost:8080/api/actuator/health
# 检查日志
tail -f /opt/heritage-ecommerce/logs/heritage-ecommerce.log
```

### 6.2 一键更新脚本

创建 `/opt/heritage-ecommerce/deploy.sh`:
```bash
#!/bin/bash
set -e

APP_NAME="heritage-ecommerce"
APP_DIR="/opt/heritage-ecommerce"
BACKUP_DIR="$APP_DIR/backup"
JAR_NAME="heritage-ecommerce-0.0.1-SNAPSHOT.jar"

echo "=== 非遗电商平台部署脚本 ==="
echo "时间: $(date)"

# 备份旧版本
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
if [ -f "$APP_DIR/$JAR_NAME" ]; then
    cp "$APP_DIR/$JAR_NAME" "$BACKUP_DIR/${APP_NAME}-${TIMESTAMP}.jar"
    echo "✓ 已备份旧版本至 $BACKUP_DIR/${APP_NAME}-${TIMESTAMP}.jar"
fi

# 停止服务
echo "⏹ 停止服务..."
systemctl stop heritage-ecommerce
sleep 3

# 替换 Jar
echo "📦 替换 Jar 包..."
cp "$JAR_NAME" "$APP_DIR/"

# 启动服务
echo "▶ 启动服务..."
systemctl start heritage-ecommerce

# 等待启动
sleep 10

# 验证
if systemctl is-active --quiet heritage-ecommerce; then
    echo "✓ 服务启动成功!"
    echo "服务状态: $(systemctl status heritage-ecommerce | grep Active)"
else
    echo "✗ 服务启动失败，请检查日志:"
    journalctl -u heritage-ecommerce -n 50
    exit 1
fi

# 清理旧备份 (保留最近 5 份)
cd "$BACKUP_DIR" && ls -t *.jar | tail -n +6 | xargs -r rm --
echo "✓ 已清理旧备份"

echo "=== 部署完成 ==="
```

```bash
# 使用方法
chmod +x /opt/heritage-ecommerce/deploy.sh
sudo ./deploy.sh
```

### 6.3 回滚流程

```bash
# 查看备份历史
ls -lh /opt/heritage-ecommerce/backup/

# 回滚到指定版本
sudo cp /opt/heritage-ecommerce/backup/heritage-ecommerce-20260818120000.jar \
         /opt/heritage-ecommerce/heritage-ecommerce-0.0.1-SNAPSHOT.jar

# 重启服务
sudo systemctl restart heritage-ecommerce

# 验证
curl http://localhost:8080/api/actuator/health
```

---

## 七、安全加固

### 7.1 防火墙规则

```bash
# 只允许必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH (建议改端口)
sudo ufw allow 80/tcp      # HTTP (Nginx)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### 7.2 SSH 安全

```bash
# 编辑 SSH 配置
sudo vim /etc/ssh/sshd_config

# 修改:
Port 2222                    # 修改默认端口
PermitRootLogin no           # 禁止 root 登录
PasswordAuthentication no    # 使用密钥认证
MaxAuthTries 3               # 最大尝试次数

# 重启 SSH
sudo systemctl restart sshd
```

### 7.3 MySQL 安全

```bash
# 限制远程访问
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf
# 修改 bind-address = 127.0.0.1

# 删除匿名用户和测试库
sudo mysql -u root -p -e "
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost','127.0.0.1');
DROP DATABASE IF EXISTS test;
FLUSH PRIVILEGES;
"
```

### 7.4 定期安全检查

```bash
# 系统更新 (每周执行)
sudo apt update && sudo apt upgrade -y

# 安全补丁检查
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades

# 日志审计
sudo vim /var/log/auth.log
```

---

## 八、监控与告警

### 8.1 应用健康检查

```bash
# 创建健康检查脚本
sudo vim /opt/heritage-ecommerce/health-check.sh
```

```bash
#!/bin/bash
# 健康检查脚本 - 每 5 分钟执行一次

HEALTH_URL="http://localhost:8080/api/actuator/health"
LOG_FILE="/opt/heritage-ecommerce/logs/health-check.log"
ALERT_EMAIL="admin@your-domain.com"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
CURRENT_TIME=$(date "+%Y-%m-%d %H:%M:%S")

if [ "$RESPONSE" = "200" ]; then
    echo "$CURRENT_TIME ✓ 服务正常 (HTTP $RESPONSE)" >> "$LOG_FILE"
else
    echo "$CURRENT_TIME ✗ 服务异常 (HTTP $RESPONSE)" >> "$LOG_FILE"
    # 自动重启
    systemctl restart heritage-ecommerce
    # 发送告警邮件 (需配置 mail)
    # echo "服务器服务异常，已自动重启" | mail -s "非遗电商告警" $ALERT_EMAIL
fi

# 限制日志大小
MAX_LOG_SIZE=10485760  # 10MB
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE")" -gt "$MAX_LOG_SIZE" ]; then
    mv "$LOG_FILE" "${LOG_FILE}.$(date +%s)"
fi
```

```bash
# 添加到 crontab
sudo crontab -e
# 添加:
# */5 * * * * /opt/heritage-ecommerce/health-check.sh
```

### 8.2 资源监控

```bash
# 查看系统资源
top -bn1 | head -20

# 查看 Java 进程内存
jmap -heap $(pgrep -f heritage-ecommerce)

# 查看磁盘使用
df -h
du -sh /opt/heritage-ecommerce/uploads/

# 查看连接数
ss -s
netstat -ant | grep 8080 | wc -l
```

### 8.3 日志轮转

```bash
# 配置 logrotate
sudo vim /etc/logrotate.d/heritage-ecommerce
```

```
/opt/heritage-ecommerce/logs/*.log {
    daily
    rotate 30
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    maxsize 100M
}
```

---

## 九、故障排查速查表

| 故障现象 | 可能原因 | 排查命令 / 解决方案 |
|---------|---------|-------------------|
| 服务启动失败 | 数据库连接失败 | `mysql -u heritage -p` 测试连接 |
| 服务启动失败 | 端口被占用 | `lsof -i:8080` 或 `netstat -tlnp \| grep 8080` |
| 服务启动失败 | 内存不足 | 调整 `JAVA_OPTS` 中 `-Xms` 和 `-Xmx` |
| 接口 502 Bad Gateway | Nginx 后端未启动 | `systemctl status heritage-ecommerce` |
| 接口超时 | 网络或后端处理慢 | 检查 `proxy_read_timeout` 和后端 GC 日志 |
| 登录 Token 失效 | 服务器时间不准 | `timedatectl` 同步时间 |
| 文件上传失败 | Nginx 限制 | 修改 `client_max_body_size` |
| 上传文件访问 404 | 路径配置错误 | 检查 `upload.base-path` 和 Nginx `alias` |
| 数据库慢查询 | 索引缺失 | 参考 `sql/index-optimization.sql` 添加索引 |
| 内存持续增长 | 内存泄漏 | 使用 `jmap -dump:format=b,file=heap.hprof PID` 分析 |

---

## 十、完整部署检查清单

部署前确认:
- [ ] JDK 17 已安装
- [ ] MySQL 8.0 已安装并配置
- [ ] 数据库 `heritage_ecommerce` 已创建
- [ ] 初始化 SQL 已执行
- [ ] 应用配置文件已正确设置 (密码、密钥等)
- [ ] Jar 包已上传到服务器
- [ ] systemd 服务已配置
- [ ] Nginx 反向代理已配置
- [ ] HTTPS 证书已配置 (生产环境)
- [ ] 防火墙已开放必要端口
- [ ] 健康检查脚本已配置
- [ ] 日志轮转已配置
- [ ] 安全加固已完成 (SSH、MySQL、防火墙)
- [ ] 版本更新脚本已准备

部署后验证:
- [ ] `systemctl status heritage-ecommerce` 显示 active (running)
- [ ] `curl http://localhost:8080/api/actuator/health` 返回 200
- [ ] `curl http://your-domain.com/api/auth/login` 可正常访问
- [ ] 后台管理员账号可正常登录
- [ ] 商品列表、订单创建、支付等核心接口正常
- [ ] 上传文件可正常访问
- [ ] 日志无 ERROR 级别异常
- [ ] 服务器资源充足 (内存 > 512MB 空闲)