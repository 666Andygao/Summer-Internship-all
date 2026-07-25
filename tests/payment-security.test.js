const assert = require('assert');
const { createRequire } = require('module');
const requireFrom = createRequire(__filename);
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
const serverModule = requireFrom(serverPath);

function run() {
  const sampleOrder = {
    id: 1,
    order_no: 'ORD-TEST-0001',
    status: 'pending_payment',
    total_amount: 100,
    user_id: 1,
    buyer_id: 1,
    payment: null,
    payment_credentials: []
  };

  const security = serverModule.__test_helpers?.validatePaymentSecurity
    ? serverModule.__test_helpers.validatePaymentSecurity(sampleOrder, { payment_method: 'alipay', amount: 100 }, { id: 1, role: 'buyer' })
    : null;

  assert.ok(security && security.valid, '支付安全校验应通过');
  const consistency = serverModule.__test_helpers?.verifyOrderPaymentConsistency
    ? serverModule.__test_helpers.verifyOrderPaymentConsistency({ ...sampleOrder, status: 'paid', payment: { status: 'success', amount: 100 } })
    : null;

  assert.ok(consistency && consistency.valid, '支付状态一致性校验应通过');
  console.log('payment-security test passed');
}

run();
