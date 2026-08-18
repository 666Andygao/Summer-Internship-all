const ERROR_CODES = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500
};

class AppError extends Error {
    constructor(message, statusCode = ERROR_CODES.BAD_REQUEST, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || String(statusCode);
        this.isOperational = true;
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, ERROR_CODES.BAD_REQUEST, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.UNAUTHORIZED, 'AUTH_ERROR');
    }
}

class ForbiddenError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.FORBIDDEN, 'FORBIDDEN');
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.NOT_FOUND, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.CONFLICT, 'CONFLICT');
    }
}

class RateLimitError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.TOO_MANY_REQUESTS, 'RATE_LIMITED');
    }
}

class StockConflictError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.CONFLICT, 'STOCK_CONFLICT');
    }
}

class PaymentError extends AppError {
    constructor(message) {
        super(message, ERROR_CODES.BAD_REQUEST, 'PAYMENT_ERROR');
    }
}

function globalErrorHandler(err, req, res, next) {
    const isOperational = err.isOperational || false;

    if (err.type === 'entity.parse.failed') {
        return res.status(ERROR_CODES.BAD_REQUEST).json({
            error: '请求体格式错误',
            details: 'JSON 解析失败，请检查请求体格式'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(ERROR_CODES.BAD_REQUEST).json({
            error: '请求体过大',
            details: '请缩小上传内容或使用分片上传'
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(ERROR_CODES.BAD_REQUEST).json({
            error: '文件过大',
            details: '上传文件超过最大限制'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(ERROR_CODES.BAD_REQUEST).json({
            error: '文件字段错误',
            details: '上传文件字段名与预期不符'
        });
    }

    const statusCode = err.statusCode || ERROR_CODES.INTERNAL_ERROR;
    const responseBody = {
        error: err.message || '服务器内部错误',
        code: err.code || String(statusCode),
        timestamp: new Date().toISOString()
    };

    if (err.details && Array.isArray(err.details)) {
        responseBody.details = err.details;
    }

    if (!isOperational && statusCode >= 500) {
        console.error('[GlobalError]', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    }

    res.status(statusCode).json(responseBody);
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

function notFoundHandler(req, res, next) {
    if (req.path.startsWith('/api/')) {
        return res.status(ERROR_CODES.NOT_FOUND).json({
            error: '接口不存在',
            path: req.originalUrl,
            method: req.method
        });
    }
    next();
}

module.exports = {
    ERROR_CODES,
    AppError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    StockConflictError,
    PaymentError,
    globalErrorHandler,
    asyncHandler,
    notFoundHandler
};