// 路由配置
import { createRouter, createWebHistory } from 'vue-router'

// 采用路由懒加载，首屏只加载必要资源，提升性能
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '非遗器物商城 · 首页' }
  },
  {
    path: '/goods/:id', // 商品详情：动态 id 参数
    name: 'goods-detail',
    component: () => import('@/views/GoodsDetailView.vue'),
    meta: { title: '器物详情' }
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: '我的购物车' }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: '订单结算' }
  },
  {
    path: '/user', // 个人中心：与主平台共享账号体系
    name: 'user-center',
    component: () => import('@/views/UserCenterView.vue'),
    meta: { title: '个人中心' }
  },
  {
    // 兜底：未匹配路由重定向到首页
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  // 使用 Vite 注入的 base 路径（/shop/），确保商城部署到主站子路径时路由正确
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 路由切换时的滚动行为
  scrollBehavior(to) {
    // 带 scroll 查询参数时（如「非遗器物」导航），交由目标页面自行平滑滚动到锚点
    if (to.query.scroll) return false
    // 其余情况始终回到页面顶部
    return { top: 0 }
  }
})

// 全局前置守卫：动态设置浏览器标签标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} | 数赋黔滇` : '数赋黔滇 · 非遗器物商城'
  next()
})

export default router
