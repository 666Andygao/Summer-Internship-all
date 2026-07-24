<script setup>
// 页面3：购物车页面
// 商品列表（勾选/全选、数量增减、删除）+ 底部实时统计 + 结算跳转
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCartStore } from '@/store/cart'

const router = useRouter()
const cartStore = useCartStore()
// 用 storeToRefs 保持响应式解构
const { items } = storeToRefs(cartStore)

// 全选状态（可写计算属性，绑定到全选复选框）
const allChecked = computed({
  get: () => cartStore.isAllChecked,
  set: (val) => cartStore.toggleAll(val)
})

// 底部统计（已勾选件数、合计金额）
const checkedCount = computed(() => cartStore.checkedCount)
const checkedAmount = computed(() => cartStore.checkedAmount)

// 删除单品（二次确认）
function removeItem(index) {
  ElMessageBox.confirm('确定要移除该器物吗？', '移除提示', {
    confirmButtonText: '移除',
    cancelButtonText: '再想想',
    type: 'warning'
  })
    .then(() => {
      cartStore.removeItem(index)
      ElMessage.success('已移除')
    })
    .catch(() => {})
}

// 去结算：需至少勾选一件
function goCheckout() {
  if (checkedCount.value === 0) {
    ElMessage.warning('请先勾选要结算的器物')
    return
  }
  router.push('/checkout')
}
</script>

<template>
  <div class="cart-view container">
    <div class="section-title">
      <h2>我的购物车</h2>
      <span class="sub">Shopping Cart</span>
    </div>

    <!-- 有商品 -->
    <template v-if="items.length">
      <div class="cart-panel">
        <!-- 表头 -->
        <div class="cart-head">
          <span class="col-check">
            <el-checkbox v-model="allChecked">全选</el-checkbox>
          </span>
          <span class="col-goods">器物信息</span>
          <span class="col-price">单价</span>
          <span class="col-qty">数量</span>
          <span class="col-subtotal">小计</span>
          <span class="col-op">操作</span>
        </div>

        <!-- 商品行 -->
        <div v-for="(item, index) in items" :key="item.id + item.spec" class="cart-row">
          <span class="col-check">
            <el-checkbox
              :model-value="item.checked"
              @change="(val) => cartStore.toggleChecked(index, val)"
            />
          </span>
          <!-- 器物信息 -->
          <div class="col-goods goods-cell" @click="router.push(`/goods/${item.id}`)">
            <img :src="item.cover" :alt="item.name" />
            <div class="goods-meta">
              <p class="name">{{ item.name }}</p>
              <span class="ethnic-tag">{{ item.ethnic }}</span>
              <p class="spec" v-if="item.spec">规格：{{ item.spec }}</p>
            </div>
          </div>
          <span class="col-price price"><span class="unit">¥</span>{{ item.price }}</span>
          <span class="col-qty">
            <el-input-number
              :model-value="item.quantity"
              :min="1"
              :max="99"
              size="small"
              @change="(val) => cartStore.updateQuantity(index, val)"
            />
          </span>
          <span class="col-subtotal price">
            <span class="unit">¥</span>{{ (item.price * item.quantity).toFixed(0) }}
          </span>
          <span class="col-op">
            <el-button link type="danger" :icon="'Delete'" @click="removeItem(index)">删除</el-button>
          </span>
        </div>
      </div>

      <!-- 底部结算栏（吸底） -->
      <div class="settle-bar">
        <div class="settle-left">
          <el-checkbox v-model="allChecked">全选</el-checkbox>
          <el-button link @click="router.push('/')">继续挑选</el-button>
        </div>
        <div class="settle-right">
          <div class="settle-info">
            已选 <em>{{ checkedCount }}</em> 件，合计：
            <span class="total-price"><span class="unit">¥</span>{{ checkedAmount.toFixed(0) }}</span>
          </div>
          <el-button type="primary" size="large" class="settle-btn" @click="goCheckout">
            去结算（{{ checkedCount }}）
          </el-button>
        </div>
      </div>
    </template>

    <!-- 空购物车 -->
    <el-empty v-else description="购物车还是空的，去挑一件心仪的非遗器物吧">
      <el-button type="primary" @click="router.push('/')">前往选购</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.cart-view {
  padding-bottom: 90px; /* 为吸底结算栏预留空间 */
}
.cart-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
/* 表头与行统一网格 */
.cart-head,
.cart-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px 150px 120px 90px;
  align-items: center;
  padding: 0 20px;
}
.cart-head {
  height: 50px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  letter-spacing: 1px;
}
.cart-head :deep(.el-checkbox__label) {
  color: #fff;
}
.cart-row {
  min-height: 120px;
  border-bottom: 1px solid var(--color-border);
}
.cart-row:last-child {
  border-bottom: none;
}
/* 器物信息单元 */
.goods-cell {
  display: flex;
  gap: 14px;
  align-items: center;
  cursor: pointer;
  padding: 14px 0;
}
.goods-cell img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.goods-meta .name {
  font-size: 15px;
  color: var(--color-text);
  margin-bottom: 6px;
  transition: color 0.2s;
}
.goods-cell:hover .name {
  color: var(--color-primary);
}
.goods-meta .spec {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 6px;
}
.col-price {
  font-size: 16px;
}
.col-subtotal {
  font-size: 18px;
  font-weight: 700;
}
/* 吸底结算栏 */
.settle-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding: 14px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
}
.settle-left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.settle-right {
  display: flex;
  align-items: center;
  gap: 24px;
}
.settle-info {
  font-size: 14px;
  color: var(--color-text-light);
}
.settle-info em {
  color: var(--color-accent);
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
}
.total-price {
  font-family: var(--font-title);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-accent);
}
.settle-btn {
  padding: 0 36px;
}

/* ===== 响应式：移动端卡片化 ===== */
@media (max-width: 768px) {
  .cart-head {
    display: none; /* 移动端隐藏表头 */
  }
  .cart-row {
    grid-template-columns: 40px 1fr;
    grid-template-areas:
      'check goods'
      'check price'
      'check qty'
      'check op';
    gap: 8px 10px;
    padding: 14px;
    position: relative;
  }
  .col-check {
    grid-area: check;
    align-self: start;
    margin-top: 30px;
  }
  .col-goods {
    grid-area: goods;
  }
  .col-price {
    grid-area: price;
  }
  .col-price::before {
    content: '单价：';
    color: var(--color-text-muted);
    font-size: 13px;
  }
  .col-qty {
    grid-area: qty;
  }
  .col-subtotal {
    display: none; /* 移动端小计合并到单价×数量，简化 */
  }
  .col-op {
    grid-area: op;
    justify-self: start;
  }
  .settle-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  .settle-right {
    justify-content: space-between;
  }
}
</style>
