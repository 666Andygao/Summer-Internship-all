// 报告内容 第二部分：系统总体设计、网站首页设计、三维模型展示模块
module.exports = [
  { type: 'h2', text: '三、系统总体设计' },
  { type: 'h3', text: '3.1 总体架构' },
  { type: 'p', text: '平台采用"门户展示 + 电商交易 + 三维展示 + 后端服务"的多前端单后端架构。门户与 3D 展示页采用原生 HTML5/CSS3/JavaScript 技术栈（低门槛维护、便于基层推广）；电商模块采用 Vue3 + Vite 组件化开发；后端提供 Node.js Express 原型服务（JSON 文件持久化）与 Spring Boot 生产骨架（MySQL 持久化）两套实现，二者共享同一套 RESTful 接口规范与数据库设计，可平滑升级。' },
  { type: 'p', text: '系统分层遵循 Controller / Service / Mapper（Repository）/ Utils 的四层规范，将 HTTP、业务、数据访问、工具方法分离（PROJECT_LAYER_ARCHITECTURE，见 server.js）：' },
  { type: 'table',
    headers: ['层次', '职责', '典型文件'],
    rows: [
      ['Controller', '接收 HTTP 请求、参数校验、调用 Service、返回统一响应', 'UserController / ProductController / OrderController 等'],
      ['Service', '承载核心业务逻辑、事务管理、状态流转规则', 'UserService / CartService / OrderService / PaymentService / AnalyticsService'],
      ['Mapper/Repository', '数据持久化访问、CRUD 与复杂 SQL', 'UserMapper / ProductMapper / OrderMapper / ReviewMapper'],
      ['Utils/Common', '通用工具：加解密、时间、分页、序列号、文件上传', 'JwtUtil / PasswordUtil / MoneyUtil / FileUploadUtil']
    ],
    colWidths: [1800, 4400, 2800]
  },
  { type: 'h3', text: '3.2 技术选型' },
  { type: 'table',
    headers: ['类别', '选型', '用途说明'],
    rows: [
      ['门户前端', 'HTML5 / CSS3 / 原生 JavaScript', '网站首页、文化档案库、工艺流程页、登录与用户中心'],
      ['三维展示', 'Three.js 0.160（ESM）+ OBJLoader/MTLLoader + OrbitControls', 'OBJ/MTL 模型加载、720° 旋转、缩放、光影渲染、全屏展示'],
      ['3D 交互视觉', 'CSS 3D Transform + requestAnimationFrame', '弧形导航、3D 空间轮播、动画性能优化'],
      ['电商前端', 'Vue 3 + Vite 5 + Element Plus + Vue Router 4 + Pinia + Axios', '商品首页/详情/购物车/结算，localStorage 持久化'],
      ['后端（原型）', 'Node.js Express 4 + JWT + bcryptjs + multer + cors + uuid', '126 个 RESTful API，JSON 文件数据库持久化'],
      ['后端（生产骨架）', 'Spring Boot 2.7 + MyBatis 2.3 + MySQL 8.0 + PageHelper + JJWT', '分层工程骨架，MySQL 持久化，可直接运行扩展'],
      ['数据存储', 'database.json（原型）/ MySQL 8.0（生产）', '17 张核心业务表 + 2 张第三方扩展表'],
      ['部署', 'Netlify（前端静态托管）+ 本地 Node 服务（3000）+ Spring Boot（8080）', '商城构建产物部署于 /shop/ 路径与主平台同源']
    ],
    colWidths: [1500, 4200, 3300]
  },
  { type: 'h3', text: '3.3 项目目录结构' },
  { type: 'p', text: '项目采用多模块目录组织：根目录存放主平台静态页面与 Node 后端（server.js）；feiyi-ecommerce/ 为 Vue3 电商前端；heritage-ecommerce-springboot/ 为 Spring Boot 后端骨架；docs/ 存放非遗技艺档案；模型*目录存放三维模型资源与工艺图片；tests/ 存放单元测试。电商前端按"页面—组件—状态—接口"分层组织：' },
  { type: 'code', text: 'feiyi-ecommerce/\n├── index.html / vite.config.js / package.json\n├── public/                 # favicon 与 Netlify 重定向\n└── src/\n    ├── main.js / App.vue    # 应用入口（Vue/Router/Pinia/Element Plus）\n    ├── router/index.js      # 路由配置（懒加载 + 标题守卫）\n    ├── api/                 # request.js（Axios 封装）、goods.js（业务接口）\n    ├── store/               # cart.js、address.js（Pinia + localStorage）\n    ├── mock/goods.js        # 商品/分类/评价假数据\n    ├── utils/placeholder.js # 纯前端 SVG 占位图生成\n    ├── styles/              # variables.css（国风变量）、global.css\n    ├── components/          # TheHeader / TheFooter / GoodsCard / FilterSidebar\n    └── views/               # HomeView / GoodsDetailView / CartView / CheckoutView / UserCenterView' },

  { type: 'h2', text: '四、网站首页设计' },
  { type: 'h3', text: '4.1 设计定位与视觉风格' },
  { type: 'p', text: '首页（MainPage.html，"华夏风物志 · 非遗传承"）定位为兼具文化传播与资源导航功能的非遗综合门户。视觉风格沉稳素雅：主色朱红（#c0392b）点缀、米白（#f5f5f5/#f2ebe4）底色、庄重黑体与衬线搭配，契合非遗官方气质，规避艳丽浮夸的商业化视觉。页面背景融入淡化的文化符号装饰（如浮动 ✦ 符号），营造文化沉浸感。' },
  { type: 'h3', text: '4.2 页面结构设计' },
  { type: 'table',
    headers: ['板块', '内容与功能'],
    rows: [
      ['顶部栏（top-bar）', '语言/地区、登录状态入口，滚动时背景与阴影平滑过渡'],
      ['主导航（main-nav）', '品牌标识（华夏风物志）、导航链接（首页/文化档案/三维模型/电商商城等）、图标操作区，悬停下划线动画'],
      ['主横幅（hero-section）', '品牌标语、核心价值主张，背景径向渐变 + 装饰符号浮动动画'],
      ['非遗名录概览', '联合国教科文组织非物质文化遗产名录（名册）项目展示'],
      ['推荐板块', '推荐 · 非遗瑰宝：优质非遗内容与代表性项目推荐']
    ],
    colWidths: [2400, 6600]
  },
  { type: 'p', text: '首页实现用户登录状态的本地存储与界面联动（localStorage 保存令牌与基本信息，刷新不丢失），为后续用户系统深度集成预留接口边界；固定式导航确保滚动时快速切换页面；CSS 媒体查询实现响应式适配，优化首屏性能。' },
  { type: 'h3', text: '4.3 非遗色彩图谱与响应式设计' },
  { type: 'p', text: '设计上提出"非遗色彩图谱"文化基因可视化方案：提取南京云锦"红"、景德镇青花"钴蓝"等传统色值，建立颜色与非遗门类的映射关系（民间美术偏暖、传统技艺偏冷青），通过色彩暗示实现"看一眼颜色便知类别"的无意识认知引导。页面通过 CSS 媒体查询实现按需加载与多终端适配，首屏加载控制在 3 秒内。' },

  { type: 'h2', text: '五、三维模型展示模块设计' },
  { type: 'h3', text: '5.1 总体架构：三级信息架构' },
  { type: 'p', text: '三维展示模块采用"总览中心—详情页面—子版本轮播"三级架构，通过空间隐喻、深度隐喻、线性隐喻三种信息过渡方式降低认知负担：' },
  { type: 'ul', text: '第一级 总览中心：模型选择/分类总览页（model.html、model1_submodels.html），展示技艺大类与模型节点；' },
  { type: 'ul', text: '第二级 详情页面：单个器物的 3D 展示页（model1~5.html），Three.js 加载 OBJ/MTL 模型，支持旋转、缩放、局部细节查看，右侧信息面板展示技艺介绍、工艺特征、传承背景；' },
  { type: 'ul', text: '第三级 子版本轮播：同一技艺的多个子模型/角度轮播（model1 银饰 6 个子模型、model5 布卷/衣物 2 个模型切换），通过指示点与左右切换浏览。' },
  { type: 'h3', text: '5.2 3D 模型加载与渲染（Three.js）' },
  { type: 'p', text: '模型页基于 Three.js 0.160（ESM 引入）实现 WebGL 渲染，关键技术点：' },
  { type: 'table',
    headers: ['技术点', '实现方式'],
    rows: [
      ['模型加载', 'OBJLoader + MTLLoader 加载 OBJ/MTL 模型；材质加载失败时自动降级为金属质感标准材质（银色 metalness 0.9）'],
      ['渲染管线', 'WebGLRenderer（antialias、ACESFilmicToneMapping、PCFSoftShadowMap），像素比上限 2 保证清晰度与性能平衡'],
      ['光照系统', '环境光 + 主光（DirectionalLight 投射阴影 2048 贴图）+ 补光 + 轮廓光，突出银饰/陶器材质质感'],
      ['相机控制', 'OrbitControls：自动旋转、阻尼惯性、视角极角限制；滚轮自定义缩放（距离插值限制在 min/max 之间）'],
      ['模型自适应', 'Box3 包围盒计算，自动等比缩放（最长边归一至 4 单位）并居中，兼容不同尺度模型'],
      ['加载体验', '加载遮罩层 + 实时进度百分比（MB 显示），失败时给出友好提示与重试引导'],
      ['动画循环', 'requestAnimationFrame 驱动，卸载时通过状态锁停止，避免泄漏']
    ],
    colWidths: [2100, 6900]
  },
  { type: 'h3', text: '5.3 交互设计' },
  { type: 'p', text: '交互层包含：鼠标拖拽旋转、滚轮缩放、按钮缩放（+/-）、全屏切换（按钮旋转动画）；多模型页面支持左右切换与指示点联动。申报书进一步规划"弧形旋转导航"（半圆弧形节点分布，鼠标移动控制旋转偏移、夹角阈值裁剪仅保留最小 3 个节点可见）、"3D 空间轮播"（CSS 3D Transform 纵深卡片切换）、"双层动画协同"（实时动画循环 + CSS 关键帧 + 状态锁）与"零依赖原生实现"，追求 60fps 流畅刷新与跨设备一致性。' },
  { type: 'h3', text: '5.4 模型资源建设' },
  { type: 'p', text: '项目完成 5 项核心非遗技艺的三维模型采集与制作（OBJ/MTL + 贴图，格式兼容主流 Web 3D 引擎），并配套工艺流程图解（模型*图片/模型*全屏展示目录）：' },
  { type: 'table',
    headers: ['模型', '对应技艺', '代表器物/子模型', '工艺链'],
    rows: [
      ['模型一', '苗族银饰锻造技艺（贵州，国家级非遗）', '仪式人物、金属心、花冠、手镯、吊坠、银项链（6 个子模型）', '融银→锤揲→錾花→焊接→酸洗→拉丝与搓丝→抛光'],
      ['模型二', '牙州陶器/建水紫陶烧制技艺（云南建水，国家级非遗）', '陶瓷花瓶', '采生泥→泥浆制作→拉坯→修坯→花纹制作→上釉→入窑→出窑→晾晒'],
      ['模型三', '云南瓦猫（云南特色建筑陶塑）', '石质塑像', '合泥→塑头→塑身→合坯与修坯→晾晒→烧制'],
      ['模型四', '黄平泥哨（贵州黄平，苗族传统乐器玩具）', '存钱罐造型', '选泥与和泥→手捏塑形→开哨→彩绘→罩漆→阴干→烧制'],
      ['模型五', '火草纺织工艺（四川凉山彝族，唯一植物纤维纺织非遗）', '火草布卷、火草衣物（2 个子模型）', '采火草→剥麻→煮麻→撕绒捻线→排线上机→纺织→成布']
    ],
    colWidths: [1100, 2900, 2500, 2500]
  }
];
