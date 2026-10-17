<script setup>
// 个人中心：与主平台共享登录态，展示当前账号信息
// 进入页面时调用后端 /api/me 验证 token 并拉取最新用户数据，
// 确保商城展示的是真实的后端账号（而非仅依赖本地缓存）。
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'
<<<<<<< HEAD
=======
<<<<<<< HEAD
import ProductInquiryChat from '@/components/ProductInquiryChat.vue'
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b

const auth = useAuthStore()

// 是否正在向后端验证登录态（首屏先显示加载，避免闪现错误状态）
const checking = ref(true)

onMounted(async () => {
  if (auth.isLoggedIn) {
    await auth.fetchMe()
  }
  checking.value = false
})

// 角色中文名
const roleName = computed(() => {
  const r = auth.role
  if (r === 'user' || r === 'buyer') return '用户'
  if (r === 'developer' || r === 'artisan') return '开发者 / 匠人'
  if (r === 'admin') return '管理员'
  return r || '—'
})

// 角色对应的主平台 Dashboard 地址
const dashboardUrl = computed(() => {
  const r = auth.role
  if (r === 'user' || r === 'buyer') return '/user-dashboard.html'
  if (r === 'developer' || r === 'artisan') return '/developer-dashboard.html'
  return '/MainPage.html'
})

// 进入消息中心（跳转到主平台对应角色的 Dashboard）
function goToDashboard() {
  window.location.href = dashboardUrl.value
}
</script>

<template>
  <div class="user-center">
    <div class="container">
      <!-- 后端验证中 -->
      <div v-if="checking" class="uc-card uc-empty">
        <el-icon :size="56" color="#a5372f" class="is-loading"><Loading /></el-icon>
        <h2>正在验证登录状态...</h2>
        <p>正在连接后端服务器，请稍候。</p>
      </div>

      <!-- 未登录态（本地无 token 或后端验证失败） -->
      <div v-else-if="!auth.isLoggedIn" class="uc-card uc-empty">
        <el-icon :size="56" color="#a5372f"><User /></el-icon>
        <h2>尚未登录</h2>
        <p>登录「华夏风物志」首页后，即可在此查看您的账号信息。</p>
        <el-button type="primary" size="large" @click="auth.goLogin">前往登录</el-button>
      </div>

      <!-- 已登录态（后端验证通过） -->
<<<<<<< HEAD
=======
<<<<<<< HEAD
      <div v-else class="uc-content">
        <div class="uc-grid">
          <!-- 左侧：账号信息卡片 -->
          <div class="uc-card uc-profile">
            <div class="uc-avatar">{{ auth.displayName.slice(0, 1) }}</div>
            <h2>{{ auth.displayName }}</h2>
            <p class="uc-username">@{{ auth.user?.username }}</p>
            <el-tag type="danger" effect="plain" round>{{ roleName }}</el-tag>

            <div class="uc-actions">
              <el-button type="primary" @click="goToDashboard">
                进入消息中心
              </el-button>
              <el-button @click="auth.logout">退出登录</el-button>
            </div>
          </div>

          <!-- 右侧：账号详情（数据来自后端 /api/me） -->
          <div class="uc-card uc-detail">
            <h3>账号信息</h3>
            <div class="uc-row"><span>用户 ID</span><b>{{ auth.user?.id }}</b></div>
            <div class="uc-row"><span>用户名</span><b>{{ auth.user?.username }}</b></div>
            <div class="uc-row"><span>昵称</span><b>{{ auth.displayName }}</b></div>
            <div class="uc-row"><span>角色</span><b>{{ roleName }}</b></div>
            <div class="uc-row"><span>手机号</span><b>{{ auth.user?.phone || '—' }}</b></div>
            <p class="uc-tip">该账号由「华夏风物志」平台统一管理，商城与主平台共享同一账号体系。以上信息由后端实时返回。</p>
          </div>
        </div>

        <section class="uc-card uc-inquiries">
          <h3>商家 / 客户消息</h3>
          <p class="uc-tip">在此查看并回复与商品相关的咨询。</p>
          <ProductInquiryChat />
        </section>
=======
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
      <div v-else class="uc-grid">
        <!-- 左侧：账号信息卡片 -->
        <div class="uc-card uc-profile">
          <div class="uc-avatar">{{ auth.displayName.slice(0, 1) }}</div>
          <h2>{{ auth.displayName }}</h2>
          <p class="uc-username">@{{ auth.user?.username }}</p>
          <el-tag type="danger" effect="plain" round>{{ roleName }}</el-tag>

          <div class="uc-actions">
            <el-button type="primary" @click="goToDashboard">
              进入消息中心
            </el-button>
            <el-button @click="auth.logout">退出登录</el-button>
          </div>
        </div>

        <!-- 右侧：账号详情（数据来自后端 /api/me） -->
        <div class="uc-card uc-detail">
          <h3>账号信息</h3>
          <div class="uc-row"><span>用户 ID</span><b>{{ auth.user?.id }}</b></div>
          <div class="uc-row"><span>用户名</span><b>{{ auth.user?.username }}</b></div>
          <div class="uc-row"><span>昵称</span><b>{{ auth.displayName }}</b></div>
          <div class="uc-row"><span>角色</span><b>{{ roleName }}</b></div>
          <div class="uc-row"><span>手机号</span><b>{{ auth.user?.phone || '—' }}</b></div>
          <p class="uc-tip">该账号由「华夏风物志」平台统一管理，商城与主平台共享同一账号体系。以上信息由后端实时返回。</p>
        </div>
<<<<<<< HEAD
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-center {
  padding: 48px 0 64px;
  min-height: 60vh;
  background: var(--color-bg);
}
.container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 0 20px;
}
.uc-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 40px;
}
.uc-empty {
  max-width: 520px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.uc-empty h2 {
  font-family: var(--font-title);
  color: var(--color-text);
}
.uc-empty p {
  color: var(--color-text-muted);
  font-size: 14px;
}
.uc-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}
<<<<<<< HEAD
=======
<<<<<<< HEAD
.uc-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
@media (max-width: 768px) {
  .uc-grid { grid-template-columns: 1fr; }
}
.uc-profile {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.uc-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  font-size: 36px;
  font-weight: 600;
  display: grid;
  place-items: center;
  font-family: var(--font-title);
}
.uc-profile h2 {
  font-family: var(--font-title);
  color: var(--color-text);
  margin-top: 4px;
}
.uc-username {
  color: var(--color-text-muted);
  font-size: 13px;
}
.uc-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.uc-detail h3 {
  font-family: var(--font-title);
  color: var(--color-text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}
<<<<<<< HEAD
=======
<<<<<<< HEAD
.uc-inquiries h3 {
  font-family: var(--font-title);
  margin-bottom: 8px;
}
=======
>>>>>>> b285b68e180d2d1fdf59f578b984c85db601aa5f
>>>>>>> 8f4aae9ea20839b655018b479d45434fa8db2a1b
.uc-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px dashed var(--color-border);
  font-size: 14px;
}
.uc-row span { color: var(--color-text-muted); }
.uc-row b { color: var(--color-text); font-weight: 500; }
.uc-tip {
  margin-top: 20px;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}
</style>
