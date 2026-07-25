const assert = require('assert');
const path = require('path');

const serverModule = require(path.join(__dirname, '..', 'server.js'));

function run() {
  const order = {
    id: 1,
    order_no: 'ORD-TEST-0001',
    total_amount: 100,
    status: 'paid',
    user_id: 1,
    buyer_id: 1,
    items: [{ product_id: 10, title: '测试商品', price: 100, quantity: 1 }]
  };

  const result = serverModule.__test_helpers.createAfterSalesRequest({
    order,
    userId: 1,
    type: 'refund',
    reason: '商品质量问题',
    amount: 100,
    description: '收到商品有划痕'
  });

  assert.strictEqual(result.type, 'refund');
  assert.strictEqual(result.status, 'pending_review');
  assert.strictEqual(result.order_id, 1);
  console.log('after-sales test passed');
}

run();
