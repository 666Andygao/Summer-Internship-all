<script setup>
// 页面1：非遗电商商品首页
// 顶部 Banner + 左侧多条件筛选 + 右侧瀑布流商品陈列 + 排序 + 分页
import { ref, reactive, watch, onMounted } from 'vue'
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
const pageSize = ref(8)
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

onMounted(() => {
  filters.keyword = route.query.keyword || ''
  loadGoods()
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
        <FilterSidebar v-model:filters="filters" @change="onFilterChange" />

        <!-- 右侧内容区 -->
        <div class="shop-main">
          <!-- 工具条：结果计数 + 排序 -->
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
  background:
    linear-gradient(120deg, rgba(31, 78, 74, 0.94), rgba(22, 58, 55, 0.88)),
    repeating-linear-gradient(45deg, rgba(156, 90, 52, 0.12) 0 2px, transparent 2px 22px);
  color: #f6f2ea;
}
.hero-inner {
  padding: 62px 20px 68px;
}
.hero-sub {
  font-size: 13px;
  letter-spacing: 6px;
  color: var(--color-secondary-light);
  margin-bottom: 14px;
}
.hero-text h1 {
  font-size: 44px;
  color: #f6f2ea;
  letter-spacing: 6px;
  margin-bottom: 20px;
}
.hero-desc {
  font-size: 15px;
  line-height: 2;
  color: rgba(246, 242, 234, 0.82);
}
.hero-tags {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}
.hero-tags span {
  padding: 5px 16px;
  font-size: 13px;
  border: 1px solid rgba(246, 242, 234, 0.4);
  border-radius: 2px;
  letter-spacing: 2px;
}
/* ===== 布局 ===== */
.shop-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 18px;
  margin-bottom: 18px;
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
  .hero-inner {
    padding: 40px 16px;
  }
  .hero-text h1 {
    font-size: 30px;
    letter-spacing: 3px;
  }
  /* 移动端：筛选栏移到顶部，单列铺开 */
  .shop-layout {
    grid-template-columns: 1fr;
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
