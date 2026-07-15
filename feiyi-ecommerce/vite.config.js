import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置文件
// 文档地址：https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 配置 @ 指向 src 目录，方便模块导入
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173, // 本地开发服务器端口
    open: true, // 启动后自动打开浏览器
    // 跨域代理：后端接口联调时启用（当前使用前端假数据，仅作模板保留）
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 后端服务地址（由后端同学提供后修改）
        changeOrigin: true
        // rewrite: (path) => path.replace(/^\/api/, '') // 如后端无 /api 前缀可启用
      }
    }
  }
})
