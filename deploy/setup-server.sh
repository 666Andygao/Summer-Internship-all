#!/usr/bin/env bash
# ============================================================
#  华夏风物 · 非遗传承平台 —— 服务器环境一键安装
# ------------------------------------------------------------
#  适用：全新的 Linux 云服务器
#        · Ubuntu / Debian            （apt）
#        · Alibaba Cloud Linux 3      （dnf，RHEL 系）
#        · CentOS / Rocky / AlmaLinux （dnf，RHEL 系）
#
#  这个脚本做四件事：
#    1) 装 Node.js 18+ 、MySQL 8 、PM2
#    2) 建数据库 heritage 和专用数据库账号 heritage
#    3) 自动生成 .env（含随机 JWT 密钥与数据库密码）
#    4) 放行防火墙端口
#
#  用法（在项目根目录执行）：
#    sudo bash deploy/setup-server.sh
#
#  可选环境变量：
#    DB_NAME=heritage       数据库名
#    DB_USER=heritage       数据库账号
#    APP_PORT=3000          应用端口
#    NODE_VERSION=v22.11.0  Node.js 版本（默认 v22.11.0，LTS）
#    FORCE_ENV=1            覆盖已存在的 .env（默认不覆盖）
#
#  脚本可以重复执行，已装好的部分会自动跳过。
# ============================================================

set -euo pipefail

# ---------- 输出着色 ----------
if [ -t 1 ]; then
    C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_BLUE=$'\033[36m'; C_BOLD=$'\033[1m'; C_OFF=$'\033[0m'
else
    C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_BOLD=''; C_OFF=''
fi

step()  { echo; echo "${C_BLUE}${C_BOLD}==> $*${C_OFF}"; }
ok()    { echo "    ${C_GREEN}✓${C_OFF} $*"; }
warn()  { echo "    ${C_YELLOW}!${C_OFF} $*"; }
die()   { echo; echo "${C_RED}✗ $*${C_OFF}" >&2; exit 1; }

# ---------- 配置 ----------
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${DB_NAME:-heritage}"
DB_USER="${DB_USER:-heritage}"
APP_PORT="${APP_PORT:-3000}"
NODE_VERSION="${NODE_VERSION:-v22.11.0}"

echo "============================================"
echo "  华夏风物 · 服务器环境安装"
echo "============================================"
echo "  项目目录: $APP_DIR"
echo "  数据库:   $DB_NAME (账号 $DB_USER)"
echo "  应用端口: $APP_PORT"
echo

# ---------- 0. 前置检查 ----------
step "0/6 检查运行环境"

[ "$(id -u)" -eq 0 ] || die "需要 root 权限，请用：sudo bash deploy/setup-server.sh"

if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    ok "系统：$PRETTY_NAME"
else
    die "无法识别系统版本（找不到 /etc/os-release）"
fi

[ -f "$APP_DIR/server.js" ] || die "在 $APP_DIR 下找不到 server.js，请在项目根目录执行本脚本"

# 识别包管理器：apt（Ubuntu/Debian）或 dnf/yum（RHEL 系，含阿里云 Alinux、CentOS、Rocky）
if command -v apt-get >/dev/null 2>&1; then
    PKG="apt"
elif command -v dnf >/dev/null 2>&1; then
    PKG="dnf"
elif command -v yum >/dev/null 2>&1; then
    PKG="yum"
else
    die "未找到 apt-get / dnf / yum，无法自动安装依赖。请手动安装 Node.js 18+ 与 MySQL 8 后重试。"
fi
ok "包管理器：$PKG"

pkg_install() {
    case "$PKG" in
        apt) apt-get install -y -qq "$@" >/dev/null ;;
        *)   "$PKG" install -y -q "$@" >/dev/null ;;
    esac
}

# MySQL 服务名：Debian 系是 mysql，RHEL 系是 mysqld，MariaDB 则是 mariadb
MYSQL_SVC="mysql"
if [ "$PKG" != "apt" ]; then
    MYSQL_SVC="mysqld"
    if ! systemctl list-unit-files 2>/dev/null | grep -q '^mysqld\.service'; then
        if systemctl list-unit-files 2>/dev/null | grep -q '^mariadb\.service'; then
            MYSQL_SVC="mariadb"
        fi
    fi
fi

if [ "$PKG" = "apt" ]; then
    export DEBIAN_FRONTEND=noninteractive
fi

# ---------- 1. 基础工具 ----------
step "1/6 安装基础工具"

if [ "$PKG" = "apt" ]; then
    apt-get update -qq
    pkg_install curl ca-certificates gnupg xz-utils
else
    # makecache 失败不影响后续（可能只是某个源不可达）
    "$PKG" makecache -q >/dev/null 2>&1 || true
    pkg_install curl ca-certificates gnupg2 xz
fi
ok "curl / ca-certificates / xz 已就绪"

# ---------- 2. Node.js ----------
step "2/6 安装 Node.js ${NODE_VERSION}"

install_node() {
    local ver="$1" arch dest tmp tarball got=0

    case "$(uname -m)" in
        x86_64|amd64)   arch="x64" ;;
        aarch64|arm64)  arch="arm64" ;;
        *) die "不支持的 CPU 架构 $(uname -m)，请手动安装 Node.js 18+ 后重试" ;;
    esac

    dest="/usr/local/lib/nodejs"
    tarball="node-${ver}-linux-${arch}.tar.xz"
    tmp="$(mktemp -d)"

    # 先走国内镜像（服务器在境外/国内都够快），失败再回官方源
    for base in "https://npmmirror.com/mirrors/node" "https://nodejs.org/dist"; do
        echo "    下载: ${base}/${ver}/${tarball}"
        if curl -fsSL --connect-timeout 15 --max-time 600 "${base}/${ver}/${tarball}" -o "$tmp/$tarball"; then
            got=1
            break
        fi
    done
    [ "$got" -eq 1 ] || { rm -rf "$tmp"; die "Node.js 安装包下载失败（官方源与国内镜像都试过了）。请检查服务器能否访问外网。"; }

    mkdir -p "$dest"
    tar -xJf "$tmp/$tarball" -C "$dest"
    rm -rf "$tmp"

    NODE_DIR="$dest/node-${ver}-linux-${arch}"
    ln -sf "$NODE_DIR/bin/node" /usr/local/bin/node
    ln -sf "$NODE_DIR/bin/npm"  /usr/local/bin/npm
    ln -sf "$NODE_DIR/bin/npx"  /usr/local/bin/npx
    ln -sf "$NODE_DIR/bin/corepack" /usr/local/bin/corepack 2>/dev/null || true

    # 非登录 shell（cron / systemd / pm2 子进程）也要能找到 node
    mkdir -p /etc/profile.d
    printf 'export PATH="%s/bin:$PATH"\n' "$NODE_DIR" > /etc/profile.d/nodejs.sh
    chmod 644 /etc/profile.d/nodejs.sh
}

# 用官方二进制包而不是包管理器：NodeSource 不认识 alinux / Anolis，
# 而各发行版仓库里的 nodejs 版本普遍偏旧（RHEL 系常常只有 16.x，不满足 >=18）。
need_node=1
if command -v node >/dev/null 2>&1; then
    current="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "$current" -ge 18 ] 2>/dev/null; then
        ok "已安装 Node.js $(node -v)，跳过"
        need_node=0
    else
        warn "当前 Node.js $(node -v) 版本过低（需要 18+），将升级"
    fi
fi

if [ "$need_node" -eq 1 ]; then
    install_node "$NODE_VERSION"
    hash -r 2>/dev/null || true
    command -v node >/dev/null 2>&1 || die "Node.js 安装后仍找不到 node 命令，请检查 /usr/local/bin 是否在 PATH 中"
    ok "Node.js $(node -v) / npm $(npm -v) 安装完成"
fi

# ---------- 3. MySQL ----------
step "3/6 安装并启动 MySQL 8"

if command -v mysql >/dev/null 2>&1; then
    ok "MySQL 已安装，跳过"
else
    if [ "$PKG" = "apt" ]; then
        pkg_install mysql-server
    elif ! pkg_install mysql-server; then
        # 部分 RHEL 系镜像只提供 MariaDB，协议完全兼容本项目的 mysql2 驱动
        warn "mysql-server 安装失败，改用 MariaDB（与本项目完全兼容）"
        pkg_install mariadb-server
    fi
    ok "数据库服务已安装"
fi

systemctl enable "$MYSQL_SVC" >/dev/null 2>&1 || true
systemctl start  "$MYSQL_SVC" >/dev/null 2>&1 || true

# 等待 MySQL 真正可用（首次启动初始化需要几秒）
ready=0
for _ in $(seq 1 30); do
    if mysqladmin ping >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
done
[ "$ready" -eq 1 ] || die "MySQL 启动超时，请执行 systemctl status $MYSQL_SVC 查看原因"

MYSQL_VER="$(mysql --version 2>/dev/null | sed -E 's/.*Distrib ([^,]+).*/\1/' || true)"
[ -n "$MYSQL_VER" ] || MYSQL_VER="$(mysql --version 2>/dev/null | awk '{print $3}' || true)"
ok "MySQL 已启动（${MYSQL_VER:-未知版本}，服务名 $MYSQL_SVC）"

# ---------- 4. 建库 + 建账号 ----------
step "4/6 创建数据库与账号"

ENV_FILE="$APP_DIR/.env"
DB_PASSWORD=""

if [ -f "$ENV_FILE" ] && [ "${FORCE_ENV:-0}" != "1" ]; then
    ok "已存在 .env，沿用其中的数据库密码"
    DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
    DB_USER="$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- || echo "$DB_USER")"
fi

# 随机串统一用 node 生成：十六进制字符集不含 $ " ' \ 等会在 SQL / sed 里转义踩坑的字符，
# 也避免 `tr < /dev/urandom | head` 那种写法在 set -o pipefail 下被 SIGPIPE 判为失败。
rand_hex() { node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }

if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="$(rand_hex 12)"   # 24 位十六进制
    ok "已生成随机数据库密码"
fi

if ! mysql --protocol=socket <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
then
    die "创建数据库失败。若你的 root 账号设置了密码，请改用：mysql -u root -p 手动执行建库语句，或在 .env 中直接填写一个已有的数据库账号。"
fi
ok "数据库 \`${DB_NAME}\` 与账号 \`${DB_USER}\` 已就绪"

# ---------- 5. 生成 .env ----------
step "5/6 生成配置文件 .env"

if [ -f "$ENV_FILE" ] && [ "${FORCE_ENV:-0}" != "1" ]; then
    ok ".env 已存在，未覆盖（需要重建请加 FORCE_ENV=1）"
else
    [ -f "$APP_DIR/.env.example" ] || die "找不到 .env.example"
    cp "$APP_DIR/.env.example" "$ENV_FILE"

    JWT_SECRET="$(rand_hex 48)"    # 96 位十六进制
    PAY_TOKEN="$(rand_hex 16)"     # 32 位十六进制

    sed -i "s|^NODE_ENV=.*|NODE_ENV=production|"                          "$ENV_FILE"
    sed -i "s|^PORT=.*|PORT=${APP_PORT}|"                                 "$ENV_FILE"
    sed -i "s|^HOST=.*|HOST=0.0.0.0|"                                     "$ENV_FILE"
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|"                   "$ENV_FILE"
    sed -i "s|^PAYMENT_CALLBACK_TOKEN=.*|PAYMENT_CALLBACK_TOKEN=${PAY_TOKEN}|" "$ENV_FILE"
    sed -i "s|^DB_USER=.*|DB_USER=${DB_USER}|"                            "$ENV_FILE"
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|"                "$ENV_FILE"
    sed -i "s|^DB_NAME=.*|DB_NAME=${DB_NAME}|"                            "$ENV_FILE"
    # 经过 Nginx 反向代理，日志与限流需要真实客户端 IP
    sed -i "s|^TRUST_PROXY=.*|TRUST_PROXY=1|"                             "$ENV_FILE"

    chmod 600 "$ENV_FILE"
    ok "已生成 .env（JWT 密钥与数据库密码均为随机生成，权限 600）"
fi

# ---------- 6. PM2 + 防火墙 ----------
step "6/6 安装 PM2 并放行端口"

# npm 全局安装的命令落在 Node 自己的 bin 目录里，而那个目录不在系统 PATH 上。
# node / npm / npx 是前面手动链接到 /usr/local/bin 的，pm2 是装完之后才出现的，
# 必须在这里再链一次，否则脚本自己后面都调不到 pm2。
link_npm_globals() {
    local bin_dir
    bin_dir="$(npm prefix -g 2>/dev/null)/bin"
    [ -d "$bin_dir" ] || return 0
    local f
    for f in "$bin_dir"/*; do
        [ -e "$f" ] || continue
        ln -sf "$f" "/usr/local/bin/$(basename "$f")"
    done
    # 非登录 shell（cron / systemd）也要能找到 pm2
    printf 'export PATH="%s:$PATH"\n' "$bin_dir" >> /etc/profile.d/nodejs.sh
}

if command -v pm2 >/dev/null 2>&1; then
    ok "PM2 已安装，跳过"
else
    # npm 官方源在国内服务器上经常很慢，先试镜像
    npm install -g pm2 --registry="${NPM_REGISTRY:-https://registry.npmmirror.com}" >/dev/null 2>&1 \
        || npm install -g pm2 >/dev/null 2>&1 \
        || die "PM2 安装失败，请手动执行：npm install -g pm2"
    link_npm_globals
    hash -r 2>/dev/null || true
    command -v pm2 >/dev/null 2>&1 \
        || die "PM2 已安装但命令不在 PATH 上，请手动执行：ln -sf \"\$(npm prefix -g)/bin/pm2\" /usr/local/bin/pm2"
    ok "PM2 $(pm2 -v) 安装完成"
fi

# 防火墙：云上有两道关卡，这里是服务器内部那道。
# RHEL 系通常用 firewalld，Ubuntu 用 ufw，两者都没有就跳过（由云平台安全组兜底）。
FIREWALL_DONE=0
if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld 2>/dev/null; then
    for p in 22 80 443 "$APP_PORT"; do
        firewall-cmd --permanent --add-port="${p}/tcp" >/dev/null 2>&1 || true
    done
    firewall-cmd --reload >/dev/null 2>&1 || true
    FIREWALL_DONE=1
    ok "已放行 22 / 80 / 443 / ${APP_PORT} 端口（firewalld）"
elif command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp   >/dev/null 2>&1 || true
    ufw allow 80/tcp   >/dev/null 2>&1 || true
    ufw allow 443/tcp  >/dev/null 2>&1 || true
    ufw allow "${APP_PORT}/tcp" >/dev/null 2>&1 || true
    FIREWALL_DONE=1
    ok "已放行 22 / 80 / 443 / ${APP_PORT} 端口（ufw）"
fi

if [ "$FIREWALL_DONE" -eq 0 ]; then
    warn "未检测到正在运行的 firewalld / ufw，跳过服务器内防火墙配置"
    warn "只要云控制台的「安全组」放行了端口，同样可以访问"
fi

# ---------- 完成 ----------
echo
echo "============================================"
echo "  ${C_GREEN}环境安装完成${C_OFF}"
echo "============================================"
echo
echo "  系统:    ${PRETTY_NAME:-未知}"
echo "  数据库:  ${DB_NAME}   账号: ${DB_USER}"
echo "  配置:    ${ENV_FILE}"
echo
echo "  ${C_BOLD}下一步：${C_OFF}"
echo "    bash deploy/deploy.sh"
echo
echo "  ⚠️  还要记得在云服务商控制台的「安全组」里放行 ${APP_PORT} 端口（80 / 443 如需域名访问）"
echo "      安全组是云平台层的防火墙，和服务器里的 firewalld / ufw 是两道独立的关卡。"
echo
