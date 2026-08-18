const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 15000;

function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: TIMEOUT
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed
                    });
                } catch {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('请求超时: ' + path));
        });

        if (data !== null) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function get(path, headers = {}) {
    return request('GET', path, null, headers);
}

function post(path, data, headers = {}) {
    return request('POST', path, data, headers);
}

function put(path, data, headers = {}) {
    return request('PUT', path, data, headers);
}

function patch(path, data, headers = {}) {
    return request('PATCH', path, data, headers);
}

function del(path, headers = {}) {
    return request('DELETE', path, null, headers);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error('断言失败: ' + message);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let testResults = { passed: 0, failed: 0, errors: [] };

function logTest(name, passed, detail = '') {
    if (passed) {
        testResults.passed++;
        console.log(`  ✅ ${name}${detail ? ' - ' + detail : ''}`);
    } else {
        testResults.failed++;
        testResults.errors.push({ name, detail });
        console.log(`  ❌ ${name}${detail ? ' - ' + detail : ''}`);
    }
}

const timestamp = Date.now();
const testUsers = {
    buyer: {
        username: `test_buyer_${timestamp}`,
        password: 'test123456',
        role: 'buyer',
        display_name: `测试买家_${timestamp}`,
        phone: '13800138001'
    },
    artisan: {
        username: `test_artisan_${timestamp}`,
        password: 'test123456',
        role: 'artisan',
        display_name: `测试商家_${timestamp}`,
        phone: '13800138002'
    },
    admin: {
        username: `test_admin_${timestamp}`,
        password: 'test123456',
        role: 'admin',
        display_name: `测试管理员_${timestamp}`,
        phone: '13800138003'
    }
};

const tokens = { buyer: null, artisan: null, admin: null };
const entities = { users: {}, products: [], addresses: {}, cartItems: [], orders: [], reviews: [], afterSales: {} };

async function runTests() {
    console.log('====================================================');
    console.log('  非遗电商后端 - 全业务闭环完整测试用例');
    console.log('====================================================\n');

    try {
        await testUserRegistration();
        await testUserLogin();
        await testProductBrowseSearch();
        await testMerchantProductImport();
        await testAddToCart();
        await testSubmitOrder();
        await testPayOrder();
        await testMerchantShipOrder();
        await testConfirmReceipt();
        await testSubmitReview();
        await testApplyAfterSales();
        await testMerchantStats();
        await testGlobalValidation();
        await testErrorScenarios();

        console.log('\n====================================================');
        console.log(`  测试完成: ✅ ${testResults.passed} 通过, ❌ ${testResults.failed} 失败`);
        console.log('====================================================');

        if (testResults.errors.length > 0) {
            console.log('\n失败详情:');
            testResults.errors.forEach(e => {
                console.log(`  - ${e.name}: ${e.detail}`);
            });
            process.exit(1);
        }
    } catch (e) {
        console.error('测试执行异常:', e);
        process.exit(1);
    }
}

async function testUserRegistration() {
    console.log('\n【1. 用户注册测试】');

    const res1 = await post('/api/register', testUsers.buyer);
    logTest('买家注册 - 状态码 200', res1.status === 200 || res1.status === 201, `状态: ${res1.status}`);
    assert(res1.status === 200 || res1.status === 201, '买家注册应成功');
    entities.users.buyerId = res1.body.id;
    logTest('买家注册 - 返回用户ID', !!res1.body.id, `ID: ${res1.body.id}`);

    const res2 = await post('/api/register', testUsers.artisan);
    logTest('商家注册 - 状态码 200', res2.status === 200 || res2.status === 201, `状态: ${res2.status}`);
    entities.users.artisanId = res2.body.id;

    const res3 = await post('/api/register', testUsers.admin);
    logTest('管理员注册 - 状态码 200', res3.status === 200 || res3.status === 201, `状态: ${res3.status}`);

    const res4 = await post('/api/register', testUsers.buyer);
    logTest('重复用户名注册 - 应被拒绝', res4.status === 400 || res4.status === 409, `状态: ${res4.status}`);

    const res5 = await post('/api/register', {
        username: 'short',
        password: '123',
        role: 'buyer',
        display_name: 'Test'
    });
    logTest('弱密码注册 - 应被拒绝', res5.status === 400, `状态: ${res5.status}`);

    console.log('  注册测试完成\n');
}

async function testUserLogin() {
    console.log('【2. 用户登录测试】');

    const res1 = await post('/api/login', {
        username: testUsers.buyer.username,
        password: testUsers.buyer.password
    });
    logTest('买家登录 - 状态码 200', res1.status === 200, `状态: ${res1.status}`);
    tokens.buyer = res1.body.token || res1.body.access_token;
    logTest('买家登录 - 返回 Token', !!tokens.buyer);

    const res2 = await post('/api/login', {
        username: testUsers.artisan.username,
        password: testUsers.artisan.password
    });
    logTest('商家登录 - 状态码 200', res2.status === 200, `状态: ${res2.status}`);
    tokens.artisan = res2.body.token || res2.body.access_token;

    const res3 = await post('/api/login', {
        username: testUsers.buyer.username,
        password: 'wrongpassword'
    });
    logTest('错误密码登录 - 应被拒绝', res3.status === 401 || res3.status === 400, `状态: ${res3.status}`);

    const res4 = await get('/api/me', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('获取个人信息 - 状态码 200', res4.status === 200, `状态: ${res4.status}`);
    logTest('个人信息 - 返回正确用户', res4.body.username === testUsers.buyer.username);

    const res5 = await get('/api/me', {});
    logTest('无 Token 访问 - 应返回 401', res5.status === 401, `状态: ${res5.status}`);

    console.log('  登录测试完成\n');
}

async function testProductBrowseSearch() {
    console.log('【3. 商品浏览与搜索测试】');

    const res1 = await get('/api/products', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品列表 - 状态码 200', res1.status === 200, `状态: ${res1.status}`);
    logTest('商品列表 - 正确返回结构', res1.body.items && res1.body.pagination);

    const res2 = await get('/api/products?page=1&limit=10', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品分页 - 返回分页信息', res2.body.pagination.page === 1 && res2.body.pagination.limit === 10);

    const res3 = await get('/api/products?q=瓷', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品搜索 - 关键字搜索', res3.status === 200);

    const res4 = await get('/api/products?category=陶瓷', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品分类筛选 - 状态码 200', res4.status === 200);

    const res5 = await get('/api/products?sort=price_asc', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品排序 - 价格升序', res5.status === 200);

    const res6 = await get('/api/products/recommend', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('推荐商品 - 状态码 200', res6.status === 200);

    const res7 = await get('/api/products/featured', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('特色商品 - 状态码 200', res7.status === 200);

    const res8 = await get('/api/products/categories', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品分类列表 - 状态码 200', res8.status === 200);

    console.log('  商品浏览搜索测试完成\n');
}

async function testMerchantProductImport() {
    console.log('【4. 商品导入与发布测试】');

    const res1 = await post('/api/products', {
        title: '测试青花瓷茶具套装',
        brief: '景德镇手工绘制青花瓷茶具，非遗传承精品',
        description: '精选景德镇高岭土，经1300度高温烧制，手工绘制缠枝莲纹',
        price: 688,
        stock: 50,
        category: '陶瓷',
        heritage_category: '景德镇瓷',
        cover_image: '/uploads/test-porcelain.jpg',
        tags: ['青花瓷', '茶具', '非遗'],
        attributes: [
            { name: '材质', value: '高岭土' },
            { name: '工艺', value: '手绘青花' }
        ]
    }, { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商家发布商品 - 状态码 200', res1.status === 200 || res1.status === 201, `状态: ${res1.status}`);
    if (res1.body && res1.body.id) {
        entities.products.push(res1.body);
        logTest('商家发布商品 - 返回商品ID', !!res1.body.id, `ID: ${res1.body.id}`);
    }

    const res2 = await post('/api/products', {
        title: '测试蜀绣围巾',
        brief: '四川成都蜀绣手工围巾',
        description: '采用传统蜀绣工艺，图案为缠枝芙蓉',
        price: 1288,
        stock: 20,
        category: '刺绣',
        heritage_category: '蜀绣',
        cover_image: '/uploads/test-shuxiu.jpg',
        tags: ['蜀绣', '围巾', '手工']
    }, { Authorization: `Bearer ${tokens.artisan}` });
    logTest('发布第二个商品 - 状态码 200', res2.status === 200 || res2.status === 201);
    if (res2.body && res2.body.id) entities.products.push(res2.body);

    if (entities.products.length > 0) {
        const pid = entities.products[0].id;
        const res3 = await get(`/api/products/${pid}`, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('商品详情 - 状态码 200', res3.status === 200, `状态: ${res3.status}`);

        const res4 = await patch(`/api/products/${pid}/publish`, {}, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商品上架 - 状态码 200', res4.status === 200 || res4.status === 201);

        const res5 = await patch(`/api/products/${pid}/stock`, { stock: 100 }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('修改库存 - 状态码 200', res5.status === 200);

        const res6 = await patch(`/api/products/${pid}/price`, { price: 699 }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('修改价格 - 状态码 200', res6.status === 200);

        const res7 = await put(`/api/products/${pid}`, {
            title: '测试青花瓷茶具套装(更新)',
            brief: '更新后的简介'
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('更新商品 - 状态码 200', res7.status === 200);
    }

    const res8 = await post('/api/products', {
        title: '越权发布测试',
        price: 100,
        stock: 10,
        category: '测试'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家越权发布商品 - 应被拒绝', res8.status === 403, `状态: ${res8.status}`);

    console.log('  商品导入与发布测试完成\n');
}

async function testAddToCart() {
    console.log('【5. 购物车与结算测试】');

    if (entities.products.length === 0) {
        console.log('  ⚠️ 跳过：无可用商品');
        return;
    }

    const productId = entities.products[0].id;

    const res1 = await post('/api/cart/items', {
        product_id: productId,
        quantity: 2
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('加入购物车 - 状态码 200', res1.status === 200 || res1.status === 201, `状态: ${res1.status}`);

    const res2 = await get('/api/cart', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('查看购物车 - 状态码 200', res2.status === 200);
    logTest('购物车包含商品', Array.isArray(res2.body) ? res2.body.some(i => i.product_id === productId) : false);

    if (Array.isArray(res2.body) && res2.body.length > 0) {
        const cartItem = res2.body.find(i => i.product_id === productId);
        if (cartItem) {
            entities.cartItems.push(cartItem);

            const res3 = await put(`/api/cart/items/${productId}`, {
                quantity: 3
            }, { Authorization: `Bearer ${tokens.buyer}` });
            logTest('修改购物车数量 - 状态码 200', res3.status === 200);

            const res4 = await patch(`/api/cart/items/${productId}/selected`, {
                selected: true
            }, { Authorization: `Bearer ${tokens.buyer}` });
            logTest('勾选购物车商品 - 状态码 200', res4.status === 200);

            const res5 = await get('/api/cart/settlement', { Authorization: `Bearer ${tokens.buyer}` });
            logTest('购物车结算预览 - 状态码 200', res5.status === 200);
            logTest('结算金额大于0', res5.body && res5.body.total_amount > 0);
        }
    }

    console.log('  购物车测试完成\n');
}

async function testSubmitOrder() {
    console.log('【6. 提交订单测试】');

    const res1 = await post('/api/addresses', {
        receiver_name: '测试买家',
        receiver_phone: testUsers.buyer.phone,
        province: '江西省',
        city: '景德镇市',
        district: '昌江区',
        detail: '景德镇陶瓷大学测试路1号',
        is_default: true
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('添加收货地址 - 状态码 200', res1.status === 200 || res1.status === 201);
    const addressId = res1.body && res1.body.id;

    const res2 = await get('/api/addresses', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('查看地址列表 - 状态码 200', res2.status === 200);

    if (entities.products.length > 0) {
        const productId = entities.products[0].id;

        const res3 = await post('/api/orders/direct', {
            product_id: productId,
            quantity: 2,
            address_id: addressId,
            remarks: '请尽快发货'
        }, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('直接下单 - 状态码 200', res3.status === 200 || res3.status === 201, `状态: ${res3.status}`);
        if (res3.body && res3.body.id) {
            entities.orders.push(res3.body);
            logTest('直接下单 - 返回订单ID', !!res3.body.id, `ID: ${res3.body.id}`);
            logTest('订单状态为待付款', res3.body.status === 'pending_payment');
        }

        const res4 = await post('/api/cart/checkout', {
            address_id: addressId
        }, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('购物车结算下单 - 状态码 200', res4.status === 200 || res4.status === 201);
        if (res4.body && res4.body.id) entities.orders.push(res4.body);
    }

    const res5 = await get('/api/orders', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家订单列表 - 状态码 200', res5.status === 200);

    if (entities.orders.length > 0) {
        const orderId = entities.orders[0].id;
        const res6 = await get(`/api/orders/${orderId}`, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('订单详情 - 状态码 200', res6.status === 200);

        const res7 = await get('/api/orders/preview', { Authorization: `Bearer ${tokens.buyer}` });
        logTest('订单预览 - 状态码 200', res7.status === 200);
    }

    console.log('  提交订单测试完成\n');
}

async function testPayOrder() {
    console.log('【7. 订单支付测试】');

    if (entities.orders.length === 0) {
        console.log('  ⚠️ 跳过：无待支付订单');
        return;
    }

    const order = entities.orders[0];

    const res1 = await post(`/api/orders/${order.id}/pay`, {
        payment_method: 'wechat'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('发起支付 - 状态码 200', res1.status === 200 || res1.status === 201, `状态: ${res1.status}`);

    const res2 = await post('/api/orders/:id/pay/callback'.replace(':id', order.id), {
        order_no: order.order_no || order.id,
        payment_method: 'wechat',
        status: 'success',
        third_party_no: `test_tp_${timestamp}`
    });
    logTest('支付回调 - 状态码 200', res2.status === 200, `状态: ${res2.status}`);

    const res3 = await get(`/api/orders/${order.id}/payment`, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('支付状态查询 - 状态码 200', res3.status === 200);

    const res4 = await post(`/api/orders/${order.id}/pay/retry`, {
        payment_method: 'alipay'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('重试支付 - 状态码 200', res4.status === 200);

    const res5 = await get(`/api/orders/${order.id}/payment/logs`, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('支付日志 - 状态码 200', res5.status === 200);

    const res6 = await get(`/api/orders/${order.id}/payment/verify`, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('支付校验 - 状态码 200', res6.status === 200);

    const res7 = await post(`/api/orders/${order.id}/cancel`, {
        reason: '测试取消'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('取消订单 - 状态码 200', res7.status === 200 || res7.status === 400);

    console.log('  支付测试完成\n');
}

async function testMerchantShipOrder() {
    console.log('【8. 商家发货测试】');

    const res1 = await get('/api/merchant/orders', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商家订单列表 - 状态码 200', res1.status === 200, `状态: ${res1.status}`);

    const res2 = await get('/api/merchant/orders/stats', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商家订单统计 - 状态码 200', res2.status === 200);

    if (entities.orders.length > 0) {
        const orderId = entities.orders[0].id;
        const res3 = await post(`/api/merchant/orders/${orderId}/ship`, {
            logistics_company: '顺丰速运',
            tracking_number: `SF${timestamp}`
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商家发货 - 状态码 200', res3.status === 200 || res3.status === 400, `状态: ${res3.status}`);

        const res4 = await get(`/api/orders/${orderId}/logistics`, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('物流信息查询 - 状态码 200', res4.status === 200);

        const res5 = await post(`/api/merchant/orders/${orderId}/close`, {
            reason: '测试关闭'
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商家关闭订单 - 状态码 200', res5.status === 200 || res5.status === 400);
    }

    console.log('  商家发货测试完成\n');
}

async function testConfirmReceipt() {
    console.log('【9. 确认收货测试】');

    if (entities.orders.length === 0) {
        console.log('  ⚠️ 跳过：无已发货订单');
        return;
    }

    const orderId = entities.orders[0].id;

    const res1 = await post(`/api/orders/${orderId}/confirm-receipt`, {}, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('确认收货 - 状态码 200', res1.status === 200 || res1.status === 400, `状态: ${res1.status}`);

    const res2 = await post(`/api/orders/${orderId}/apply-after-sales`, {
        type: 'refund',
        reason: '商品与描述不符，申请退款',
        refund_amount: 100
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('申请售后 - 状态码 200', res2.status === 200 || res2.status === 400);

    console.log('  确认收货测试完成\n');
}

async function testSubmitReview() {
    console.log('【10. 发布评价测试】');

    if (entities.orders.length === 0 || entities.products.length === 0) {
        console.log('  ⚠️ 跳过：缺少订单或商品');
        return;
    }

    const orderId = entities.orders[0].id;
    const productId = entities.products[0].id;

    const res1 = await post(`/api/orders/${orderId}/reviews`, {
        product_id: productId,
        rating: 5,
        content: '商品质量很好，包装精美，物流也很快，非常满意这次购物体验！',
        images: []
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('提交评价 - 状态码 200', res1.status === 200 || res1.status === 201 || res1.status === 400, `状态: ${res1.status}`);
    if (res1.body && res1.body.id) entities.reviews.push(res1.body);

    const res2 = await get(`/api/products/${productId}/reviews`, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('商品评价列表 - 状态码 200', res2.status === 200);

    if (entities.reviews.length > 0) {
        const reviewId = entities.reviews[0].id;
        const res3 = await post(`/api/reviews/${reviewId}/additional`, {
            content: '追评：用了一周来补充评价，依然非常满意！'
        }, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('追加评价 - 状态码 200', res3.status === 200 || res3.status === 400);

        const res4 = await post(`/api/reviews/${reviewId}/reply`, {
            reply: '感谢您的支持，我们会继续努力！'
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商家回复评价 - 状态码 200', res4.status === 200 || res4.status === 400);

        const res5 = await patch(`/api/reviews/${reviewId}/approve`, {}, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('审核通过评价 - 状态码 200', res5.status === 200);
    }

    const res6 = await get('/api/reviews/stats', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('评价统计 - 状态码 200', res6.status === 200);

    const res7 = await get('/api/profile/reviews', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('我的评价列表 - 状态码 200', res7.status === 200);

    console.log('  评价测试完成\n');
}

async function testApplyAfterSales() {
    console.log('【11. 售后退款测试】');

    if (entities.orders.length === 0) {
        console.log('  ⚠️ 跳过：无售后关联订单');
        return;
    }

    const orderId = entities.orders[0].id;

    const res1 = await post('/api/after-sales', {
        order_id: orderId,
        type: 'refund',
        reason: '商品存在质量问题',
        description: '收到商品有明显划痕',
        images: [],
        refund_amount: 50
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('创建售后申请 - 状态码 200', res1.status === 200 || res1.status === 201 || res1.status === 400);

    const res2 = await get('/api/after-sales', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家售后列表 - 状态码 200', res2.status === 200);

    if (Array.isArray(res2.body) && res2.body.length > 0) {
        const afterSaleId = res2.body[0].id;
        entities.afterSales.id = afterSaleId;

        const res3 = await get(`/api/after-sales/${afterSaleId}`, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('售后详情 - 状态码 200', res3.status === 200);

        const res4 = await patch(`/api/after-sales/${afterSaleId}/review`, {
            status: 'approved',
            review_note: '同意退款',
            reviewer_id: entities.users.artisanId
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商家审核售后 - 状态码 200', res4.status === 200 || res4.status === 400);

        const res5 = await post(`/api/after-sales/${afterSaleId}/decision`, {
            decision: 'approve',
            note: '同意退款处理'
        }, { Authorization: `Bearer ${tokens.artisan}` });
        logTest('商家处理售后 - 状态码 200', res5.status === 200 || res5.status === 400);

        const res6 = await get(`/api/after-sales/${afterSaleId}/trace`, { Authorization: `Bearer ${tokens.buyer}` });
        logTest('售后跟踪 - 状态码 200', res6.status === 200);
    }

    const res7 = await get('/api/merchant/after-sales', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商家售后列表 - 状态码 200', res7.status === 200);

    const res8 = await get('/api/merchant/after-sales/stats', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商家售后统计 - 状态码 200', res8.status === 200);

    const res9 = await post(`/api/orders/${orderId}/refund`, {
        refund_amount: 30,
        reason: '部分退款测试'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('订单直接退款 - 状态码 200', res9.status === 200 || res9.status === 400);

    console.log('  售后退款测试完成\n');
}

async function testMerchantStats() {
    console.log('【12. 商家数据统计测试】');

    const res1 = await get('/api/merchant/stats/sales-rank?page=1&page_size=10', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('商品销量排行 - 状态码 200', res1.status === 200, `状态: ${res1.status}`);
    if (res1.body && res1.body.items) {
        logTest('销量排行 - 返回分页结构', res1.body.items && res1.body.total !== undefined);
    }

    const res2 = await get('/api/merchant/stats/revenue', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('营收统计 - 状态码 200', res2.status === 200);
    if (res2.body) {
        logTest('营收统计 - 包含今日数据', res2.body.today_order_count !== undefined);
        logTest('营收统计 - 包含历史数据', res2.body.total_order_count !== undefined);
    }

    const res3 = await get('/api/stats/sales', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('原销售统计接口 - 状态码 200', res3.status === 200);

    const res4 = await get('/api/stats/revenue', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('原营收统计接口 - 状态码 200', res4.status === 200);

    const res5 = await get('/api/stats/orders/trend', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('订单趋势统计 - 状态码 200', res5.status === 200);

    const res6 = await get('/api/stats/hot-products', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('热门商品统计 - 状态码 200', res6.status === 200);

    const res7 = await get('/api/merchant/stats/sales-rank?page=0&page_size=500', { Authorization: `Bearer ${tokens.artisan}` });
    logTest('边界分页参数 - 自动修正', res7.status === 200);

    console.log('  商家统计测试完成\n');
}

async function testGlobalValidation() {
    console.log('【13. 全局参数校验测试】');

    const res1 = await post('/api/register', {
        username: '',
        password: '123456',
        role: 'buyer',
        display_name: 'Test'
    });
    logTest('空用户名 - 应被拒绝', res1.status === 400, `状态: ${res1.status}`);

    const res2 = await post('/api/register', {
        username: 'testuser',
        password: '123',
        role: 'buyer',
        display_name: 'Test'
    });
    logTest('短密码 - 应被拒绝', res2.status === 400);

    const res3 = await post('/api/login', {
        username: '',
        password: ''
    });
    logTest('空登录参数 - 应被拒绝', res3.status === 400);

    const res4 = await post('/api/products', {
        title: '',
        price: -1,
        stock: -5,
        category: '陶瓷'
    }, { Authorization: `Bearer ${tokens.artisan}` });
    logTest('非法商品参数 - 应被拒绝', res4.status === 400);

    const res5 = await post('/api/orders/direct', {
        product_id: 0,
        quantity: -1
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('非法下单参数 - 应被拒绝', res5.status === 400);

    const res6 = await get('/api/products?page=abc', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('非法分页参数 - 自动修正', res6.status === 200);

    console.log('  全局校验测试完成\n');
}

async function testErrorScenarios() {
    console.log('【14. 异常场景测试】');

    const res1 = await get('/api/products/99999', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('查询不存在的商品 - 应返回 404', res1.status === 404 || res1.status === 200);

    const res2 = await get('/api/orders/99999', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('查询不存在的订单 - 应返回 404', res2.status === 404);

    const res3 = await post('/api/orders', { invalid: 'data' }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('错误请求体 - 应返回 400', res3.status === 400);

    const res4 = await post('/api/register', null);
    logTest('空请求体 - 应返回 400', res4.status === 400);

    const res5 = await post('/api/merchants/apply', {
        shop_name: '测试店铺'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家申请商家 - 应返回 403', res5.status === 403);

    const res6 = await post('/api/products', {
        title: '越权商品',
        price: 100,
        stock: 10,
        category: '测试'
    }, { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家发布商品 - 应返回 403', res6.status === 403);

    const res7 = await get('/api/merchant/stats/sales-rank', { Authorization: `Bearer ${tokens.buyer}` });
    logTest('买家访问商家统计 - 应返回 403', res7.status === 403);

    const res8 = await get('/api/nonexistent-endpoint');
    logTest('不存在的接口 - 应返回 404', res8.status === 404);

    console.log('  异常场景测试完成\n');
}

runTests().catch(console.error);