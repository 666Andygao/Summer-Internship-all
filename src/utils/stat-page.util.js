const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

function normalizePage(page) {
    const n = Number(page);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE;
    return Math.floor(n);
}

function normalizeSize(size) {
    const n = Number(size);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_SIZE;
    return Math.min(MAX_SIZE, Math.floor(n));
}

function toOffset(page, size) {
    return (normalizePage(page) - 1) * normalizeSize(size);
}

function build(items, total, page, size) {
    const p = normalizePage(page);
    const s = normalizeSize(size);
    const safeTotal = Math.max(0, Number(total) || 0);
    return {
        items,
        total: safeTotal,
        page: p,
        page_size: s,
        total_pages: Math.max(1, Math.ceil(safeTotal / s))
    };
}

function buildEmpty(page, size) {
    return build([], 0, page, size);
}

module.exports = {
    DEFAULT_PAGE,
    DEFAULT_SIZE,
    MAX_SIZE,
    normalizePage,
    normalizeSize,
    toOffset,
    build,
    buildEmpty
};