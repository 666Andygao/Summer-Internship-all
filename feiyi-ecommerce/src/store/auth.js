/*
 * 登录态管理（与主平台共享账号体系）
 *
 * 商城与主平台（MainPage.html）部署在同一个源（http://localhost:3000），
 * 因此共享同一个 localStorage。主平台登录后写入：
 *   - token: JWT 字符串
 *   - user : JSON 字符串 { id, username, role, display_name }
 * 本 store 直接读取这两个 key，实现「登录首页即可登录商城」。
 */
import { defineStore } from 'pinia'

// 与主平台保持一致的存储 key（不可随意改动）
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

// 主平台登录页地址（商城未登录时跳转过去）
const LOGIN_PAGE = '/login.html'

// 安全读取 user，避免 JSON 解析失败
function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: loadUser()
  }),

  getters: {
    // 是否已登录
    isLoggedIn: (state) => !!state.token && !!state.user,
    // 展示名称
    displayName: (state) => state.user?.display_name || state.user?.username || '',
    // 角色（user=用户, developer=开发者/匠人）
    role: (state) => state.user?.role || ''
  },

  actions: {
    // 从 localStorage 刷新登录态（主平台登录/登出后调用）
    refresh() {
      this.token = localStorage.getItem(TOKEN_KEY) || ''
      this.user = loadUser()
    },

    // 仅清除登录态（不跳转），供后端验证失败时使用
    clearAuth() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      this.token = ''
      this.user = null
    },

    // 用后端 /api/me 验证 token 并刷新用户信息，实现真正的「后端用户对接」
    // 返回 true=已通过后端验证；false=未登录 / token 失效 / 网络异常
    async fetchMe() {
      if (!this.token) return false
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: 'Bearer ' + this.token }
        })
        if (res.status === 401) {
          // token 失效：清除本地登录态，让页面显示未登录
          this.clearAuth()
          return false
        }
        if (!res.ok) return false
        const data = await res.json()
        // 用后端返回的最新用户信息覆盖本地缓存，保持商城与主平台一致
        this.user = data
        localStorage.setItem(USER_KEY, JSON.stringify(data))
        return true
      } catch (e) {
        // 网络异常（如后端未启动）：保留现有状态，不强退
        return false
      }
    },

    // 登出：清除共享登录态，跳回主平台登录页
    logout() {
      this.clearAuth()
      window.location.href = LOGIN_PAGE
    },

    // 跳转到主平台登录页，并携带回跳地址（登录成功后回到当前商城页面）
    goLogin() {
      const redirect = encodeURIComponent(window.location.href)
      window.location.href = `${LOGIN_PAGE}?redirect=${redirect}`
    }
  }
})
