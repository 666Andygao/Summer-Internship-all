/*
 * 商品业务接口：仅读取已审核商家真实上架的商品。
 */
import request from './request'
import { placeholderImage } from '@/utils/placeholder'

const MERCHANT_GOODS_ID_OFFSET = 1_000_000_000

function toMerchantProductId(id) {
  const goodsId = Number(id)
  const productId = goodsId - MERCHANT_GOODS_ID_OFFSET
  if (!Number.isSafeInteger(goodsId) || !Number.isSafeInteger(productId) || productId <= 0) {
    throw new Error('商品不存在或已下架')
  }
  return productId
}

function normalizeSpecs(specifications) {
  if (!Array.isArray(specifications)) return []
  return specifications
    .map((spec) => typeof spec === 'string' ? spec : spec?.name || spec?.label || '')
    .filter(Boolean)
}

function toMarketplaceGoods(product) {
  const id = Number(product.id)
  const name = product.title || '非遗手作'
  const price = Number(product.price) || 0
  const images = [
    product.cover_image,
    ...(Array.isArray(product.main_images) ? product.main_images : [])
  ].filter((image, index, all) => image && all.indexOf(image) === index)
  const cover = images[0] || placeholderImage(name, id)
  const tags = Array.isArray(product.tags) ? product.tags.map(String) : []

  return {
    ...product,
    id: MERCHANT_GOODS_ID_OFFSET + id,
    merchantProductId: id,
    name,
    ethnic: tags[0] || '非遗手作',
    category: product.category || '非遗手作',
    level: '非遗手作',
    origin: product.origin || product.merchant_name || '非遗匠人原创',
    price,
    originalPrice: price,
    sales: Number(product.sales_count) || 0,
    stock: Number(product.stock) || 0,
    specs: normalizeSpecs(product.specifications),
    brief: product.brief || product.description || '匠人手工制作，传承非遗技艺。',
    cover,
    gallery: images.length ? images : [cover],
    processImages: [],
    modelAssets: [],
    craftsman: {
      name: product.merchant_name || '非遗匠人',
      title: '非遗手作传承者',
      years: 0
    }
  }
}

async function fetchMarketplaceProducts() {
  const products = []
  let page = 1
  let total = Infinity

  while (products.length < total) {
    const response = await request.get('/products', { params: { page, limit: 100 } })
    const pageProducts = Array.isArray(response?.items) ? response.items : []
    products.push(...pageProducts)
    total = Number(response?.pagination?.total) || 0
    if (!pageProducts.length) break
    page += 1
  }

  return products.map(toMarketplaceGoods)
}

function matchesFilters(goods, { ethnic, category, minPrice, maxPrice, keyword }) {
  if (keyword) {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (![goods.name, goods.brief, goods.ethnic, goods.category]
      .some((value) => String(value || '').toLowerCase().includes(normalizedKeyword))) return false
  }
  if (ethnic && goods.ethnic !== ethnic) return false
  if (category && goods.category !== category) return false
  if (minPrice != null && goods.price < minPrice) return false
  if (maxPrice != null && goods.price > maxPrice) return false
  return true
}

function sortGoods(list, sort) {
  if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price)
  else if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price)
  else if (sort === 'salesDesc') list.sort((a, b) => b.sales - a.sales)
  return list
}

/**
 * 获取真实上架商品列表（支持筛选、分页）。
 * @param {Object} params { ethnic, category, minPrice, maxPrice, keyword, sort, page, pageSize }
 */
export async function fetchGoodsList(params = {}) {
  const {
    ethnic, category, minPrice, maxPrice, keyword,
    sort = 'default', page = 1, pageSize = 8
  } = params

  let list = (await fetchMarketplaceProducts()).filter((goods) =>
    matchesFilters(goods, { ethnic, category, minPrice, maxPrice, keyword }))
  list = sortGoods(list, sort)

  const total = list.length
  const start = (page - 1) * pageSize
  const records = list.slice(start, start + pageSize)
  return { records, total, page, pageSize }
}

/** 获取商品详情 */
export async function fetchGoodsDetail(id) {
  const product = await request.get(`/products/${toMerchantProductId(id)}`)
  return toMarketplaceGoods(product)
}

/** 获取同类推荐 */
export async function fetchRelatedGoods(id) {
  const current = await fetchGoodsDetail(id)
  const allGoods = await fetchMarketplaceProducts()
  return allGoods
    .filter((goods) => goods.id !== current.id &&
      (goods.ethnic === current.ethnic || goods.category === current.category))
    .slice(0, 4)
}

function toReviewProductId(id) {
  return toMerchantProductId(id)
}

function toMarketplaceReview(review) {
  return {
    ...review,
    user: review.user_name || '匿名用户',
    date: review.created_at ? new Date(review.created_at).toLocaleDateString('zh-CN') : '',
    content: review.content || review.experience || review.additional_content || ''
  }
}

/** 获取商品评价列表和全部可见评价的统计 */
export async function fetchGoodsReviews(id) {
  const response = await request.get(`/products/${toReviewProductId(id)}/reviews`, {
    params: { page: 1, pageSize: 100 }
  })
  return {
    reviews: (response?.reviews || []).map(toMarketplaceReview),
    stats: response?.stats || { total: 0, average_rating: 0 },
    eligibility: response?.eligibility || { eligible: false, reason: 'login_required' }
  }
}

/** 提交商品评价 */
export async function submitGoodsReview(id, payload) {
  const response = await request.post(`/products/${toReviewProductId(id)}/reviews`, payload)
  return {
    review: toMarketplaceReview(response.review),
    stats: response.stats
  }
}

/** 创建或复用当前商品与其商家的咨询会话 */
export function contactProductMerchant(id) {
  return request.post(`/products/${toMerchantProductId(id)}/contact`)
}

/** 创建服务端订单，仅支持真实、已审核并上架的商家商品 */
export function submitMarketplaceOrder({ items, shippingAddress, remark }) {
  return request.post('/orders/marketplace-checkout', {
    items: items.map((item) => ({
      product_id: toMerchantProductId(item.id),
      quantity: Number(item.quantity)
    })),
    shipping_address: {
      recipient_name: shippingAddress.name,
      phone: shippingAddress.phone,
      region: shippingAddress.region,
      detail: shippingAddress.detail
    },
    remarks: remark
  })
}

/**
 * 提交商城订单
 * @param {Object} payload { items, shippingAddress, remark }
 */
export function submitOrder(payload) {
  return submitMarketplaceOrder(payload)
}
