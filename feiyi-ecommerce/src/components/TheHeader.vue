<script setup>
// 顶部通栏导航：站点导航 + 关键词搜索 + 购物车 + 个人中心
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/store/cart'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()

// 搜索关键词
const keyword = ref('')

// 购物车角标数量
const cartCount = computed(() => cartStore.totalCount)

// 主导航项（对标非遗官网的栏目化导航）
const navList = [
  { name: '首页', path: '/' },
  { name: '非遗器物', path: '/?scroll=goods' },
  { name: '匠人故事', path: '/?tab=craftsman' },
  { name: '活态传承', path: '/?tab=inherit' }
]

// 判断导航是否高亮
const isActive = (path) => route.path === path.split('?')[0] && path === '/'

// 执行搜索：跳转首页并带上关键词
function onSearch() {
  router.push({ path: '/', query: { keyword: keyword.value.trim() || undefined } })
}

// 移动端抽屉菜单开关
const drawerVisible = ref(false)

// 个人中心（前端占位提示，不涉及登录鉴权）
function onUserCenter() {
  ElMessage.info('个人中心功能由后端账户体系对接后开放')
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <!-- 品牌标识 -->
      <div class="brand" @click="router.push('/')">
        <span class="brand-mark">黔滇</span>
        <div class="brand-text">
          <strong>数赋黔滇</strong>
          <small>西南少数民族非遗器物商城</small>
        </div>
      </div>

      <!-- 搜索框（PC 端） -->
      <div class="search-box">
        <el-input
          v-model="keyword"
          placeholder="搜索非遗器物 / 民族 / 品类，如「苗族银饰」"
          clearable
          @keyup.enter="onSearch"
        >
          <template #append>
            <el-button :icon="'Search'" @click="onSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <!-- 右侧功能区 -->
      <div class="header-actions">
        <!-- 购物车入口，带数量角标 -->
        <div class="action-item" @click="router.push('/cart')">
          <el-badge :value="cartCount" :hidden="cartCount === 0" :max="99">
            <el-icon :size="22"><ShoppingCart /></el-icon>
          </el-badge>
          <span class="action-label">购物车</span>
        </div>
        <!-- 个人中心 -->
        <div class="action-item" @click="onUserCenter">
          <el-icon :size="22"><User /></el-icon>
          <span class="action-label">个人中心</span>
        </div>
        <!-- 移动端菜单按钮 -->
        <div class="action-item menu-btn" @click="drawerVisible = true">
          <el-icon :size="22"><Menu /></el-icon>
        </div>
      </div>
    </div>

    <!-- 主导航条（PC 端） -->
    <nav class="main-nav">
      <div class="container nav-inner">
        <router-link
          v-for="item in navList"
          :key="item.name"
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.name }}
        </router-link>
      </div>
    </nav>

    <!-- 移动端抽屉导航 -->
    <el-drawer v-model="drawerVisible" title="全站导航" direction="rtl" size="70%">
      <div class="mobile-search">
        <el-input v-model="keyword" placeholder="搜索非遗器物" @keyup.enter="onSearch(); drawerVisible = false">
          <template #append>
            <el-button :icon="'Search'" @click="onSearch(); drawerVisible = false" />
          </template>
        </el-input>
      </div>
      <ul class="mobile-nav">
        <li v-for="item in navList" :key="item.name">
          <router-link :to="item.path" @click="drawerVisible = false">{{ item.name }}</router-link>
        </li>
        <li><router-link to="/cart" @click="drawerVisible = false">购物车（{{ cartCount }}）</router-link></li>
      </ul>
    </el-drawer>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-surface);
  box-shadow: 0 1px 0 var(--color-border);
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 28px;
  height: 72px;
}
/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  background: var(--color-primary);
  color: var(--color-bg);
  font-family: var(--font-title);
  font-size: 18px;
  border-radius: var(--radius-sm);
  letter-spacing: -1px;
}
.brand-text strong {
  display: block;
  font-family: var(--font-title);
  font-size: 20px;
  color: var(--color-primary);
  letter-spacing: 2px;
}
.brand-text small {
  font-size: 12px;
  color: var(--color-text-muted);
}
/* 搜索框 */
.search-box {
  flex: 1;
  max-width: 520px;
}
/* 右侧动作 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-shrink: 0;
}
.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  color: var(--color-text-light);
  transition: color 0.2s;
}
.action-item:hover {
  color: var(--color-primary);
}
.action-label {
  font-size: 12px;
}
.menu-btn {
  display: none;
}
/* 主导航 */
.main-nav {
  background: var(--color-primary);
}
.nav-inner {
  display: flex;
  gap: 8px;
  height: 46px;
}
.nav-link {
  display: flex;
  align-items: center;
  padding: 0 22px;
  color: rgba(246, 242, 234, 0.82);
  font-size: 15px;
  letter-spacing: 2px;
  position: relative;
  transition: background 0.2s, color 0.2s;
}
.nav-link:hover,
.nav-link.active {
  color: #fff;
  background: rgba(0, 0, 0, 0.14);
}
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 0;
  height: 3px;
  background: var(--color-secondary-light);
}
/* 移动端抽屉 */
.mobile-search {
  margin-bottom: 16px;
}
.mobile-nav li {
  border-bottom: 1px solid var(--color-border);
}
.mobile-nav li a {
  display: block;
  padding: 14px 4px;
  font-size: 16px;
  color: var(--color-text);
}

/* ===== 响应式：移动端隐藏 PC 搜索与主导航，改用抽屉 ===== */
@media (max-width: 768px) {
  .header-inner {
    height: 60px;
    gap: 12px;
  }
  .brand-text small {
    display: none;
  }
  .search-box {
    display: none;
  }
  .action-item:not(.menu-btn) .action-label {
    display: none;
  }
  .menu-btn {
    display: flex;
  }
  .main-nav {
    display: none;
  }
}
</style>
