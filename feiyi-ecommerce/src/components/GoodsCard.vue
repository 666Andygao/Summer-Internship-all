<script setup>
// 商品卡片：器物实拍图 + 名称 + 民族标签 + 售价 + 非遗文化注解
import { useRouter } from 'vue-router'
import { useCartStore } from '@/store/cart'
import { ElMessage } from 'element-plus'

const props = defineProps({
  goods: { type: Object, required: true }
})

const router = useRouter()
const cartStore = useCartStore()

// 点击卡片进入详情
function goDetail() {
  router.push(`/goods/${props.goods.id}`)
}

// 卡片内快速加购（默认取第一个规格）
function quickAdd() {
  const spec = props.goods.specs?.[0] || ''
  cartStore.addToCart(props.goods, spec, 1)
  ElMessage.success('已加入购物车')
}
</script>

<template>
  <article class="goods-card" @click="goDetail">
    <!-- 器物封面图 -->
    <div class="card-cover">
      <img :src="goods.cover" :alt="goods.name" loading="lazy" />
      <span class="level-badge">{{ goods.level }}</span>
    </div>

    <div class="card-body">
      <!-- 名称 + 民族标签 -->
      <div class="card-head">
        <h3 class="goods-name" :title="goods.name">{{ goods.name }}</h3>
        <span class="ethnic-tag">{{ goods.ethnic }}</span>
      </div>

      <!-- 简短非遗文化注解 -->
      <p class="goods-brief">{{ goods.brief }}</p>

      <!-- 产地 -->
      <p class="goods-origin">
        <el-icon><Location /></el-icon>{{ goods.origin }}
      </p>

      <!-- 价格 + 加购 -->
      <div class="card-foot">
        <div class="price-wrap">
          <span class="price"><span class="unit">¥</span>{{ goods.price }}</span>
          <span class="origin-price">¥{{ goods.originalPrice }}</span>
        </div>
        <el-button
          class="add-btn"
          :icon="'ShoppingCart'"
          circle
          @click.stop="quickAdd"
          title="加入购物车"
        />
      </div>
    </div>
  </article>
</template>

<style scoped>
.goods-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s, box-shadow 0.25s;
  display: flex;
  flex-direction: column;
}
.goods-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}
.card-cover {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}
.goods-card:hover .card-cover img {
  transform: scale(1.05);
}
.level-badge {
  position: absolute;
  left: 0;
  top: 12px;
  padding: 3px 10px 3px 8px;
  font-size: 12px;
  color: #fff;
  background: var(--color-accent);
  border-radius: 0 2px 2px 0;
  letter-spacing: 1px;
}
.card-body {
  padding: 14px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.goods-name {
  font-size: 17px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.goods-brief {
  font-size: 13px;
  color: var(--color-text-light);
  line-height: 1.7;
  /* 最多两行，超出省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 44px;
}
.goods-origin {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.price {
  font-size: 22px;
  font-weight: 700;
}
.origin-price {
  margin-left: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-decoration: line-through;
}
.add-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.add-btn:hover {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}
</style>
