/**
 * PM2 进程守护配置
 *
 * 用途：让 Node 服务在服务器上常驻运行（崩溃自动重启、开机自启、集中日志）
 *
 * 常用命令：
 *   pm2 start ecosystem.config.js    启动
 *   pm2 status                       查看状态
 *   pm2 logs heritage-api            查看日志
 *   pm2 restart heritage-api         重启
 *   pm2 stop heritage-api            停止
 *   pm2 save                         保存当前进程列表
 *   pm2 startup                      生成开机自启脚本（按提示执行输出的命令）
 */
module.exports = {
    apps: [
        {
            name: 'heritage-api',
            script: 'server.js',
            cwd: __dirname,

            // 单实例：数据层采用「内存缓存 + MySQL 持久化」，多实例会导致缓存不一致
            instances: 1,
            exec_mode: 'fork',

            // 崩溃自动重启
            autorestart: true,
            max_restarts: 10,
            restart_delay: 3000,

            // 内存超过 500M 自动重启（防内存泄漏拖垮服务器）
            max_memory_restart: '500M',

            // 环境变量（生产值请写在 .env，这里只设置运行模式）
            env: {
                NODE_ENV: 'production'
            },

            // 日志配置
            output: './logs/pm2-out.log',
            error: './logs/pm2-error.log',
            merge_logs: true,
            time: true,

            // 优雅关闭：等待 10 秒让服务把内存数据刷入 MySQL
            kill_timeout: 10000,
            wait_ready: false,

            // 忽略监听的文件变化（避免上传文件触发重启）
            ignore_watch: ['node_modules', 'uploads', 'logs', 'feiyi-ecommerce/dist']
        }
    ]
};
