<script setup>
// 页面2：非遗商品详情页
// 左：高清图集轮播；右：信息 + 规格 + 加购/立即购买；下：Tab 分区；底：同类推荐
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchGoodsDetail, fetchRelatedGoods, fetchGoodsReviews } from '@/api/goods'
import { useCartStore } from '@/store/cart'
import GoodsCard from '@/components/GoodsCard.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const goods = ref(null)          // 当前商品
const related = ref([])          // 同类推荐
const reviews = ref([])          // 评价列表
const loading = ref(true)

const activeImage = ref(0)       // 当前主图索引
const selectedSpec = ref('')     // 选中规格
const quantity = ref(1)          // 购买数量
const activeTab = ref('archive') // 当前 Tab

// 评分均值
const avgRating = computed(() => {
  if (!reviews.value.length) return 5
  const sum = reviews.value.reduce((s, r) => s + r.rating, 0)
  return (sum / reviews.value.length).toFixed(1)
})

// 加载详情数据
async function loadDetail(id) {
  loading.value = true
  try {
    const [detail, rel, rev] = await Promise.all([
      fetchGoodsDetail(id),
      fetchRelatedGoods(id),
      fetchGoodsReviews(id)
    ])
    goods.value = detail
    related.value = rel
    reviews.value = rev
    // 默认选中第一个规格与第一张图
    selectedSpec.value = detail?.specs?.[0] || ''
    activeImage.value = 0
    quantity.value = 1
  } finally {
    loading.value = false
  }
}

// 加入购物车
function addToCart() {
  if (!goods.value) return
  cartStore.addToCart(goods.value, selectedSpec.value, quantity.value)
  ElMessage.success(`已加入购物车（${selectedSpec.value} ×${quantity.value}）`)
}

// 立即购买：先加购，再跳购物车
function buyNow() {
  addToCart()
  router.push('/cart')
}

// 路由 id 变化时重新加载（同类推荐点击后停留在详情页）
watch(() => route.params.id, (id) => id && loadDetail(id))
onMounted(() => loadDetail(route.params.id))
</script>

<template>
  <div class="detail-view container" v-loading="loading">
    <template v-if="goods">
      <!-- 面包屑 -->
      <el-breadcrumb class="crumb" separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ goods.ethnic }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ goods.name }}</el-breadcrumb-item>
      </el-breadcrumb>

      <!-- ===== 主信息区 ===== -->
      <div class="detail-top">
        <!-- 左：图集 -->
        <div class="gallery">
          <div class="main-image">
            <img :src="goods.gallery[activeImage]" :alt="goods.name" />
            <span class="level-badge">{{ goods.level }}</span>
          </div>
          <!-- 缩略图切换 -->
          <div class="thumbs">
            <div
              v-for="(img, i) in goods.gallery"
              :key="i"
              class="thumb"
              :class="{ active: activeImage === i }"
              @mouseenter="activeImage = i"
            >
              <img :src="img" :alt="`${goods.name}-${i}`" />
            </div>
          </div>
        </div>

        <!-- 右：信息与操作 -->
        <div class="info">
          <h1 class="goods-name">{{ goods.name }}</h1>
          <p class="goods-brief">{{ goods.brief }}</p>

          <!-- 关键属性 -->
          <ul class="meta-list">
            <li><span class="label">非遗等级</span><span class="ethnic-tag level">{{ goods.level }}</span></li>
            <li><span class="label">所属民族</span><span class="ethnic-tag">{{ goods.ethnic }}</span></li>
            <li><span class="label">器物产地</span><span class="val">{{ goods.origin }}</span></li>
            <li><span class="label">累计售出</span><span class="val">{{ goods.sales }} 件</span></li>
          </ul>

          <!-- 价格区 -->
          <div class="price-panel">
            <span class="price"><span class="unit">¥</span>{{ goods.price }}</span>
            <span class="origin-price">¥{{ goods.originalPrice }}</span>
          </div>

          <!-- 规格选择 -->
          <div class="spec-row">
            <span class="row-label">规格</span>
            <div class="spec-options">
              <button
                v-for="s in goods.specs"
                :key="s"
                class="spec-btn"
                :class="{ active: selectedSpec === s }"
                @click="selectedSpec = s"
              >{{ s }}</button>
            </div>
          </div>

          <!-- 数量 -->
          <div class="spec-row">
            <span class="row-label">数量</span>
            <el-input-number v-model="quantity" :min="1" :max="goods.stock" />
            <span class="stock-tip">库存 {{ goods.stock }} 件</span>
          </div>

          <!-- 操作按钮 -->
          <div class="action-btns">
            <el-button size="large" class="btn-cart" :icon="'ShoppingCart'" @click="addToCart">
              加入购物车
            </el-button>
            <el-button size="large" type="primary" class="btn-buy" @click="buyNow">
              立即购买
            </el-button>
          </div>
        </div>
      </div>

      <!-- ===== Tab 分区 ===== -->
      <div class="detail-tabs">
        <el-tabs v-model="activeTab">
          <!-- ① 非遗文化档案 -->
          <el-tab-pane label="非遗文化档案" name="archive">
            <div class="archive">
              <h3 class="archive-title">{{ goods.name }} · 器物档案</h3>
              <p>{{ goods.brief }}</p>
              <p>
                该器物源自{{ goods.origin }}，属{{ goods.ethnic }}世代传承的
                <strong>{{ goods.category }}</strong>技艺，现被列为<strong>{{ goods.level }}</strong>。
                器物纹样承载着{{ goods.ethnic }}族群的自然崇拜与迁徙记忆，
                每一道工序均遵循古法、纯手工完成，是「数赋黔滇」团队实地调研、
                数字化建档并助力活态传承的重点非遗品类之一。
              </p>
              <ul class="archive-facts">
                <li><span>技艺门类</span>{{ goods.category }}</li>
                <li><span>保护等级</span>{{ goods.level }}</li>
                <li><span>核心产区</span>{{ goods.origin }}</li>
                <li><span>可选规格</span>{{ goods.specs.join(' / ') }}</li>
              </ul>
            </div>
          </el-tab-pane>

          <!-- ② 手作匠人 -->
          <el-tab-pane label="手作匠人" name="craftsman">
            <div class="craftsman">
              <div class="craftsman-avatar">{{ goods.craftsman.name.slice(0, 1) }}</div>
              <div class="craftsman-info">
                <h3>{{ goods.craftsman.name }}</h3>
                <p class="craftsman-title">{{ goods.craftsman.title }} · 从艺 {{ goods.craftsman.years }} 年</p>
                <p class="craftsman-desc">
                  {{ goods.craftsman.name }}自幼研习{{ goods.ethnic }}{{ goods.category }}技艺，
                  数十载专注一事，坚持以传统工艺与天然材料手工制作。
                  匠人所作器物既守古法之正，亦融当代之美，
                  是「数赋黔滇」非遗数字化保护与电商赋能计划的重点合作传承人。
                </p>
              </div>
            </div>
          </el-tab-pane>

          <!-- ③ 游客评价 -->
          <el-tab-pane name="reviews">
            <template #label>
              游客评价<span class="tab-count">（{{ reviews.length }}）</span>
            </template>
            <div class="reviews">
              <div class="reviews-summary">
                <div class="score">{{ avgRating }}<small>分</small></div>
                <el-rate :model-value="Number(avgRating)" disabled />
                <span class="summary-tip">综合 {{ reviews.length }} 条真实评价</span>
              </div>
              <ul class="review-list">
                <li v-for="r in reviews" :key="r.id">
                  <div class="review-head">
                    <span class="review-user">{{ r.user }}</span>
                    <el-rate :model-value="r.rating" disabled size="small" />
                    <span class="review-date">{{ r.date }}</span>
                  </div>
                  <p class="review-content">{{ r.content }}</p>
                </li>
              </ul>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- ===== 同类推荐 ===== -->
      <div v-if="related.length" class="related">
        <div class="section-title">
          <h2>同类非遗器物推荐</h2>
          <span class="sub">You May Also Like</span>
        </div>
        <div class="related-grid">
          <GoodsCard v-for="g in related" :key="g.id" :goods="g" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-view {
  padding-top: 20px;
}
.crumb {
  margin-bottom: 20px;
}
/* ===== 主信息区 ===== */
.detail-top {
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 40px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 28px;
}
.main-image {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.level-badge {
  position: absolute;
  left: 0;
  top: 14px;
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background: var(--color-accent);
  letter-spacing: 1px;
}
.thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.thumb {
  width: 72px;
  height: 72px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}
.thumb.active {
  border-color: var(--color-primary);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 右侧信息 */
.info .goods-name {
  font-size: 28px;
  color: var(--color-text);
  margin-bottom: 10px;
}
.goods-brief {
  color: var(--color-text-light);
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 18px;
}
.meta-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  padding: 16px 0;
  border-top: 1px dashed var(--color-border);
  border-bottom: 1px dashed var(--color-border);
}
.meta-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.meta-list .label {
  color: var(--color-text-muted);
}
.ethnic-tag.level {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(192, 57, 43, 0.06);
}
.price-panel {
  background:
    linear-gradient(90deg, rgba(192, 57, 43, 0.06), transparent);
  padding: 16px 18px;
  margin: 20px 0;
  border-left: 3px solid var(--color-accent);
}
.price-panel .price {
  font-size: 34px;
  font-weight: 700;
}
.origin-price {
  margin-left: 12px;
  font-size: 15px;
  color: var(--color-text-muted);
  text-decoration: line-through;
}
.spec-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.row-label {
  width: 44px;
  color: var(--color-text-muted);
  font-size: 14px;
}
.spec-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.spec-btn {
  padding: 7px 18px;
  font-size: 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-body);
  color: var(--color-text-light);
  transition: all 0.2s;
}
.spec-btn.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(192, 57, 43, 0.06);
  font-weight: 600;
}
.stock-tip {
  font-size: 13px;
  color: var(--color-text-muted);
}
.action-btns {
  display: flex;
  gap: 16px;
  margin-top: 28px;
}
.btn-cart {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
  color: #fff;
  padding: 0 30px;
}
.btn-cart:hover {
  background: var(--color-secondary-light);
  border-color: var(--color-secondary-light);
}
.btn-buy {
  padding: 0 40px;
}
/* ===== Tab ===== */
.detail-tabs {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 28px 28px;
  margin-top: 28px;
}
.tab-count {
  color: var(--color-text-muted);
}
.archive-title {
  font-size: 19px;
  margin-bottom: 14px;
}
.archive p {
  color: var(--color-text-light);
  line-height: 2;
  margin-bottom: 14px;
  font-size: 15px;
}
.archive-facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 18px;
}
.archive-facts li {
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: 14px;
}
.archive-facts span {
  display: block;
  color: var(--color-text-muted);
  font-size: 12px;
  margin-bottom: 4px;
}
/* 匠人 */
.craftsman {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.craftsman-avatar {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  font-family: var(--font-title);
  font-size: 40px;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: 50%;
}
.craftsman-info h3 {
  font-size: 20px;
}
.craftsman-title {
  color: var(--color-secondary);
  font-size: 14px;
  margin: 6px 0 12px;
}
.craftsman-desc {
  color: var(--color-text-light);
  line-height: 2;
  font-size: 15px;
}
/* 评价 */
.reviews-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  margin-bottom: 18px;
}
.reviews-summary .score {
  font-family: var(--font-title);
  font-size: 38px;
  color: var(--color-accent);
}
.reviews-summary .score small {
  font-size: 14px;
}
.summary-tip {
  color: var(--color-text-muted);
  font-size: 13px;
}
.review-list li {
  padding: 16px 4px;
  border-bottom: 1px solid var(--color-border);
}
.review-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.review-user {
  font-weight: 600;
  color: var(--color-text);
}
.review-date {
  color: var(--color-text-muted);
  font-size: 12px;
  margin-left: auto;
}
.review-content {
  color: var(--color-text-light);
  line-height: 1.8;
}
/* 同类推荐 */
.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .detail-top {
    grid-template-columns: 380px 1fr;
    gap: 24px;
    padding: 20px;
  }
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .detail-top {
    grid-template-columns: 1fr;
  }
  .meta-list {
    grid-template-columns: 1fr;
  }
  .action-btns {
    flex-direction: column;
  }
  .action-btns .el-button {
    width: 100%;
    margin-left: 0;
  }
  .archive-facts {
    grid-template-columns: 1fr;
  }
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>
