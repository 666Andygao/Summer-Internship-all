/**
 * 极简访问日志中间件（零依赖，用于替代 morgan）
 *
 * 为什么不用 morgan：
 *   当前网络环境无法访问 npm 源，为不影响项目启动，自行实现日志记录。
 *
 * 输出格式：
 *   2026-08-20T10:30:00.000Z  127.0.0.1  GET /api/me  200  3.2ms
 *
 * 级别：5xx 用 console.error，4xx 用 console.warn，其余用 console.log，
 *      便于在服务器上按级别过滤日志（如 pm2 logs 配合 grep）。
 */

/**
 * 创建访问日志中间件
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] 是否启用（测试时可关闭以减少噪音）
 * @param {boolean} [options.trustProxy=false] 是否信任反向代理的 X-Forwarded-For
 * @returns {Function} Express 中间件
 */
function accessLogger(options = {}) {
    const { enabled = true, trustProxy = false } = options;

    return function accessLogMiddleware(req, res, next) {
        if (!enabled) return next();

        const start = process.hrtime.bigint();

        // 响应结束后记录（此时才有状态码与耗时）
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

            // 经 Nginx 等反向代理时，真实 IP 在 X-Forwarded-For 中
            let ip = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '-';
            if (trustProxy) {
                const forwarded = req.headers['x-forwarded-for'];
                if (forwarded) ip = String(forwarded).split(',')[0].trim() || ip;
            }

            const line = [
                new Date().toISOString(),
                ip,
                `${req.method} ${req.originalUrl}`,
                res.statusCode,
                `${durationMs.toFixed(1)}ms`
            ].join('  ');

            if (res.statusCode >= 500) console.error(line);
            else if (res.statusCode >= 400) console.warn(line);
            else console.log(line);
        });

        next();
    };
}

module.exports = { accessLogger };
