// middleware/cache.js

// Ngăn cache cho tất cả các trang động
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Cho phép cache ngắn hạn (5 phút)
const shortCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    next();
};

// Cho phép cache dài hạn (1 ngày) cho file tĩnh
const longCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
};

module.exports = { noCache, shortCache, longCache };