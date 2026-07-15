/*
 * 购物车状态管理（Pinia）
 * 负责：加购、数量增减、勾选/全选、删除、金额统计，并持久化到 localStorage，
 *       刷新页面后购物车不丢失。（纯前端逻辑，不涉及后端）
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'feiyi_cart'

// 从本地存储读取初始购物车数据
function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    // 购物车条目：{ id, name, cover, ethnic, price, spec, quantity, checked }
    items: loadFromStorage()
  }),

  getters: {
    // 购物车商品种类数（顶部角标使用）
    totalCount: (state) => state.items.reduce((sum, i) => sum + i.quantity, 0),
    // 已勾选的条目
    checkedItems: (state) => state.items.filter((i) => i.checked),
    // 是否全选
    isAllChecked: (state) => state.items.length > 0 && state.items.every((i) => i.checked),
    // 已勾选商品总件数
    checkedCount() {
      return this.checkedItems.reduce((sum, i) => sum + i.quantity, 0)
    },
    // 已勾选商品合计金额
    checkedAmount() {
      return this.checkedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    }
  },

  actions: {
    // 持久化到本地
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
    },

    /**
     * 加入购物车
     * 同一商品 + 同一规格视为同一条目，仅累加数量
     */
    addToCart(goods, spec = '', quantity = 1) {
      const key = (g, s) => `${g.id}__${s}`
      const exist = this.items.find((i) => key(i, i.spec) === key(goods, spec))
      if (exist) {
        exist.quantity += quantity
      } else {
        this.items.push({
          id: goods.id,
          name: goods.name,
          cover: goods.cover,
          ethnic: goods.ethnic,
          price: goods.price,
          spec,
          quantity,
          checked: true // 新加入默认勾选
        })
      }
      this.persist()
    },

    // 修改某条目数量（下限为 1）
    updateQuantity(index, quantity) {
      if (this.items[index]) {
        this.items[index].quantity = Math.max(1, quantity)
        this.persist()
      }
    },

    // 切换单条勾选状态
    toggleChecked(index, checked) {
      if (this.items[index]) {
        this.items[index].checked = checked
        this.persist()
      }
    },

    // 全选 / 全不选
    toggleAll(checked) {
      this.items.forEach((i) => (i.checked = checked))
      this.persist()
    },

    // 删除单条
    removeItem(index) {
      this.items.splice(index, 1)
      this.persist()
    },

    // 清空已勾选（下单成功后调用）
    clearChecked() {
      this.items = this.items.filter((i) => !i.checked)
      this.persist()
    }
  }
})
