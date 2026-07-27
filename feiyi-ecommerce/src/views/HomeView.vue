<script setup>
// 页面1：非遗电商商品首页
// 顶部 Banner + 左侧多条件筛选 + 右侧瀑布流商品陈列 + 排序 + 分页
import { ref, reactive, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import FilterSidebar from '@/components/FilterSidebar.vue'
import GoodsCard from '@/components/GoodsCard.vue'
import { fetchGoodsList } from '@/api/goods'

const route = useRoute()

// 筛选条件（民族 / 品类 / 价格 / 关键词）
const filters = reactive({
  ethnic: '',
  category: '',
  minPrice: null,
  maxPrice: null,
  keyword: ''
})

// 排序方式
const sort = ref('default')
const sortOptions = [
  { label: '综合推荐', value: 'default' },
  { label: '销量优先', value: 'salesDesc' },
  { label: '价格从低到高', value: 'priceAsc' },
  { label: '价格从高到低', value: 'priceDesc' }
]

// 分页
const page = ref(1)
const pageSize = ref(9)
const total = ref(0)

// 列表数据与加载态
const goods = ref([])
const loading = ref(false)

// 拉取商品列表（调用 api 层，内部走前端假数据）
async function loadGoods() {
  loading.value = true
  try {
    const res = await fetchGoodsList({
      ...filters,
      sort: sort.value,
      page: page.value,
      pageSize: pageSize.value
    })
    goods.value = res.records
    total.value = res.total
  } finally {
    loading.value = false
  }
}

// 筛选 / 排序变化 → 回到第 1 页重新加载
function onFilterChange() {
  page.value = 1
  loadGoods()
}
watch(sort, onFilterChange)

// 分页切换
function onPageChange(p) {
  page.value = p
  loadGoods()
}

// 响应顶部搜索框传入的关键词（route.query.keyword）
watch(
  () => route.query.keyword,
  (kw) => {
    filters.keyword = kw || ''
    onFilterChange()
  }
)

// 平滑滚动到器物陈列区（顶部导航「非遗器物」→ /?scroll=goods）
function scrollToGoods() {
  nextTick(() => {
    document.getElementById('goods')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
// 监听 scroll 参数变化（已在首页时点击「非遗器物」）
watch(
  () => route.query.scroll,
  (v) => {
    if (v === 'goods') scrollToGoods()
  }
)

onMounted(() => {
  filters.keyword = route.query.keyword || ''
  loadGoods()
  // 从其它页面带 scroll 参数进入首页时，加载后滚动到器物区
  if (route.query.scroll === 'goods') scrollToGoods()
})
</script>

<template>
  <div class="home-view">
    <!-- ===== 顶部主视觉 Banner ===== -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <p class="hero-sub">SHU · FU · QIAN · DIAN</p>
          <h1>黔滇非遗 · 器物有灵</h1>
          <p class="hero-desc">
            苗族银饰、彝族漆器、布依蜡染……<br />
            一器一物皆是西南少数民族世代相传的匠心，<br />
            以电商之桥，赴一场活态传承之约。
          </p>
          <div class="hero-tags">
            <span>国家级非遗</span>
            <span>匠人手作</span>
            <span>正品溯源</span>
          </div>
        </div>

        <!-- 右侧主视觉：铜鼓太阳纹（西南少数民族代表纹样，纯 SVG 生成，无需图片） -->
        <div class="hero-visual" aria-hidden="true">
          <svg class="totem" viewBox="0 0 400 400" role="img">
            <!-- 中心柔光 -->
            <defs>
              <radialGradient id="totemGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#c0392b" stop-opacity="0.12" />
                <stop offset="100%" stop-color="#c0392b" stop-opacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="170" fill="url(#totemGlow)" />

            <!-- 外圈：缓慢旋转的虚线环 -->
            <g class="ring-spin" fill="none" stroke="#c0392b">
              <circle cx="200" cy="200" r="188" stroke-opacity="0.25" stroke-width="1" />
              <circle cx="200" cy="200" r="178" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="2 12" />
            </g>

            <!-- 静态同心装饰环 -->
            <circle cx="200" cy="200" r="150" fill="none" stroke="#c9b3a3" stroke-opacity="0.6" stroke-width="1" />
            <circle cx="200" cy="200" r="120" fill="none" stroke="#c9b3a3" stroke-opacity="0.7" stroke-width="1" stroke-dasharray="1 9" />

            <!-- 太阳纹芒线：12 道三角光芒环绕中心 -->
            <g fill="#c0392b">
              <polygon
                v-for="n in 12"
                :key="n"
                points="200,66 194,118 206,118"
                :transform="`rotate(${n * 30} 200 200)`"
              />
            </g>

            <!-- 铜鼓中心「鼓芯」 -->
            <circle cx="200" cy="200" r="46" fill="#c0392b" stroke="#e8c9a0" stroke-width="2" />
            <circle cx="200" cy="200" r="31" fill="none" stroke="#e8c9a0" stroke-opacity="0.7" stroke-width="1.5" />
            <circle cx="200" cy="200" r="7" fill="#e8c9a0" />
          </svg>
        </div>
      </div>
    </section>

    <!-- ===== 商品陈列主体 ===== -->
    <div class="container">
      <div class="section-title" id="goods">
        <h2>非遗器物集市</h2>
        <span class="sub">Intangible Cultural Heritage Market</span>
      </div>

      <div class="shop-layout">
        <!-- 左侧筛选侧边栏 -->
        <FilterSidebar class="shop-filter" v-model:filters="filters" @change="onFilterChange" />

        <!-- 工具条：结果计数 + 排序（单独占右列首行，使筛选栏与下方商品顶部对齐） -->
        <div class="toolbar">
          <span class="result-count">
            共 <em>{{ total }}</em> 件器物
            <template v-if="filters.keyword">
              · 搜索「{{ filters.keyword }}」
            </template>
          </span>
          <div class="sort-tabs">
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              :class="{ active: sort === opt.value }"
              @click="sort = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="shop-main">
          <!-- 商品网格（瀑布流卡片布局），加载时骨架屏 -->
          <div v-loading="loading" class="goods-grid" :class="{ empty: !goods.length && !loading }">
            <GoodsCard v-for="g in goods" :key="g.id" :goods="g" />
            <!-- 空状态 -->
            <el-empty
              v-if="!goods.length && !loading"
              description="没有找到匹配的非遗器物，试试调整筛选条件"
            />
          </div>

          <!-- 分页控件 -->
          <div v-if="total > pageSize" class="pagination">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="total"
              :page-size="pageSize"
              :current-page="page"
              @current-change="onPageChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Hero ===== */
.hero {
  background: #f2ebe4; /* 宣纸暖底 */
  background-image:
    radial-gradient(circle at 20% 30%, rgba(192, 57, 43, 0.05) 0%, transparent 42%),
    radial-gradient(circle at 82% 72%, rgba(192, 57, 43, 0.07) 0%, transparent 52%);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}
.hero-inner {
  padding: 62px 20px 68px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: center;
  gap: 40px;
}
/* 右侧主视觉 */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}
.totem {
  width: 100%;
  max-width: 360px;
  height: auto;
  animation: totem-float 6s ease-in-out infinite;
}
.ring-spin {
  transform-box: fill-box;
  transform-origin: center;
  animation: totem-spin 64s linear infinite;
}
@keyframes totem-spin {
  to { transform: rotate(360deg); }
}
@keyframes totem-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
/* 尊重「减少动态效果」的系统偏好 */
@media (prefers-reduced-motion: reduce) {
  .totem, .ring-spin { animation: none; }
}
.hero-sub {
  font-size: 13px;
  letter-spacing: 6px;
  color: var(--color-accent);
  margin-bottom: 14px;
}
.hero-text h1 {
  font-size: 44px;
  color: var(--color-text);
  letter-spacing: 6px;
  margin-bottom: 20px;
}
.hero-desc {
  font-size: 15px;
  line-height: 2;
  color: var(--color-text-light);
}
.hero-tags {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}
.hero-tags span {
  padding: 5px 16px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-light);
  border-radius: 2px;
  letter-spacing: 2px;
}
/* 器物区锚点：为吸顶 Header（品牌栏 72 + 导航条 46）预留偏移，避免标题被遮挡 */
#goods {
  scroll-margin-top: 128px;
}
/* ===== 布局 ===== */
.shop-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  column-gap: 24px;
  row-gap: 18px;
  align-items: start;
}
/* 筛选栏放到第二行左列，与右侧商品网格同一行起始 → 顶部对齐 */
.shop-filter {
  grid-column: 1;
  grid-row: 2;
}
.shop-main {
  grid-column: 2;
  grid-row: 2;
}
.toolbar {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 18px;
  flex-wrap: wrap;
  gap: 10px;
}
.result-count {
  font-size: 14px;
  color: var(--color-text-light);
}
.result-count em {
  color: var(--color-accent);
  font-style: normal;
  font-weight: 700;
}
.sort-tabs {
  display: flex;
  gap: 4px;
}
.sort-tabs button {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-light);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.2s;
}
.sort-tabs button:hover {
  color: var(--color-primary);
}
.sort-tabs button.active {
  color: #fff;
  background: var(--color-primary);
}
/* 商品网格 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  min-height: 300px;
}
.goods-grid.empty {
  grid-template-columns: 1fr;
  place-items: center;
}
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 34px;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .goods-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  #goods {
    scroll-margin-top: 72px;
  }
  .hero-inner {
    padding: 40px 16px;
    grid-template-columns: 1fr;
  }
  /* 移动端隐藏装饰图形，文字单栏铺满 */
  .hero-visual {
    display: none;
  }
  .hero-text h1 {
    font-size: 30px;
    letter-spacing: 3px;
  }
  /* 移动端：筛选栏移到顶部，单列铺开（清除桌面端的行列定位，按 DOM 顺序堆叠） */
  .shop-layout {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }
  .shop-filter,
  .toolbar,
  .shop-main {
    grid-column: auto;
    grid-row: auto;
  }
  .goods-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
@media (max-width: 480px) {
  .goods-grid {
    grid-template-columns: 1fr;
  }
}
</style>
