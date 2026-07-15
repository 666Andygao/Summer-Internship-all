/*
 * Axios 请求封装（模板）
 * 说明：本模块统一配置请求实例、拦截器与错误处理，供各业务 API 复用。
 *       当前页面全部使用前端假数据，此封装仅作「后端对接模板」保留，
 *       后端同学接入时，业务 API 直接调用本实例即可。
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const request = axios.create({
  // 基础请求地址：开发环境走 vite 代理的 /api；生产环境由环境变量注入
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000 // 请求超时时间（毫秒）
})

// ===== 请求拦截器 =====
request.interceptors.request.use(
  (config) => {
    // TODO(后端对接): 如需登录鉴权，在此注入 Token
    // const token = localStorage.getItem('token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ===== 响应拦截器 =====
request.interceptors.response.use(
  (response) => {
    // 约定后端返回结构：{ code, message, data }
    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      // 业务错误统一提示
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    // 直接返回 data，业务层无需层层解包
    return res.data !== undefined ? res.data : res
  },
  (error) => {
    // 网络 / HTTP 错误统一提示
    ElMessage.error(error.message || '网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
