<script setup>
// 筛选侧边栏：民族 / 品类 / 价格区间 多条件筛选
import { reactive, watch } from 'vue'
import { ETHNICS, CATEGORIES } from '@/mock/goods'

// 价格区间预设
const priceRanges = [
  { label: '全部价格', min: null, max: null },
  { label: '¥100 以下', min: null, max: 100 },
  { label: '¥100 - 500', min: 100, max: 500 },
  { label: '¥500 - 1500', min: 500, max: 1500 },
  { label: '¥1500 以上', min: 1500, max: null }
]

// 筛选栏下方内容：补足留白，同时强化非遗导购氛围
const heritageTips = [
  '苗族银饰常以蝴蝶、花鸟纹样寄托吉祥守护。',
  '蜡染的冰裂纹来自手工浸染，每一件都独一无二。'
]

const hotPicks = [
  { label: '苗族银饰', ethnic: '苗族', category: '银饰', priceIndex: 0 },
  { label: '百元蜡染', ethnic: '', category: '蜡染', priceIndex: 2 },
  { label: '彝族漆器', ethnic: '彝族', category: '漆器', priceIndex: 0 }
]

// 双向绑定：把筛选条件变化通过 update:filters 抛给父组件
const props = defineProps({
  filters: { type: Object, required: true }
})
const emit = defineEmits(['update:filters', 'change'])

// 本地筛选状态副本
const local = reactive({
  ethnic: props.filters.ethnic || '',
  category: props.filters.category || '',
  priceIndex: 0
})

// 任一条件变化时，组装并向上抛出
function apply() {
  const range = priceRanges[local.priceIndex]
  emit('update:filters', {
    ...props.filters,
    ethnic: local.ethnic,
    category: local.category,
    minPrice: range.min,
    maxPrice: range.max
  })
  emit('change')
}

// 重置全部筛选
function reset() {
  local.ethnic = ''
  local.category = ''
  local.priceIndex = 0
  apply()
}

// 热门推荐一键带入筛选
function useHotPick(pick) {
  local.ethnic = pick.ethnic
  local.category = pick.category
  local.priceIndex = pick.priceIndex
}

watch(() => [local.ethnic, local.category, local.priceIndex], apply)
</script>

<template>
  <aside class="filter-sidebar">
    <div class="filter-head">
      <h3>筛选</h3>
      <el-button link type="primary" size="small" @click="reset">重置</el-button>
    </div>

    <!-- 民族筛选 -->
    <div class="filter-group">
      <div class="group-title">所属民族</div>
      <div class="tag-list">
        <button
          class="filter-tag"
          :class="{ active: local.ethnic === '' }"
          @click="local.ethnic = ''"
        >全部</button>
        <button
          v-for="e in ETHNICS"
          :key="e"
          class="filter-tag"
          :class="{ active: local.ethnic === e }"
          @click="local.ethnic = e"
        >{{ e }}</button>
      </div>
    </div>

    <!-- 品类筛选 -->
    <div class="filter-group">
      <div class="group-title">器物品类</div>
      <div class="tag-list">
        <button
          class="filter-tag"
          :class="{ active: local.category === '' }"
          @click="local.category = ''"
        >全部</button>
        <button
          v-for="c in CATEGORIES"
          :key="c"
          class="filter-tag"
          :class="{ active: local.category === c }"
          @click="local.category = c"
        >{{ c }}</button>
      </div>
    </div>

    <!-- 价格区间 -->
    <div class="filter-group">
      <div class="group-title">价格区间</div>
      <ul class="price-list">
        <li
          v-for="(r, i) in priceRanges"
          :key="i"
          :class="{ active: local.priceIndex === i }"
          @click="local.priceIndex = i"
        >
          <el-icon v-if="local.priceIndex === i"><Select /></el-icon>
          {{ r.label }}
        </li>
      </ul>
    </div>

    <!-- 侧边栏补充信息 -->
    <div class="heritage-panel">
      <div class="panel-kicker">非遗小知识</div>
      <p v-for="tip in heritageTips" :key="tip">{{ tip }}</p>
    </div>

    <div class="hot-panel">
      <div class="panel-kicker">热门推荐</div>
      <div class="hot-list">
        <button
          v-for="pick in hotPicks"
          :key="pick.label"
          class="hot-chip"
          @click="useHotPick(pick)"
        >{{ pick.label }}</button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.filter-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 18px 18px 24px;
}
.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-primary);
  margin-bottom: 16px;
}
.filter-head h3 {
  font-size: 18px;
  letter-spacing: 3px;
}
.filter-group {
  margin-bottom: 22px;
}
.group-title {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-secondary);
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-tag {
  padding: 5px 12px;
  font-size: 13px;
  color: var(--color-text-light);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-body);
}
.filter-tag:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.filter-tag.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.price-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px;
  font-size: 13px;
  color: var(--color-text-light);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.price-list li:hover {
  background: var(--color-bg);
  color: var(--color-primary);
}
.price-list li.active {
  color: var(--color-primary);
  font-weight: 600;
  background: rgba(192, 57, 43, 0.06);
}
.heritage-panel,
.hot-panel {
  margin-top: 16px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(177, 79, 62, 0.18);
  background: linear-gradient(135deg, #fffaf4 0%, #f8efe6 100%);
}
.panel-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 700;
  letter-spacing: 1px;
}
.panel-kicker::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 10px 0 0 rgba(192, 57, 43, 0.28);
}
.heritage-panel p {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-light);
}
.heritage-panel p + p {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(177, 79, 62, 0.22);
}
.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hot-chip {
  padding: 6px 10px;
  color: var(--color-secondary);
  background: #fff;
  border: 1px solid rgba(177, 79, 62, 0.24);
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-body);
  transition: all 0.2s;
}
.hot-chip:hover {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}
</style>
