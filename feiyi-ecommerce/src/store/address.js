/*
 * 收货地址状态管理（Pinia）
 * 负责：地址的新增、切换默认地址，并持久化到 localStorage。
 *       （纯前端逻辑，后端对接后可替换为地址接口）
 */
import { defineStore } from 'pinia'

const STORAGE_KEY = 'feiyi_address'

function loadFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.length) return saved
  } catch {
    /* ignore */
  }
  // 预置两条示例地址，便于结算页直接演示
  return [
    {
      id: 1,
      name: '龙晓黔',
      phone: '138****6688',
      region: '贵州省 黔东南苗族侗族自治州 凯里市',
      detail: '苗侗风情园 12 栋 3 单元 501',
      isDefault: true
    },
    {
      id: 2,
      name: '普阿彝',
      phone: '159****2233',
      region: '云南省 楚雄彝族自治州 楚雄市',
      detail: '彝人古镇文创街 8 号',
      isDefault: false
    }
  ]
}

export const useAddressStore = defineStore('address', {
  state: () => ({
    list: loadFromStorage()
  }),

  getters: {
    // 当前选中的默认地址
    defaultAddress: (state) => state.list.find((a) => a.isDefault) || state.list[0] || null
  },

  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list))
    },

    // 新增地址；若首条则自动设为默认
    addAddress(addr) {
      const id = Date.now()
      const isFirst = this.list.length === 0
      this.list.push({ ...addr, id, isDefault: isFirst })
      this.persist()
      return id
    },

    // 切换默认（选中）地址
    setDefault(id) {
      this.list.forEach((a) => (a.isDefault = a.id === id))
      this.persist()
    }
  }
})
