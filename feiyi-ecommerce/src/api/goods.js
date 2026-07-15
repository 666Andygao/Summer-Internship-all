/*
 * 商品业务接口层（前端假数据 + 后端接口模板）
 *
 * 【重要】当前所有函数直接返回前端 mock 假数据，保证脱离后端也能完整运行。
 *        每个函数内均以注释标注了「对应后端业务点」，后端接口就绪后：
 *        1) 取消注释 request 调用；2) 删除 / 注释 mock 返回；字段结构保持一致。
 */
import request from './request'
import {
  goodsList,
  findGoodsById,
  getRelatedGoods,
  mockReviews
} from '@/mock/goods'

// 模拟网络延迟，让加载态（loading）更真实
function mockDelay(data, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/**
 * 获取商品列表（支持筛选、分页）
 * @param {Object} params { ethnic, category, minPrice, maxPrice, keyword, sort, page, pageSize }
 * 对应后端业务点：GET /api/goods  —— 商品分页查询与多条件筛选
 */
export function fetchGoodsList(params = {}) {
  // ===== 后端对接（就绪后启用）=====
  // return request.get('/goods', { params })

  // ===== 前端假数据实现（筛选 + 分页在前端完成）=====
  const {
    ethnic, category, minPrice, maxPrice, keyword,
    sort = 'default', page = 1, pageSize = 8
  } = params

  let list = goodsList.slice()

  // 关键词搜索（器物名 / 简介 / 民族）
  if (keyword) {
    const kw = keyword.trim()
    list = list.filter(
      (g) => g.name.includes(kw) || g.brief.includes(kw) || g.ethnic.includes(kw)
    )
  }
  // 民族筛选
  if (ethnic) list = list.filter((g) => g.ethnic === ethnic)
  // 品类筛选
  if (category) list = list.filter((g) => g.category === category)
  // 价格区间筛选
  if (minPrice != null) list = list.filter((g) => g.price >= minPrice)
  if (maxPrice != null) list = list.filter((g) => g.price <= maxPrice)

  // 排序
  if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price)
  else if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price)
  else if (sort === 'salesDesc') list.sort((a, b) => b.sales - a.sales)

  // 分页
  const total = list.length
  const start = (page - 1) * pageSize
  const records = list.slice(start, start + pageSize)

  return mockDelay({ records, total, page, pageSize })
}

/**
 * 获取商品详情
 * 对应后端业务点：GET /api/goods/:id
 */
export function fetchGoodsDetail(id) {
  // return request.get(`/goods/${id}`)
  return mockDelay(findGoodsById(id))
}

/**
 * 获取同类推荐
 * 对应后端业务点：GET /api/goods/:id/related
 */
export function fetchRelatedGoods(id) {
  // return request.get(`/goods/${id}/related`)
  const current = findGoodsById(id)
  return mockDelay(getRelatedGoods(current))
}

/**
 * 获取商品评价列表
 * 对应后端业务点：GET /api/goods/:id/reviews
 */
export function fetchGoodsReviews(id) {
  // return request.get(`/goods/${id}/reviews`)
  return mockDelay(mockReviews)
}

/**
 * 提交订单
 * @param {Object} payload { items, addressId, remark, totalAmount }
 * 对应后端业务点：POST /api/orders —— 创建订单（前端仅弹窗提示，不接真实支付）
 */
export function submitOrder(payload) {
  // return request.post('/orders', payload)
  // 前端模拟：生成一个假的订单号返回
  const fakeOrderNo = 'FY' + Date.now()
  return mockDelay({ orderNo: fakeOrderNo, status: 'created' }, 500)
}
