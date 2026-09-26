const User = require('../models/User');

const authenticationMiddleware = {
    // Kiểm tra đăng nhập
    requireLogin: async (request, response, next) => {
        if (request.session.user) {
            return next();
        }
        response.redirect('/login');
    },

    // Kiểm tra chưa đăng nhập
    requireLogout: async (request, response, next) => {
        if (!request.session.user) {
            return next();
        }
        response.redirect('/');
    },

    // ===== SỬA: Chỉ admin =====
    requireAdmin: async (request, response, next) => {
        if (!request.session.user) {
            return response.redirect('/login');
        }
        const currentUser = await User.findById(request.session.user.id);
        if (currentUser && currentUser.role === 'admin') {
            return next();
        }
        response.status(403).send('Bạn không có quyền truy cập vào trang này');
    },

    // ===== THÊM MỚI: Yêu cầu Staff hoặc Admin =====
    requireStaff: async (request, response, next) => {
        if (!request.session.user) {
            return response.redirect('/login');
        }
        const currentUser = await User.findById(request.session.user.id);
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff')) {
            return next();
        }
        response.status(403).send('Bạn không có quyền truy cập vào trang này');
    },

    // Lấy thông tin user hiện tại
    getCurrentUser: async (request, response, next) => {
        if (request.session.user) {
            const currentUser = await User.findById(request.session.user.id);
            response.locals.user = currentUser;
            response.locals.isLoggedIn = true;
            // ===== THÊM MỚI =====
            response.locals.isAdmin = currentUser && currentUser.role === 'admin';
            response.locals.isStaff = currentUser && currentUser.role === 'staff';
            response.locals.isCustomer = currentUser && currentUser.role === 'customer';
            response.locals.isStaffOrAdmin = currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin');
        } else {
            response.locals.user = null;
            response.locals.isLoggedIn = false;
            response.locals.isAdmin = false;
            response.locals.isStaff = false;
            response.locals.isCustomer = false;
            response.locals.isStaffOrAdmin = false;
        }
        next();
    }
};

module.exports = authenticationMiddleware;