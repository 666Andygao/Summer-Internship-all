import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置文件
// 文档地址：https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/shop/', // 部署到主站 /shop/ 路径下，与主平台同源以共享登录态
  resolve: {
    alias: {
      // 配置 @ 指向 src 目录，方便模块导入
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173, // 本地开发服务器端口
    open: true, // 启动后自动打开浏览器
    // 跨域代理：开发模式下将 /api 请求转发到主站 Express 后端（server.js，端口 3000）
    // 注意：商城与主平台需同源共享登录态，正式使用请通过 http://localhost:3000/shop/ 访问构建产物
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 主站后端地址（server.js）
        changeOrigin: true
        // rewrite: (path) => path.replace(/^\/api/, '') // 如后端无 /api 前缀可启用
      }
    }
  }
})
