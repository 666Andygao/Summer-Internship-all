<script setup>
// 页面4：订单结算页面
// 收货地址（新增/切换）+ 订单清单 + 费用汇总 + 提交订单（前端弹窗提示）
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCartStore } from '@/store/cart'
import { useAddressStore } from '@/store/address'
import { submitOrder } from '@/api/goods'

const router = useRouter()
const cartStore = useCartStore()
const addressStore = useAddressStore()
const { list: addressList } = storeToRefs(addressStore)

// 结算商品 = 购物车中已勾选的条目
const checkoutItems = computed(() => cartStore.checkedItems)
// 商品总额
const goodsAmount = computed(() => cartStore.checkedAmount)
// 运费：满 99 包邮，否则 12 元（纯前端演示规则）
const freight = computed(() => (goodsAmount.value >= 99 || goodsAmount.value === 0 ? 0 : 12))
// 应付总额
const payAmount = computed(() => goodsAmount.value + freight.value)

// 当前选中地址 id
const selectedAddressId = ref(null)
onMounted(() => {
  // 无结算商品时，回退到购物车
  if (!checkoutItems.value.length) {
    ElMessage.warning('没有待结算的器物，请先在购物车勾选')
    router.replace('/cart')
    return
  }
  selectedAddressId.value = addressStore.defaultAddress?.id || null
})

// 订单备注
const remark = ref('')

// ===== 新增地址弹窗 =====
const dialogVisible = ref(false)
const formRef = ref(null)
const addrForm = reactive({ name: '', phone: '', region: '', detail: '' })
// 表单校验规则（纯前端校验）
const rules = {
  name: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  region: [{ required: true, message: '请输入所在地区', trigger: 'blur' }],
  detail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

function openAddDialog() {
  Object.assign(addrForm, { name: '', phone: '', region: '', detail: '' })
  dialogVisible.value = true
}
// 保存新地址
async function saveAddress() {
  await formRef.value.validate()
  const id = addressStore.addAddress({ ...addrForm })
  selectedAddressId.value = id
  addressStore.setDefault(id)
  dialogVisible.value = false
  ElMessage.success('收货地址已添加')
}

// ===== 提交订单（仅前端弹窗提示，不接真实支付）=====
const submitting = ref(false)
async function onSubmit() {
  if (!selectedAddressId.value) {
    ElMessage.warning('请选择收货地址')
    return
  }
  submitting.value = true
  try {
    // 调用 api 层（内部为前端模拟，返回假订单号）
    // TODO(后端对接): 替换为真实下单接口 POST /api/orders，并跳转真实支付
    const res = await submitOrder({
      items: checkoutItems.value,
      addressId: selectedAddressId.value,
      remark: remark.value,
      totalAmount: payAmount.value
    })
    // 下单成功弹窗
    await ElMessageBox.alert(
      `<div style="line-height:1.9">
        <p>订单号：<strong>${res.orderNo}</strong></p>
        <p>应付金额：<strong style="color:#c0392b">¥${payAmount.value.toFixed(0)}</strong></p>
        <p style="color:#9a9284;font-size:13px">（本页为前端演示，未接入真实支付渠道）</p>
      </div>`,
      '订单提交成功',
      { dangerouslyUseHTMLString: true, confirmButtonText: '返回首页', type: 'success' }
    )
    // 清空已结算商品，返回首页
    cartStore.clearChecked()
    router.push('/')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="checkout-view container">
    <div class="section-title">
      <h2>订单结算</h2>
      <span class="sub">Checkout</span>
    </div>

    <div class="checkout-layout">
      <!-- 左侧主区 -->
      <div class="checkout-main">
        <!-- 收货地址 -->
        <section class="block">
          <div class="block-head">
            <h3>收货地址</h3>
            <el-button link type="primary" :icon="'Plus'" @click="openAddDialog">新增地址</el-button>
          </div>
          <div class="address-list">
            <div
              v-for="addr in addressList"
              :key="addr.id"
              class="address-card"
              :class="{ active: selectedAddressId === addr.id }"
              @click="selectedAddressId = addr.id"
            >
              <div class="addr-top">
                <span class="addr-name">{{ addr.name }}</span>
                <span class="addr-phone">{{ addr.phone }}</span>
                <span v-if="addr.isDefault" class="addr-default">默认</span>
              </div>
              <p class="addr-detail">{{ addr.region }} {{ addr.detail }}</p>
              <el-icon v-if="selectedAddressId === addr.id" class="addr-check"><CircleCheckFilled /></el-icon>
            </div>
          </div>
        </section>

        <!-- 订单清单 -->
        <section class="block">
          <div class="block-head"><h3>器物清单</h3></div>
          <div class="order-table">
            <div class="order-head">
              <span class="oc-goods">器物</span>
              <span class="oc-price">单价</span>
              <span class="oc-qty">数量</span>
              <span class="oc-sub">小计</span>
            </div>
            <div v-for="item in checkoutItems" :key="item.id + item.spec" class="order-row">
              <div class="oc-goods goods-cell">
                <img :src="item.cover" :alt="item.name" />
                <div>
                  <p class="name">{{ item.name }}</p>
                  <span class="ethnic-tag">{{ item.ethnic }}</span>
                  <p class="spec" v-if="item.spec">规格：{{ item.spec }}</p>
                </div>
              </div>
              <span class="oc-price">¥{{ item.price }}</span>
              <span class="oc-qty">×{{ item.quantity }}</span>
              <span class="oc-sub price">¥{{ (item.price * item.quantity).toFixed(0) }}</span>
            </div>
          </div>
        </section>

        <!-- 订单备注 -->
        <section class="block">
          <div class="block-head"><h3>订单备注</h3></div>
          <el-input
            v-model="remark"
            type="textarea"
            :rows="2"
            maxlength="100"
            show-word-limit
            placeholder="选填：如对器物包装、发货时间等有特殊要求，可在此说明"
          />
        </section>
      </div>

      <!-- 右侧费用汇总 -->
      <aside class="checkout-aside">
        <div class="summary-card">
          <h3>费用明细</h3>
          <ul class="summary-list">
            <li><span>商品总额</span><span>¥{{ goodsAmount.toFixed(0) }}</span></li>
            <li><span>运费</span><span>{{ freight === 0 ? '包邮' : `¥${freight}` }}</span></li>
            <li class="gift"><span>非遗传承公益金</span><span>已包含</span></li>
          </ul>
          <div class="summary-total">
            <span>应付总额</span>
            <span class="pay-price"><span class="unit">¥</span>{{ payAmount.toFixed(0) }}</span>
          </div>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="submitting"
            @click="onSubmit"
          >
            提交订单
          </el-button>
          <p class="submit-tip">点击提交即表示同意《非遗器物购买须知》</p>
        </div>
      </aside>
    </div>

    <!-- 新增地址弹窗 -->
    <el-dialog v-model="dialogVisible" title="新增收货地址" width="460px">
      <el-form ref="formRef" :model="addrForm" :rules="rules" label-width="80px">
        <el-form-item label="收货人" prop="name">
          <el-input v-model="addrForm.name" placeholder="请输入收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="addrForm.phone" placeholder="请输入 11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="所在地区" prop="region">
          <el-input v-model="addrForm.region" placeholder="如：贵州省 黔东南州 凯里市" />
        </el-form-item>
        <el-form-item label="详细地址" prop="detail">
          <el-input v-model="addrForm.detail" type="textarea" :rows="2" placeholder="街道、楼牌号等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAddress">保存地址</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}
/* 区块通用 */
.block {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  margin-bottom: 20px;
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--color-primary);
}
.block-head h3 {
  font-size: 18px;
  letter-spacing: 2px;
}
/* 地址卡片 */
.address-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.address-card {
  position: relative;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg);
}
.address-card:hover {
  border-color: var(--color-primary-light);
}
.address-card.active {
  border-color: var(--color-primary);
  background: rgba(192, 57, 43, 0.05);
  box-shadow: var(--shadow-card);
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.addr-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}
.addr-phone {
  color: var(--color-text-light);
  font-size: 14px;
}
.addr-default {
  font-size: 11px;
  color: #fff;
  background: var(--color-secondary);
  padding: 1px 6px;
  border-radius: 2px;
}
.addr-detail {
  font-size: 13px;
  color: var(--color-text-light);
  line-height: 1.7;
}
.addr-check {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 22px;
  color: var(--color-primary);
}
/* 订单清单 */
.order-head,
.order-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px 100px;
  align-items: center;
}
.order-head {
  padding: 10px 0;
  color: var(--color-text-muted);
  font-size: 13px;
  border-bottom: 1px dashed var(--color-border);
}
.order-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}
.order-row:last-child {
  border-bottom: none;
}
.goods-cell {
  display: flex;
  gap: 12px;
  align-items: center;
}
.goods-cell img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.goods-cell .name {
  font-size: 14px;
  margin-bottom: 6px;
}
.goods-cell .spec {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
.oc-sub {
  font-weight: 700;
}
/* 右侧汇总 */
.summary-card {
  position: sticky;
  top: 90px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 22px 24px;
}
.summary-card h3 {
  font-size: 18px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--color-primary);
  margin-bottom: 16px;
}
.summary-list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: var(--color-text-light);
}
.summary-list .gift span:last-child {
  color: var(--color-secondary);
}
.summary-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px dashed var(--color-border);
}
.pay-price {
  font-family: var(--font-title);
  font-size: 30px;
  font-weight: 700;
  color: var(--color-accent);
}
.submit-btn {
  width: 100%;
  margin-top: 20px;
  height: 48px;
  font-size: 17px;
  letter-spacing: 4px;
}
.submit-tip {
  margin-top: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .checkout-layout {
    grid-template-columns: 1fr;
  }
  .summary-card {
    position: static;
  }
}
@media (max-width: 768px) {
  .address-list {
    grid-template-columns: 1fr;
  }
  .order-head {
    display: none;
  }
  .order-row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'goods sub'
      'goods qty';
    gap: 4px 10px;
  }
  .oc-goods {
    grid-area: goods;
  }
  .oc-price {
    display: none;
  }
  .oc-qty {
    grid-area: qty;
    text-align: right;
    color: var(--color-text-muted);
  }
  .oc-sub {
    grid-area: sub;
    text-align: right;
  }
}
</style>
