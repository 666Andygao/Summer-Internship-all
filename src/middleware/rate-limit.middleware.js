const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 120;

const stores = new Map();

function getStore(key) {
    if (!stores.has(key)) {
        stores.set(key, { timestamps: [] });
    }
    return stores.get(key);
}

function checkRateLimit(key, maxRequests = DEFAULT_MAX_REQUESTS, windowMs = DEFAULT_WINDOW_MS) {
    const now = Date.now();
    const store = getStore(key);
    store.timestamps = store.timestamps.filter(t => now - t < windowMs);

    if (store.timestamps.length >= maxRequests) {
        return {
            allowed: false,
            count: store.timestamps.length,
            limit: maxRequests,
            resetIn: Math.ceil((windowMs - (now - store.timestamps[0])) / 1000)
        };
    }

    store.timestamps.push(now);
    return {
        allowed: true,
        count: store.timestamps.length,
        limit: maxRequests,
        resetIn: Math.ceil((windowMs - (now - (store.timestamps[0] || now))) / 1000)
    };
}

function rateLimit(options = {}) {
    const {
        windowMs = DEFAULT_WINDOW_MS,
        maxRequests = DEFAULT_MAX_REQUESTS,
        keyGenerator = null,
        skip = null
    } = options;

    return (req, res, next) => {
        if (skip && skip(req)) return next();

        const key = keyGenerator
            ? keyGenerator(req)
            : (req.ip || req.connection.remoteAddress || 'unknown');

        const result = checkRateLimit(key, maxRequests, windowMs);

        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, result.limit - result.count));
        res.setHeader('X-RateLimit-Reset', result.resetIn);

        if (!result.allowed) {
            return res.status(429).json({
                error: '请求过于频繁，请稍后再试',
                retry_after: result.resetIn
            });
        }

        next();
    };
}

function clearRateLimit(key) {
    stores.delete(key);
}

function clearAllRateLimits() {
    stores.clear();
}

module.exports = {
    rateLimit,
    checkRateLimit,
    clearRateLimit,
    clearAllRateLimits,
    DEFAULT_WINDOW_MS,
    DEFAULT_MAX_REQUESTS
};