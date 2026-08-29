# 数赋黔滇 · 非遗器物商城（电商前端模块）

> 「数赋黔滇——赴黔滇调研西南少数民族非物质文化遗产器物数字化保护路径与电商赋能活态传承创新实践」官网 · **电商模块**
>
> 售卖主体：黔滇区域苗族、彝族、布依族等西南少数民族非遗手工器物。
> 视觉对标「中国非物质文化遗产官网 ihchina.cn」，沉稳素雅中式国风，拒绝艳丽浮夸的商业电商视觉。

---

## 一、技术栈

| 类别 | 选型 |
| --- | --- |
| 开发框架 | Vue 3 + Vite 5 |
| UI 组件库 | Element Plus |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia（购物车 / 收货地址，localStorage 持久化） |
| 网络请求 | Axios（已封装，仅预留后端接口模板 + 中文注释） |
| 样式 | CSS3 + 响应式设计（同时适配 PC 端与手机移动端） |

> **数据策略**：全部商品、分类、评价数据均为**前端模拟假数据**，脱离后端服务页面也可完整运行展示。
> 图片已接入 `public/images/goods/` 下的真实模型贴图与工艺过程图；无匹配素材的商品继续使用纯前端生成的 SVG 占位图兜底，无需联网即可显示。

---

## 二、页面与功能清单

| 页面 | 路由 | 核心功能 |
| --- | --- | --- |
| 非遗电商首页 | `/` | 顶部通栏导航（导航/搜索/购物车/个人中心）、多条件筛选侧边栏（民族/品类/价格）、瀑布流商品卡片、排序、分页 |
| 商品详情页 | `/goods/:id` | 高清图集轮播、规格选择、加入购物车、立即购买、Tab（非遗档案/匠人/评价）、同类推荐 |
| 购物车页 | `/cart` | 单选/全选、数量增减、单品删除、实时统计件数与总价、去结算 |
| 订单结算页 | `/checkout` | 收货地址新增/切换、订单清单、费用汇总、提交订单（前端弹窗提示，未接真实支付） |

---

## 三、项目目录结构

```
feiyi-ecommerce/
├── index.html                 # HTML 入口
├── package.json               # 依赖与脚本
├── vite.config.js             # Vite 配置（含 @ 别名、后端代理模板）
├── README.md                  # 本文档
├── public/
│   ├── favicon.svg            # 站点图标
│   └── images/goods/          # 商品真实模型贴图 / 工艺过程静态图
└── src/
    ├── main.js                # 应用入口（注册 Vue/Router/Pinia/Element Plus）
    ├── App.vue                # 根组件（Header + 路由视图 + Footer）
    ├── router/
    │   └── index.js           # 路由配置（懒加载 + 标题守卫）
    ├── api/
    │   ├── request.js         # Axios 实例封装（拦截器 / 错误处理模板）
    │   └── goods.js           # 商品业务接口（假数据实现 + 后端接口点注释）
    ├── store/
    │   ├── cart.js            # 购物车 Pinia store
    │   └── address.js         # 收货地址 Pinia store
    ├── mock/
    │   └── goods.js           # 商品 / 分类 / 评价 假数据
    ├── utils/
    │   └── placeholder.js     # 纯前端 SVG 占位图生成工具
    ├── styles/
    │   ├── variables.css      # 国风配色 / 字体设计变量
    │   └── global.css         # 全局基础样式
    ├── components/
    │   ├── TheHeader.vue      # 顶部通栏导航
    │   ├── TheFooter.vue      # 页脚
    │   ├── GoodsCard.vue      # 商品卡片
    │   └── FilterSidebar.vue  # 筛选侧边栏
    └── views/
        ├── HomeView.vue       # 页面1：首页
        ├── GoodsDetailView.vue# 页面2：详情
        ├── CartView.vue       # 页面3：购物车
        └── CheckoutView.vue   # 页面4：结算
```

---

## 四、本地启动与预览教程

### 1. 环境要求
- Node.js **≥ 18**（推荐 18 / 20 / 22 LTS）
- npm ≥ 9（或使用 pnpm / yarn）

检查版本：
```bash
node -v
npm -v
```

### 2. 安装依赖
在本项目根目录 `feiyi-ecommerce/` 下执行：
```bash
npm install
```

### 3. 启动开发服务器（热更新）
```bash
npm run dev
```
启动成功后终端会显示本地访问地址（默认已配置自动打开浏览器）：
```
  ➜  Local:   http://localhost:5173/
```
在浏览器打开该地址即可预览。修改代码将自动热更新。

### 4. 打包构建（生产环境）
```bash
npm run build
```
产物输出到 `dist/` 目录。

### 5. 本地预览构建产物
```bash
npm run preview
```

---

## 五、后端对接说明（给后端同学）

- 所有网络请求已在 `src/api/goods.js` 中封装，**每个函数都标注了「对应后端业务点」**（如 `GET /api/goods`）。
- 对接时：取消函数内 `request.xxx(...)` 的注释，注释掉 / 删除下方的 mock 假数据返回即可，字段结构保持一致。
- 当前前端商品字段已包含 `cover`、`gallery`、`processImages`、`modelAssets`，后端上线后可直接返回同名图片 URL 字段替换静态资源路径。
- 统一约定后端返回结构：`{ code, message, data }`，`code === 0 或 200` 视为成功（见 `src/api/request.js` 响应拦截器）。
- 跨域代理已在 `vite.config.js` 的 `server.proxy` 中预留（`/api` → `http://localhost:8080`），联调时修改 `target` 即可。
- 登录鉴权 Token 注入位置已在请求拦截器中以 `TODO` 注释标出。
- 提交订单（`submitOrder`）当前仅前端弹窗提示成功，**未接入真实支付渠道**，对接位置已注释标注。

---

## 六、设计说明

- **配色**：主色深青 `#1f4e4a`、辅色赭石 `#9c5a34`、背景米白 `#f6f2ea`，价格点缀朱砂红 `#a5372f`，见 `src/styles/variables.css`。
- **字体**：标题用厚重宋体系，正文用清晰黑体系，契合非遗官方网站庄重气质。
- **纹样与图片**：页面背景、Banner、占位图以纯 CSS / SVG 生成少数民族简约织纹；重点商品已接入模型贴图与工艺流程静态图，增强数字化展示效果。
- **响应式**：PC 端多栏布局，移动端自动切换为单列 / 抽屉导航 / 卡片化列表。
