/**
 * 极简 .env 加载器（零依赖，用于替代 dotenv）
 *
 * 为什么不用 dotenv：
 *   当前网络环境无法访问 npm 源（官方源与国内镜像均超时），
 *   为保证项目在任意环境都能直接启动，这里自行实现配置读取，
 *   避免因缺少依赖导致服务无法运行。
 *
 * 支持的语法（与 dotenv 基本一致）：
 *   KEY=VALUE            基本键值对
 *   KEY="VALUE"          值可加引号（引号会被去掉）
 *   # 注释               以 # 开头的行会被忽略
 *   空行                 自动跳过
 *   export KEY=VALUE     兼容 shell 风格的 export 前缀
 *
 * 优先级：真实环境变量 > .env 文件（即已存在的 process.env 不会被覆盖）
 */
const fs = require('fs');
const path = require('path');

// 默认读取项目根目录下的 .env
const DEFAULT_ENV_PATH = path.join(__dirname, '..', '.env');

/**
 * 解析 .env 文本内容为键值对象
 * @param {string} content .env 文件文本
 * @returns {Object} 键值对
 */
function parse(content) {
    const result = {};
    // 去掉 UTF-8 BOM，并统一换行符（兼容 Windows 的 CRLF）
    const text = String(content)
        .replace(/^﻿/, '')
        .replace(/\r\n?/g, '\n');

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        // 跳过空行与注释
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;   // 无等号，非法行，跳过

        // 兼容 `export KEY=VALUE` 写法
        let key = line.slice(0, eqIndex).trim().replace(/^export\s+/, '');
        if (!key) continue;

        let value = line.slice(eqIndex + 1).trim();

        // 去掉成对的引号（单引号或双引号）
        const isQuoted =
            (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
            (value.startsWith("'") && value.endsWith("'") && value.length >= 2);
        if (isQuoted) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }
    return result;
}

/**
 * 加载 .env 文件并注入 process.env
 * @param {string} [envPath] 自定义 .env 路径
 * @returns {Object} 从文件解析出的键值对（文件不存在时为空对象）
 */
function load(envPath = DEFAULT_ENV_PATH) {
    let content;
    try {
        content = fs.readFileSync(envPath, 'utf-8');
    } catch (e) {
        // 文件不存在或不合法：静默返回，调用方使用代码内默认值
        return {};
    }

    const parsed = parse(content);
    for (const [key, value] of Object.entries(parsed)) {
        // 真实环境变量优先，不覆盖（便于部署平台注入覆盖 .env）
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
    return parsed;
}

module.exports = { load, parse, DEFAULT_ENV_PATH };
