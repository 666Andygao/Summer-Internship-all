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

  const anonymousReview = serverModule.__test_helpers.createProductReview({
    order: { id: 7, order_no: 'ORD-TEST-0007' },
    user: { id: 2, username: 'buyerB', display_name: '买家B' },
    productId: 41,
    rating: 4,
    content: '手工细致',
    anonymous: true
  });
  assert.strictEqual(anonymousReview.user_name, '匿名用户');
  assert.strictEqual(anonymousReview.product_id, 41);
  assert.strictEqual(anonymousReview.order_id, 7);
  const publicReview = serverModule.__test_helpers.toPublicProductReview(anonymousReview);
  assert.strictEqual(publicReview.user_name, '匿名用户');
  assert.strictEqual('user_id' in publicReview, false);

  const namedReview = serverModule.__test_helpers.createProductReview({
    order: { id: 9, order_no: 'ORD-TEST-0009' },
    user: { id: 3, username: 'buyerC', display_name: '买家C' },
    productId: 10,
    rating: 3,
    content: '符合预期',
    anonymous: false
  });
  assert.strictEqual(namedReview.user_name, '买家C');
  assert.strictEqual(serverModule.__test_helpers.buildReviewStats([anonymousReview, namedReview]).average_rating, 3.5);
  assert.strictEqual(serverModule.__test_helpers.isPublicProductReview(anonymousReview, 41), true);
  assert.strictEqual(serverModule.__test_helpers.isPublicProductReview(
    { ...anonymousReview, is_hidden: true }, 41
  ), false);

  const buyerDb = {
    users: [{ id: 4, role: 'artisan', registration_role: 'buyer' }],
    merchants: [{ user_id: 4, status: 'approved' }],
    orders: [{
      id: 8,
      user_id: '4',
      status: 'pending_payment',
      items: [{ product_id: '41' }]
    }],
    reviews: []
  };
  const eligibility = serverModule.__test_helpers.getProductReviewEligibility(
    buyerDb, 4, 41
  );
  assert.strictEqual(eligibility.eligible, true);
  assert.strictEqual(eligibility.order.id, 8);
  assert.strictEqual(serverModule.__test_helpers.getProductReviewEligibility({
    ...buyerDb,
    orders: [{ ...buyerDb.orders[0], status: 'cancelled' }]
  }, 4, 41).reason, 'order_not_submitted');
  assert.strictEqual(serverModule.__test_helpers.getProductReviewEligibility({
    ...buyerDb,
    reviews: [{ order_id: 8, product_id: 41 }]
  }, 4, 41).reason, 'already_reviewed');

  const conversations = [
    { id: 1, user_id: 4, developer_id: 9 },
    { id: 5, user_id: 9, developer_id: 4, product_id: null },
    { id: 2, user_id: 4, developer_id: 9, product_id: 41 },
    { id: 3, user_id: 9, developer_id: 4, product_id: 41 },
    { id: 4, user_id: 4, developer_id: 9, product_id: 42 }
  ];
  const chatDb = { conversations };
  assert.deepStrictEqual(
    serverModule.__test_helpers.conversationsBetween(chatDb, 4, 9, 41).map(item => item.id),
    [2, 3]
  );
  assert.deepStrictEqual(
    serverModule.__test_helpers.siblingConversationIds(chatDb, conversations[2]),
    [2, 3]
  );
  assert.deepStrictEqual(
    serverModule.__test_helpers.siblingConversationIds(chatDb, conversations[0]),
    [1, 5]
  );
  assert.strictEqual(serverModule.__test_helpers.isConversationParty(conversations[2], '9'), true);
  assert.strictEqual(serverModule.__test_helpers.otherPartyId(conversations[2], 4), 9);
  console.log('reviews test passed');
}

run();
