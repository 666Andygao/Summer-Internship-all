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

    // 登出：清除共享登录态，跳回主平台登录页
    logout() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      this.token = ''
      this.user = null
      window.location.href = LOGIN_PAGE
    },

    // 跳转到主平台登录页
    goLogin() {
      window.location.href = LOGIN_PAGE
    }
  }
})
