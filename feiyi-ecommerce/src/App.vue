<script setup>
// 应用根组件：固定头部 + 路由视图 + 页脚
import TheHeader from '@/components/TheHeader.vue'
import TheFooter from '@/components/TheFooter.vue'
</script>

<template>
  <div class="app-root">
    <!-- 顶部通栏导航（全站固定） -->
    <TheHeader />

    <!-- 主内容区：由路由决定展示哪个页面 -->
    <main class="page-main">
      <!-- 路由切换时保留滚动位置由 router 的 scrollBehavior 处理 -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <TheFooter />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
/* 路由切换淡入淡出过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
