// 应用入口文件
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn' // Element Plus 中文语言包
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './styles/global.css' // 全局样式（含国风配色变量）

const app = createApp(App)

// 全局注册 Element Plus 所有图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())            // 状态管理（购物车、地址等）
app.use(router)                   // 路由
app.use(ElementPlus, { locale: zhCn }) // UI 组件库，设置中文

app.mount('#app')
