const assert = require('assert');
const path = require('path');

const serverModule = require(path.join(__dirname, '..', 'server.js'));

function run() {
  const review = serverModule.__test_helpers.createReview({
    order: { id: 1, order_no: 'ORD-TEST-0001' },
    user: { id: 1, display_name: '买家A' },
    rating: 5,
    content: '很不错',
    experience: '包装严实',
    productId: 10,
    files: []
  });

  assert.strictEqual(review.rating, 5);
  assert.strictEqual(review.content, '很不错');
  assert.strictEqual(review.user_id, 1);
  console.log('reviews test passed');
}

run();
