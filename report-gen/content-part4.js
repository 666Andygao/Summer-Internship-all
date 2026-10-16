// 报告内容 第四部分：文化内容建设、测试、部署、创新点、展望、附录
module.exports = [
  { type: 'h2', text: '九、非遗文化内容建设' },
  { type: 'h3', text: '9.1 非遗档案库' },
  { type: 'p', text: '平台建成结构化非遗知识库（docs/ 目录 16 份技艺介绍档案 + archive.html 档案检索页），档案统一采用"历史源流—非遗地位—文化意义—工艺特色—制作工艺—传承发展—结语"标准模板，涵盖器物名称、所属民族、非遗等级、产地、制作工艺介绍、文化寓意解读等要素。16 份档案覆盖云贵川三省：' },
  { type: 'table',
    headers: ['省份', '档案清单'],
    rows: [
      ['云南（2 份）', '建水紫陶烧制技艺、白族扎染技艺'],
      ['四川（11 份）', '彝族漆器髹饰技艺、成都漆艺、绵竹木版年画、羌族刺绣、自贡灯会、藏族唐卡、蜀绣、蜀锦织造技艺、青神竹编、苗族刺绣、苗族蜡染'],
      ['贵州（3 份）', '水族马尾绣、玉屏箫笛制作工艺、苗族银饰锻造技艺']
    ],
    colWidths: [1400, 7600]
  },
  { type: 'p', text: '档案详情页（archive-detail.html）支持在线查看 docx 档案内容；每件档案按标准模板编制，构成可检索、可扩展的非遗知识库，为三维模型、电商商品与工艺流程页面提供统一的文化内容底座。' },
  { type: 'h3', text: '9.2 工艺流程数字化' },
  { type: 'p', text: '为 5 个核心技艺分别设计工艺流程页（process.html、process2~5.html），将技艺的工序链数字化呈现（如苗族银饰的"融银→锤揲→錾花→焊接→酸洗→拉丝与搓丝→抛光"、火草纺织的"采火草→剥麻→煮麻→撕绒捻线→排线上机→纺织→成布"），并配套工艺步骤图片（模型*图片目录）与全屏展示版本（模型*全屏展示目录），实现文化基因的沉浸式可视化。' },
  { type: 'h3', text: '9.3 文化基因可视化' },
  { type: 'p', text: '平台将"非遗色彩图谱"（颜色—门类映射）、"非遗等级/民族标签"（国家级/省级/州市级非遗）、"匠人档案"（传承人姓名、头衔、从业年限）等文化要素嵌入三维展示页与电商商品卡片，使文化属性与商品属性绑定，实现从"看物"到"读文化"的信息架构升级。' },

  { type: 'h2', text: '十、系统测试与质量保障' },
  { type: 'h3', text: '10.1 单元测试' },
  { type: 'p', text: 'server.js 通过 __test_helpers 导出纯业务函数集（支付安全校验、订单支付一致性校验、支付请求/日志构建、售后请求/决策/物流更新、评价创建），tests/ 目录编写对应单元测试（Node 内置 assert，无需额外框架）：' },
  { type: 'table',
    headers: ['测试文件', '覆盖点'],
    rows: [
      ['payment-security.test.js', '支付方式白名单、回调令牌校验、金额与订单一致性、支付日志构建'],
      ['after-sales.test.js', '售后申请创建（类型/状态/订单关联正确性）'],
      ['reviews.test.js', '评价创建与字段完整性']
    ],
    colWidths: [2600, 6400]
  },
  { type: 'h3', text: '10.2 功能与兼容性测试' },
  { type: 'p', text: '对各功能模块开展集成测试、跨浏览器兼容性测试与移动端适配测试：验证注册登录—商品发布—购物车下单—支付—发货—评价—售后的全链路贯通；验证游客购物车与登录态购物车合并；验证支付回调金额篡改拦截；验证 3D 模型加载失败降级路径；验证响应式布局在 PC/移动端的一致性。' },

  { type: 'h2', text: '十一、部署与运行' },
  { type: 'h3', text: '11.1 运行环境' },
  { type: 'table',
    headers: ['组件', '环境要求'],
    rows: [
      ['Node.js 后端', 'Node.js ≥ 18（本项目使用 v24），npm 依赖：express/jsonwebtoken/bcryptjs/multer/cors/uuid'],
      ['电商前端', 'Node.js ≥ 18 + npm；开发模式 npm run dev（热更新，localhost:5173），生产构建 npm run build 输出 dist/'],
      ['Spring Boot 后端', 'JDK 17 + Maven 3.8+ + MySQL 8.0（数据库 heritage_ecommerce），mvn clean package && mvn spring-boot:run（localhost:8080）'],
      ['静态托管', 'Netlify（index.html + _redirects 支持 SPA 路由回退）']
    ],
    colWidths: [1800, 7200]
  },
  { type: 'h3', text: '11.2 启动方式' },
  { type: 'code', text: '# 1. 启动主平台 Node 后端（根目录）\nnode server.js\n#   主页 http://localhost:3000/MainPage.html\n#   登录 http://localhost:3000/login.html\n#   商城 http://localhost:3000/shop/（需先构建电商前端）\n\n# 2. 构建电商商城（build-shop.bat 或手动）\ncd feiyi-ecommerce && npm install && npm run build\n\n# 3. 电商前端开发模式（可选，热更新）\ncd feiyi-ecommerce && npm run dev' },
  { type: 'h3', text: '11.3 部署方案' },
  { type: 'p', text: '前端静态资源可托管于 Netlify（主平台 + 电商商城），Node.js 后端与 MySQL 部署于服务器；商城构建产物部署于主平台 /shop/ 路径实现同源共享 localStorage 单点登录；Spring Boot 骨架作为生产后端演进方向，替换 JSON 文件持久化为 MySQL 持久化，接口规范保持不变，前端仅需切换 API 代理目标。' },

  { type: 'h2', text: '十二、项目创新点总结' },
  { type: 'table',
    headers: ['创新方向', '创新内容'],
    rows: [
      ['文化基因可视化', '提取传统色值构建"非遗色彩图谱"，建立颜色与非遗门类的映射关系，实现"看一眼颜色便知类别"的无意识认知引导'],
      ['文化浸润式电商', '商品卡片与详情页高亮植入非遗等级、民族标签与文化背景，打破"重价格、轻文化"架构，以文化溢价反哺传承人收入'],
      ['三位一体数字建档', '三维模型（GLTF/OBJ）+ 结构化图文档案 + 工艺流程数字化，形成"数字建档—三维呈现—电商转化—内容传播"四位一体活态传承模型'],
      ['三维展示交互创新', '"总览—详情—子版本轮播"三级架构、弧形旋转导航、可见性动态裁剪、双层动画协同、零依赖原生实现，60fps 流畅体验'],
      ['轻量级数据一致性', 'Pinia + localStorage 持久化解决弱网环境购物车丢失/订单状态不同步问题，支持同规格合并、登录态同步、游客购物车'],
      ['双后端平滑演进', 'Express JSON 原型与 Spring Boot + MySQL 生产骨架共享接口规范与数据模型，支持从原型到生产的平滑升级'],
      ['跨平台导流预留', '第三方商品解析与商品映射表设计，支持京东/淘宝数据标准化转换与多平台流量互通']
    ],
    colWidths: [2000, 7000]
  },

  { type: 'h2', text: '十三、展望与后续工作' },
  { type: 'ul', text: '将 JSON 文件持久化升级为真实 MySQL/PostgreSQL 数据库，落地完整 Controller/Service/Mapper 工程；' },
  { type: 'ul', text: '接入真实支付网关（支付宝/微信）、物流接口与短信验证码服务，完善支付超时与风控告警；' },
  { type: 'ul', text: '实现京东/淘宝第三方商品抓取与标准化解析，打通跨平台导流链路；' },
  { type: 'ul', text: '优化三维模型加载性能（GLTF/GLB 格式、Draco 压缩、LOD 分级），支持 720 云平台方案与移动端 AR 体验；' },
  { type: 'ul', text: '扩展非遗档案至 20 件以上，接入区块链溯源，完善评价审核与商家经营分析报表；' },
  { type: 'ul', text: '完善前端与后端联调脚本、自动化测试与 CI/CD 流水线，保障平台可持续迭代。' },
  { type: 'spacer' },

  { type: 'h2', text: '附录 A：核心 API 接口清单（节选）' },
  { type: 'table',
    headers: ['方法', '路径', '说明'],
    rows: [
      ['POST', '/api/register', '用户注册（含角色选择）'],
      ['POST', '/api/login', '用户登录，签发 JWT'],
      ['GET', '/api/me', '当前用户信息'],
      ['POST', '/api/merchants/apply', '商家入驻申请'],
      ['POST', '/api/products', '商家发布商品'],
      ['GET', '/api/products', '商品列表（筛选/排序/分页）'],
      ['POST', '/api/cart/items', '加入购物车（登录态/游客）'],
      ['POST', '/api/cart/checkout', '购物车结算生成订单'],
      ['GET', '/api/orders', '我的订单列表'],
      ['PATCH', '/api/orders/:id/status', '订单状态流转'],
      ['POST', '/api/orders/:id/shipment', '商家发货'],
      ['POST', '/api/orders/:id/pay', '发起支付'],
      ['POST', '/api/orders/:id/pay/callback', '支付回调（金额校验）'],
      ['POST', '/api/after-sales', '售后申请（退款/退货/换货）'],
      ['PATCH', '/api/after-sales/:id/review', '售后审核'],
      ['POST', '/api/orders/:id/reviews', '订单完成后评价'],
      ['GET', '/api/stats/sales', '销量统计'],
      ['GET', '/api/stats/orders/trend', '订单趋势分析'],
      ['GET', '/api/database-er', '数据库 ER 设计文档'],
      ['GET', '/api/business-flow', '业务流程定义']
    ],
    colWidths: [1100, 3800, 4100]
  },

  { type: 'h2', text: '附录 B：数据库核心表清单' },
  { type: 'p', text: 'users、merchants、products、product_categories、product_attributes、addresses、favorites、carts、orders、order_items、payments、payment_credentials、after_sales、reviews、conversations、messages、complaints、coupons（17 张核心表），预留 third_party_product_mapping、product_crawl_log / third_party_crawl_log（跨平台导流扩展）。' },

  { type: 'h2', text: '附录 C：非遗技艺档案清单（16 份）' },
  { type: 'table',
    headers: ['省份', '技艺名称'],
    rows: [
      ['云南', '建水紫陶烧制技艺（国家级非遗）、白族扎染技艺（国家级非遗）'],
      ['四川', '彝族漆器髹饰技艺、成都漆艺、绵竹木版年画、羌族刺绣、自贡灯会、藏族唐卡、蜀绣、蜀锦织造技艺、青神竹编'],
      ['贵州', '水族马尾绣、玉屏箫笛制作工艺、苗族刺绣、苗族蜡染技艺、苗族银饰锻造技艺']
    ],
    colWidths: [1400, 7600]
  },

  { type: 'h2', text: '附录 D：参考文献（摘自立项申报书）' },
  { type: 'p', text: '[1] 刘建光, 赵瞳铱. 以铸牢中华民族共同体意识为主线做好新时代涉民族宣传的路径研究[J]. 族论坛, 2026(1): 93-105.' },
  { type: 'p', text: '[2] 武炜. 基于 FastAdmin 框架的民族文化类网站的设计与实现[J]. 电脑知识与技术, 2022, 18(6): 68-70.' },
  { type: 'p', text: '[3] 李远兰. 传播生态学视角下少数民族文化网站的现状与思考[C]//《人文与科技》（第二辑）. 中央民族大学出版社, 2019: 120-133.' },
  { type: 'p', text: '[5] 何涛, 刘春诚, 韩利凯. 基于 B/S 架构的民族特色商品网站的设计与实现[J]. 电子世界, 2017(7): 35.' },
  { type: 'p', text: '[6] 王晓哲. 网站建设与中国西部少数民族特色村寨保护的发展研究[J]. 中国商论, 2015(18): 159-162.' },
  { type: 'p', text: '[12] 梁晨浩. 基于 Spring Boot 框架的在线服务网站开发与实践研究[J]. 智能制造研究与应用, 2026, 2(6): 28-30.' },
  { type: 'p', text: '[14] 黄奉君, 黄圣游. 滇西南地区少数民族传统竹桌的形态特征探析[J]. 家具与室内装饰, 2026, 33(2): 70-74.' },
  { type: 'p', text: '[15] 黄奉君, 付佳璐, 黄圣游. 滇西南少数民族传统竹桌的风格特征及成因探析[J]. 天工, 2026(1): 32-35.' },
  { type: 'spacer' },
  { type: 'p', text: '—— 报告完 ——', opts: { align: 'center' } }
];
