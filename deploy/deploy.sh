#!/usr/bin/env bash
# ============================================================
#  华夏风物 · 非遗传承平台 —— 一键部署 / 更新
# ------------------------------------------------------------
#  前置：已经执行过 deploy/setup-server.sh（装好 Node / MySQL / PM2）
#
#  用法（在项目根目录执行）：
#    bash deploy/deploy.sh              # 部署或更新
#    SKIP_SEED=1 bash deploy/deploy.sh  # 不导入演示数据（用空库上线）
#    FORCE_SEED=1 bash deploy/deploy.sh # 清空后重新导入演示数据（会删数据！）
#
#  脚本可以重复执行：再次执行即为「更新部署」。
# ============================================================

set -euo pipefail

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

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

APP_NAME="heritage-api"

echo "============================================"
echo "  华夏风物 · 部署"
echo "============================================"
echo "  项目目录: $APP_DIR"
echo

# ---------- 1. 前置检查 ----------
step "1/5 检查前置条件"

command -v node >/dev/null 2>&1 || die "未找到 node，请先执行：sudo bash deploy/setup-server.sh"
ok "Node.js $(node -v)"

command -v mysqladmin >/dev/null 2>&1 && mysqladmin ping >/dev/null 2>&1 \
    || die "MySQL 未运行。Ubuntu 上执行 sudo systemctl start mysql，RHEL/阿里云 Alinux 上服务名是 mysqld"
ok "MySQL 正在运行"

[ -f "$APP_DIR/.env" ] || die "找不到 .env。请先执行：sudo bash deploy/setup-server.sh"
# 密钥还是模板里的占位符说明没配置过，上公网会被人伪造令牌
if grep -q '^JWT_SECRET=CHANGE_ME' "$APP_DIR/.env"; then
    die ".env 里的 JWT_SECRET 还是模板占位符。请改成随机长字符串，或执行：sudo bash deploy/setup-server.sh"
fi
ok ".env 已配置"

# PM2 目录（ecosystem.config.js 里把日志写到这里）
mkdir -p "$APP_DIR/logs"

# ---------- 2. 建库建表 ----------
step "2/5 初始化数据库结构"
node db/init.js
ok "表结构已就绪"

# ---------- 3. 导入演示数据 ----------
step "3/5 导入演示数据"

# 用 users 表是否有数据来判断是否已经初始化过
seeded="$(node -e "
require('./lib/env').load();
const { getPool } = require('./db/pool');
getPool().query('SELECT COUNT(*) AS n FROM users')
    .then(([rows]) => { console.log(rows[0].n); process.exit(0); })
    .catch(() => { console.log('0'); process.exit(0); });
" 2>/dev/null | tail -1)"

if [ "${SKIP_SEED:-0}" = "1" ]; then
    warn "SKIP_SEED=1，跳过导入"
elif [ "${FORCE_SEED:-0}" = "1" ]; then
    warn "FORCE_SEED=1：将清空现有数据后重新导入！"
    node db/migrate.js --force
    ok "演示数据已重新导入"
elif [ "$seeded" != "0" ] && [ -n "$seeded" ]; then
    ok "数据库已有 $seeded 个用户，跳过导入（需要重导用 FORCE_SEED=1）"
else
    node db/migrate.js
    ok "演示数据导入完成"
fi

# ---------- 4. PM2 启动 ----------
step "4/5 用 PM2 启动服务"

command -v pm2 >/dev/null 2>&1 || die "未找到 pm2，请先执行：sudo bash deploy/setup-server.sh"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart ecosystem.config.js --update-env
    ok "已重启 $APP_NAME"
else
    pm2 start ecosystem.config.js
    ok "已启动 $APP_NAME"
fi

pm2 save >/dev/null
ok "进程列表已保存（重启服务器后自动恢复）"

# ---------- 5. 健康检查 ----------
step "5/5 健康检查"

PORT="$(grep -E '^PORT=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | tr -d '\r' || true)"
PORT="${PORT:-3000}"

healthy=0
for i in $(seq 1 15); do
    if curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
        healthy=1
        break
    fi
    sleep 1
done

echo
if [ "$healthy" -eq 1 ]; then
    echo "  健康检查:"
    curl -fsS "http://127.0.0.1:${PORT}/api/health" | sed 's/^/    /'
    echo
else
    echo "${C_RED}  健康检查失败，最近日志：${C_OFF}"
    pm2 logs "$APP_NAME" --lines 30 --nostream || true
    die "服务未正常响应，请根据上面的日志排查"
fi

# 取本机公网出口 IP 便于直接访问（失败不影响部署结果）
PUBLIC_IP="$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)"

echo
echo "============================================"
echo "  ${C_GREEN}部署完成${C_OFF}"
echo "============================================"
echo
if [ -n "$PUBLIC_IP" ]; then
    echo "  访问地址: http://${PUBLIC_IP}:${PORT}/MainPage.html"
else
    echo "  访问地址: http://<服务器公网IP>:${PORT}/MainPage.html"
fi
echo
echo "  常用命令："
echo "    pm2 status                 查看运行状态"
echo "    pm2 logs $APP_NAME         查看实时日志"
echo "    pm2 restart $APP_NAME      重启服务"
echo
echo "  ${C_YELLOW}如果从浏览器打不开，检查云控制台「安全组」是否放行了 ${PORT} 端口。${C_OFF}"
echo "  想要开机自启且不依赖当前终端，执行一次："
echo "    pm2 startup"
echo "  （它会打印一条 sudo 命令，复制执行即可）"
echo
