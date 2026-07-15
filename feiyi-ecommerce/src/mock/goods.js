/*
 * 商品假数据（前端模拟）
 * 说明：为满足「脱离后端也可完整运行展示」，全部商品数据在前端硬编码。
 *       后端接口就绪后，可在 src/api/goods.js 中切换为真实请求，字段结构保持一致即可。
 *
 * 售卖主体：黔滇区域苗族、彝族、布依族等西南少数民族非遗手工器物。
 */
import { placeholderImage } from '@/utils/placeholder'

// 民族枚举（与筛选侧边栏对应）
export const ETHNICS = ['苗族', '彝族', '布依族']

// 器物品类枚举
export const CATEGORIES = ['银饰', '蜡染', '刺绣', '织锦', '漆器', '陶器', '乐器', '编织']

// 非遗保护等级枚举（用于详情页展示）
export const HERITAGE_LEVELS = ['国家级非遗', '省级非遗', '州/市级非遗']

// 生成单个器物的多角度图集（用详情页轮播），此处用占位图模拟
function makeGallery(name, id, n = 4) {
  const angles = ['正面', '侧面', '细节', '纹样']
  return Array.from({ length: n }, (_, i) =>
    placeholderImage(`${name}·${angles[i] || i + 1}`, id * 10 + i)
  )
}

// 商品原始数据（不含图片，图片由下方统一补全）
const rawGoods = [
  {
    id: 1,
    name: '苗族银冠头饰',
    ethnic: '苗族',
    category: '银饰',
    level: '国家级非遗',
    origin: '贵州·黔东南',
    price: 2680,
    originalPrice: 3200,
    sales: 128,
    stock: 20,
    specs: ['标准款', '盛装款'],
    brief: '苗族银饰锻制技艺，錾刻蝴蝶妈妈纹样，寓意生生不息。',
    craftsman: { name: '吴通英', title: '国家级非遗代表性传承人', years: 42 }
  },
  {
    id: 2,
    name: '丹寨蜡染方巾',
    ethnic: '苗族',
    category: '蜡染',
    level: '国家级非遗',
    origin: '贵州·丹寨',
    price: 168,
    originalPrice: 220,
    sales: 512,
    stock: 200,
    specs: ['靛蓝', '藏青'],
    brief: '蜡刀点蜡、板蓝根靛染，冰裂纹自然天成，一方一世界。',
    craftsman: { name: '杨芳', title: '省级非遗代表性传承人', years: 26 }
  },
  {
    id: 3,
    name: '彝族漆器酒具',
    ethnic: '彝族',
    category: '漆器',
    level: '国家级非遗',
    origin: '四川·凉山 / 云南延续工艺',
    price: 880,
    originalPrice: 980,
    sales: 76,
    stock: 45,
    specs: ['三件套', '五件套'],
    brief: '彝族髹漆技艺，黑红黄三色为骨，取法日月山川。',
    craftsman: { name: '吉伍巫且', title: '国家级非遗代表性传承人', years: 38 }
  },
  {
    id: 4,
    name: '布依族枫香染台布',
    ethnic: '布依族',
    category: '蜡染',
    level: '省级非遗',
    origin: '贵州·惠水',
    price: 296,
    originalPrice: 360,
    sales: 203,
    stock: 88,
    specs: ['小号 80cm', '大号 120cm'],
    brief: '枫香油代蜡描绘，线条柔润如水墨，被誉为「画在布上的青花瓷」。',
    craftsman: { name: '杨光成', title: '省级非遗代表性传承人', years: 31 }
  },
  {
    id: 5,
    name: '苗族破线绣胸片',
    ethnic: '苗族',
    category: '刺绣',
    level: '国家级非遗',
    origin: '贵州·台江',
    price: 1280,
    originalPrice: 1580,
    sales: 64,
    stock: 15,
    specs: ['单片'],
    brief: '一根丝线破成八股，绣面平滑如缎，龙凤盘绕光影流转。',
    craftsman: { name: '石传英', title: '省级非遗代表性传承人', years: 34 }
  },
  {
    id: 6,
    name: '彝族羊毛擀毡挂饰',
    ethnic: '彝族',
    category: '编织',
    level: '州/市级非遗',
    origin: '云南·楚雄',
    price: 358,
    originalPrice: 420,
    sales: 149,
    stock: 60,
    specs: ['圆形', '方形'],
    brief: '古法擀毡，羊毛经反复揉压成型，纹样取自彝族火把节。',
    craftsman: { name: '普学英', title: '州级非遗代表性传承人', years: 22 }
  },
  {
    id: 7,
    name: '布依族土布织锦围巾',
    ethnic: '布依族',
    category: '织锦',
    level: '省级非遗',
    origin: '贵州·册亨',
    price: 218,
    originalPrice: 268,
    sales: 331,
    stock: 120,
    specs: ['灰蓝', '赭红'],
    brief: '通经断纬手工织造，几何纹层叠，一寸锦一寸光阴。',
    craftsman: { name: '王封利', title: '省级非遗代表性传承人', years: 29 }
  },
  {
    id: 8,
    name: '苗族芦笙（六管）',
    ethnic: '苗族',
    category: '乐器',
    level: '国家级非遗',
    origin: '贵州·雷山',
    price: 1560,
    originalPrice: 1780,
    sales: 42,
    stock: 18,
    specs: ['中音', '高音'],
    brief: '苦竹为管、铜片为簧，芦笙一响，苗岭皆歌。',
    craftsman: { name: '莫厌学', title: '国家级非遗代表性传承人', years: 45 }
  },
  {
    id: 9,
    name: '彝族刺绣挎包',
    ethnic: '彝族',
    category: '刺绣',
    level: '省级非遗',
    origin: '云南·红河',
    price: 468,
    originalPrice: 560,
    sales: 187,
    stock: 70,
    specs: ['单肩', '斜挎'],
    brief: '彝绣以红黑为主、马缨花为魂，针脚密实经久耐用。',
    craftsman: { name: '丁兰英', title: '省级非遗代表性传承人', years: 27 }
  },
  {
    id: 10,
    name: '苗族酸汤陶罐',
    ethnic: '苗族',
    category: '陶器',
    level: '州/市级非遗',
    origin: '贵州·凯里',
    price: 138,
    originalPrice: 168,
    sales: 268,
    stock: 150,
    specs: ['1L', '2L'],
    brief: '土陶柴烧，透气不透水，苗家酸汤发酵的老味道。',
    craftsman: { name: '龙初凡', title: '州级非遗代表性传承人', years: 33 }
  },
  {
    id: 11,
    name: '布依族银项圈',
    ethnic: '布依族',
    category: '银饰',
    level: '省级非遗',
    origin: '贵州·贞丰',
    price: 1980,
    originalPrice: 2360,
    sales: 53,
    stock: 25,
    specs: ['素圈', '花丝'],
    brief: '布依银饰以素雅见长，花丝掐制细如发丝，衬布依女子温婉。',
    craftsman: { name: '罗吉方', title: '省级非遗代表性传承人', years: 30 }
  },
  {
    id: 12,
    name: '彝族月琴',
    ethnic: '彝族',
    category: '乐器',
    level: '省级非遗',
    origin: '云南·大理',
    price: 1180,
    originalPrice: 1360,
    sales: 38,
    stock: 22,
    specs: ['四弦', '仿古'],
    brief: '梧桐为面、圆月为形，月琴弦动，彝家山寨起舞。',
    craftsman: { name: '起国光', title: '州级非遗代表性传承人', years: 36 }
  },
  {
    id: 13,
    name: '苗族百鸟衣绣片',
    ethnic: '苗族',
    category: '刺绣',
    level: '国家级非遗',
    origin: '贵州·丹寨',
    price: 3680,
    originalPrice: 4200,
    sales: 21,
    stock: 8,
    specs: ['收藏级单片'],
    brief: '百鸟衣为苗族盛装之王，飞禽走兽同绣一衣，堪称穿在身上的史诗。',
    craftsman: { name: '王阿勇', title: '国家级非遗代表性传承人', years: 48 }
  },
  {
    id: 14,
    name: '布依族竹编果盘',
    ethnic: '布依族',
    category: '编织',
    level: '州/市级非遗',
    origin: '贵州·荔波',
    price: 98,
    originalPrice: 128,
    sales: 421,
    stock: 300,
    specs: ['小号', '大号'],
    brief: '慈竹剖丝细密如线，六角孔编织通透，盛物亦是盛景。',
    craftsman: { name: '姚元昌', title: '州级非遗代表性传承人', years: 24 }
  },
  {
    id: 15,
    name: '彝族蜡染披毡',
    ethnic: '彝族',
    category: '蜡染',
    level: '省级非遗',
    origin: '云南·武定',
    price: 620,
    originalPrice: 760,
    sales: 91,
    stock: 40,
    specs: ['常规', '加厚'],
    brief: '彝族蜡染以粗犷几何纹著称，披之御寒，纹中藏族群记忆。',
    craftsman: { name: '李从会', title: '省级非遗代表性传承人', years: 28 }
  },
  {
    id: 16,
    name: '苗族錾刻银手镯',
    ethnic: '苗族',
    category: '银饰',
    level: '省级非遗',
    origin: '贵州·施秉',
    price: 480,
    originalPrice: 580,
    sales: 356,
    stock: 90,
    specs: ['细款', '宽款'],
    brief: '实心银坯手工錾花，藤蔓缠枝纹绕腕生辉，日常亦可佩戴。',
    craftsman: { name: '杨光宾', title: '国家级非遗代表性传承人', years: 40 }
  }
]

// 统一补全图片字段：封面图 + 详情图集
export const goodsList = rawGoods.map((g) => ({
  ...g,
  cover: placeholderImage(g.name, g.id), // 卡片封面图
  gallery: makeGallery(g.name, g.id)     // 详情页轮播图集
}))

// 根据 id 查找单个商品（供详情页使用）
export function findGoodsById(id) {
  return goodsList.find((g) => g.id === Number(id)) || null
}

// 模拟「同类推荐」：同民族或同品类，排除自身，取前 4 个
export function getRelatedGoods(current, limit = 4) {
  if (!current) return []
  return goodsList
    .filter((g) => g.id !== current.id && (g.ethnic === current.ethnic || g.category === current.category))
    .slice(0, limit)
}

// 模拟游客评价数据（详情页评价 Tab 使用）
export const mockReviews = [
  { id: 1, user: '山***客', rating: 5, date: '2026-06-28', content: '做工非常精细，纹样清晰，能感受到手作的温度，值得收藏。' },
  { id: 2, user: '黔***游', rating: 5, date: '2026-06-15', content: '包装很用心，附赠了非遗文化小册子，长知识了，支持传承人！' },
  { id: 3, user: '云***舟', rating: 4, date: '2026-05-30', content: '实物比图片更有质感，物流稍慢，但为手工艺品的等待是值得的。' },
  { id: 4, user: '锦***绣', rating: 5, date: '2026-05-12', content: '送长辈的礼物，很有文化分量，对方非常喜欢。' }
]
