const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');

require('dotenv').config();
const connectDatabase = require('./connect');
const authenticationMiddleware = require('./middleware/auth');

// Khởi tạo các model
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Order = require('./models/Order');
const Voucher = require('./models/Voucher');
const Cart = require('./models/Cart');
const StockRequest = require('./models/StockRequest');

const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối đến cơ sở dữ liệu MongoDB
connectDatabase();

// Cấu hình view engine sử dụng EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình các middleware cơ bản
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình session để quản lý phiên đăng nhập
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000  // 1 ngày
    }
}));

// Middleware lấy thông tin người dùng cho tất cả các view
app.use(authenticationMiddleware.getCurrentUser);

// Middleware đồng bộ giỏ hàng giữa session và database
app.use(async (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        try {
            let cart = await Cart.findOne({ user: req.session.user.id });
            
            if (!cart && req.session.cart && req.session.cart.length > 0) {
                cart = new Cart({
                    user: req.session.user.id,
                    items: req.session.cart
                });
                await cart.save();
            } else if (cart && req.session.cart && req.session.cart.length > 0) {
                cart.items = req.session.cart;
                await cart.save();
            } else if (cart) {
                req.session.cart = cart.items;
            }
        } catch (error) {
            console.error('Lỗi đồng bộ giỏ hàng:', error);
        }
    }
    next();
});

// Cấu hình upload ảnh sản phẩm
const storageConfiguration = multer.diskStorage({
    destination: function(request, file, callback) {
        callback(null, path.join(__dirname, 'public/uploads'));
    },
    filename: function(request, file, callback) {
        const uniqueFileName = Date.now() + '-' + file.originalname;
        callback(null, uniqueFileName);
    }
});
const upload = multer({ storage: storageConfiguration });

// Cấu hình gửi email sử dụng nodemailer
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Hàm tạo tài khoản quản trị viên mặc định nếu chưa có
const createDefaultAdminAccount = async () => {
    const existingAdmin = await User.findOne({ email: 'admin@pcmarket.com' });
    if (!existingAdmin) {
        const adminAccount = new User({
            fullName: 'Quản trị viên hệ thống',
            email: 'admin@pcmarket.com',
            phone: '0123456789',
            address: 'Hà Nội, Việt Nam',
            password: 'admin123',
            role: 'admin',
            isActive: true
        });
        await adminAccount.save();
        console.log('Tài khoản quản trị viên đã được tạo thành công!');
        console.log('Email đăng nhập: admin@pcmarket.com');
        console.log('Mật khẩu: admin123');
    }
};

// Hàm tạo tài khoản nhân viên bán hàng mẫu
const createDefaultStaffAccount = async () => {
    const existingStaff = await User.findOne({ email: 'staff@pcmarket.com' });
    if (!existingStaff) {
        const staffAccount = new User({
            fullName: 'Nguyễn Văn Nhân Viên',
            email: 'staff@pcmarket.com',
            phone: '0987654321',
            address: 'Hà Nội, Việt Nam',
            password: 'staff123',
            role: 'staff',
            staffCode: 'NV001',
            department: 'sales',
            joinedAt: new Date(),
            isActive: true
        });
        await staffAccount.save();
        
    }
};

// Hàm khởi tạo dữ liệu danh mục và sản phẩm mẫu
const initializeSampleData = async () => {
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
        const categoryList = [
            { name: 'PC GAMING, STREAMING', slug: 'pc-gaming-streaming', order: 1 },
            { name: 'PC WORKSTATION', slug: 'pc-workstation', order: 2 },
            { name: 'PC VĂN PHÒNG', slug: 'pc-van-phong', order: 3 },
            { name: 'LAPTOP', slug: 'laptop', order: 4 },
            { name: 'LINH KIỆN MÁY TÍNH', slug: 'linh-kien-may-tinh', order: 5 },
            { name: 'MÀN HÌNH MÁY TÍNH', slug: 'man-hinh-may-tinh', order: 6 },
            { name: 'GAMING GEAR', slug: 'gaming-gear', order: 7 }
        ];
        
        for (const categoryData of categoryList) {
            await Category.create(categoryData);
        }
        console.log('Đã tạo danh mục sản phẩm mẫu thành công');
        
        // Tạo sản phẩm mẫu
        const gamingCategory = await Category.findOne({ slug: 'pc-gaming-streaming' });
        if (gamingCategory) {
            const sampleProducts = [
                {
                    name: 'PC GAMING CORE ULTRA 7 265KF',
                    slug: 'pc-gaming-core-ultra-7-265kf',
                    categories: [gamingCategory._id],
                    price: 54180000,
                    oldPrice: 55999000,
                    stock: 10,
                    cpu: 'Intel Core Ultra 7 265KF',
                    ram: '32GB DDR5 6000MHz',
                    storage: '1TB SSD NVMe PCIe 4.0',
                    graphics: 'RTX 5070 Ti 16GB OC',
                    description: 'Máy tính gaming cao cấp với CPU Intel Core Ultra 7 và VGA RTX 5070 Ti',
                    specifications: 'Mainboard B760, Nguồn 750W 80 Plus Gold, Tản nhiệt nước 360mm'
                },
                {
                    name: 'PC GAMING CORE ULTRA 5 245KF',
                    slug: 'pc-gaming-core-ultra-5-245kf',
                    categories: [gamingCategory._id],
                    price: 34680000,
                    oldPrice: 35999000,
                    stock: 15,
                    cpu: 'Intel Core Ultra 5 245KF',
                    ram: '16GB DDR5 6000MHz',
                    storage: '512GB SSD NVMe PCIe 4.0',
                    graphics: 'RTX 5060 Ti 16GB',
                    description: 'Máy tính gaming tầm trung hiệu năng cao',
                    specifications: 'Mainboard B760, Nguồn 650W 80 Plus Bronze, Tản nhiệt khí'
                }
            ];
            for (const productData of sampleProducts) {
                await Product.create(productData);
            }
            console.log('Đã tạo sản phẩm mẫu thành công');
        }
    }
};

// Hàm tạo voucher mẫu
const createSampleVouchers = async () => {
    const voucherCount = await Voucher.countDocuments();
    if (voucherCount === 0) {
        const vouchers = [
            { code: 'GIAM10K', name: 'Giảm 10.000đ', type: 'discount_fixed', discountValue: 10000, minOrderValue: 200000, quantity: 100, endDate: new Date('2025-12-31'), showOnCheckout: true, isActive: true },
            { code: 'GIAM20K', name: 'Giảm 20.000đ', type: 'discount_fixed', discountValue: 20000, minOrderValue: 500000, quantity: 50, endDate: new Date('2025-12-31'), showOnCheckout: true, isActive: true },
            { code: 'GIAM10PT', name: 'Giảm 10%', type: 'discount_percent', discountValue: 10, maxDiscount: 50000, minOrderValue: 300000, quantity: 50, endDate: new Date('2025-12-31'), showOnCheckout: true, isActive: true },
            { code: 'FREESHIP', name: 'Miễn phí vận chuyển', type: 'freeship', minOrderValue: 300000, quantity: 200, endDate: new Date('2025-12-31'), showOnCheckout: true, isActive: true }
        ];
        for (const v of vouchers) {
            await Voucher.create(v);
        }
        console.log('Đã tạo voucher mẫu');
    }
};

// ==================== ROUTES CÔNG KHAI ====================

// Trang chủ
app.get('/', async (request, response) => {
    try {
        const allCategories = await Category.find().sort('order');
        const featuredProducts = await Product.find({ isActive: true })
            .sort('-createdAt')
            .limit(12)
            .populate('categories');
        const bestSellerProducts = await Product.find({ isActive: true })
            .sort('-soldCount')
            .limit(8)
            .populate('categories');
        
        response.render('index', {
            title: 'PC Market - Website bán máy tính chuyên nghiệp',
            categories: allCategories,
            featuredProducts: featuredProducts,
            bestSellers: bestSellerProducts
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi máy chủ, vui lòng thử lại sau');
    }
});

// Danh sách sản phẩm với bộ lọc
app.get('/products', async (request, response) => {
    try {
        const queryParameters = request.query;
        let filterQuery = { isActive: true };
        
        // Lọc theo danh mục
        if (queryParameters.category) {
            const categorySlug = queryParameters.category;
            const category = await Category.findOne({ slug: categorySlug });
            if (category) {
                filterQuery.categories = { $in: [category._id] };
            }
        }
        
        // Tìm kiếm theo tên
        if (queryParameters.search) {
            filterQuery.name = { $regex: queryParameters.search, $options: 'i' };
        }
        
        // Lọc theo khoảng giá
        if (queryParameters.minPrice || queryParameters.maxPrice) {
            filterQuery.price = {};
            if (queryParameters.minPrice && queryParameters.minPrice !== '') {
                filterQuery.price.$gte = parseInt(queryParameters.minPrice);
            }
            if (queryParameters.maxPrice && queryParameters.maxPrice !== '') {
                filterQuery.price.$lte = parseInt(queryParameters.maxPrice);
            }
        }
        
        // Lọc theo CPU
        if (queryParameters.cpu && queryParameters.cpu !== '') {
            filterQuery.cpu = { $regex: queryParameters.cpu, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo RAM =====
        if (queryParameters.ram && queryParameters.ram !== '') {
            filterQuery.ram = { $regex: queryParameters.ram, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo SSD (storage) =====
        if (queryParameters.storage && queryParameters.storage !== '') {
            filterQuery.storage = { $regex: queryParameters.storage, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo GPU (graphics) =====
        if (queryParameters.graphics && queryParameters.graphics !== '') {
            filterQuery.graphics = { $regex: queryParameters.graphics, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo Mainboard (chỉ linh kiện) =====
        if (queryParameters.mainboard && queryParameters.mainboard !== '') {
            filterQuery.mainboard = { $regex: queryParameters.mainboard, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo Case =====
        if (queryParameters.case && queryParameters.case !== '') {
            filterQuery.case = { $regex: queryParameters.case, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo PSU (Nguồn) =====
        if (queryParameters.psu && queryParameters.psu !== '') {
            filterQuery.psu = { $regex: queryParameters.psu, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo HDD =====
        if (queryParameters.hdd && queryParameters.hdd !== '') {
            filterQuery.hdd = { $regex: queryParameters.hdd, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo Tản nhiệt (Cooler) =====
        if (queryParameters.cooler && queryParameters.cooler !== '') {
            filterQuery.cooler = { $regex: queryParameters.cooler, $options: 'i' };
        }
        
        // ===== THÊM MỚI: Lọc theo Hãng (Brand) =====
        if (queryParameters.brand && queryParameters.brand !== '') {
            filterQuery.brand = { $regex: queryParameters.brand, $options: 'i' };
        }

        // ===== THÊM MỚI: Lọc theo Kích thước màn hình =====
        if (queryParameters.screenSize && queryParameters.screenSize !== '') {
            filterQuery.screenSize = { $regex: queryParameters.screenSize, $options: 'i' };
        }

        // ===== THÊM MỚI: Lọc theo Độ phân giải =====
        if (queryParameters.resolution && queryParameters.resolution !== '') {
            filterQuery.resolution = { $regex: queryParameters.resolution, $options: 'i' };
        }

        // ===== THÊM MỚI: Lọc theo Tần số quét =====
        if (queryParameters.refreshRate && queryParameters.refreshRate !== '') {
            filterQuery.refreshRate = { $regex: queryParameters.refreshRate, $options: 'i' };
        }

        // ===== THÊM MỚI: Lọc theo Tấm nền =====
        if (queryParameters.panelType && queryParameters.panelType !== '') {
           filterQuery.panelType = { $regex: queryParameters.panelType, $options: 'i' };
        }
        
        // Sắp xếp
        let sortOption = {};
        switch (queryParameters.sort) {
            case 'price_asc': sortOption.price = 1; break;
            case 'price_desc': sortOption.price = -1; break;
            case 'newest': sortOption.createdAt = -1; break;
            case 'sold': sortOption.soldCount = -1; break;
            default: sortOption.createdAt = -1;
        }
        
        const productList = await Product.find(filterQuery)
            .sort(sortOption)
            .populate('categories');
        const categoryList = await Category.find().sort('order');
        
        // Kiểm tra loại danh mục
        const isLinhKien = queryParameters.category === 'linh-kien-may-tinh';
        const isManHinh = queryParameters.category === 'man-hinh-may-tinh';
        response.render('products', {
            title: 'Danh sách sản phẩm máy tính',
            products: productList,
            categories: categoryList,
            query: queryParameters,
            isLinhKien: isLinhKien,  
            isManHinh: isManHinh
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi máy chủ, vui lòng thử lại sau');
    }
});

// Chi tiết sản phẩm
app.get('/product/:slug', async (request, response) => {
    try {
        const productSlug = request.params.slug;
        const productDetail = await Product.findOne({ slug: productSlug, isActive: true })
            .populate('categories');
        
        if (!productDetail) {
            return response.status(404).send('Không tìm thấy sản phẩm');
        }
        
        let relatedProducts = [];
        if (productDetail.categories && productDetail.categories.length > 0) {
            const categoryIds = productDetail.categories.map(cat => cat._id);
            relatedProducts = await Product.find({
                categories: { $in: categoryIds },
                isActive: true,
                _id: { $ne: productDetail._id }
            }).limit(4).populate('categories');
        }
        
        response.render('product-detail', {
            title: productDetail.name,
            product: productDetail,
            relatedProducts: relatedProducts
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi máy chủ, vui lòng thử lại sau');
    }
});

// Tìm kiếm sản phẩm
app.get('/search', async (request, response) => {
    try {
        const searchKeyword = request.query.q;
        const searchResults = await Product.find({
            name: { $regex: searchKeyword, $options: 'i' },
            isActive: true
        }).populate('categories');
        const allCategories = await Category.find();
        
        response.render('products', {
            title: `Kết quả tìm kiếm: ${searchKeyword}`,
            products: searchResults,
            categories: allCategories,
            query: request.query
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi máy chủ, vui lòng thử lại sau');
    }
});

// ==================== ROUTES XÁC THỰC ====================

// Trang đăng nhập
app.get('/login', authenticationMiddleware.requireLogout, (request, response) => {
    response.render('login', { title: 'Đăng nhập tài khoản', errorMessage: null });
});

app.post('/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return response.render('login', { title: 'Đăng nhập', errorMessage: 'Email không tồn tại' });
        }
        
        if (!user.isActive) {
            return response.render('login', { title: 'Đăng nhập', errorMessage: 'Tài khoản đã bị khóa' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return response.render('login', { title: 'Đăng nhập', errorMessage: 'Mật khẩu không đúng' });
        }
        
        request.session.user = {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        };
        
        const cart = await Cart.findOne({ user: user._id });
        if (cart && cart.items.length > 0) {
            request.session.cart = cart.items;
        } else if (!request.session.cart) {
            request.session.cart = [];
        }

        if (user.role === 'admin') {
            response.redirect('/admin/dashboard');
        } else if (user.role === 'staff') {
            response.redirect('/staff/dashboard');
        } else {
            response.redirect('/');
        }
    
    } catch (error) {
        console.error(error);
        response.render('login', { title: 'Đăng nhập', errorMessage: 'Lỗi server' });
    }
});

// Trang đăng ký
app.get('/register', authenticationMiddleware.requireLogout, (request, response) => {
    response.render('register', { title: 'Đăng ký tài khoản mới', errorMessage: null });
});

app.post('/register', async (request, response) => {
    try {
        const { fullName, email, phone, address, password, confirmPassword } = request.body;
        
        if (password !== confirmPassword) {
            return response.render('register', { 
                title: 'Đăng ký tài khoản mới', 
                errorMessage: 'Mật khẩu xác nhận không khớp' 
            });
        }
        
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return response.render('register', { 
                title: 'Đăng ký tài khoản mới', 
                errorMessage: 'Email này đã được đăng ký, vui lòng sử dụng email khác' 
            });
        }
        
        const newUser = new User({
            fullName: fullName,
            email: email.toLowerCase(),
            phone: phone,
            address: address,
            password: password,
            role: 'customer'
        });
        await newUser.save();
        
        response.redirect('/login');
    } catch (error) {
        console.error(error);
        response.render('register', { 
            title: 'Đăng ký tài khoản mới', 
            errorMessage: 'Đăng ký thất bại, vui lòng thử lại sau' 
        });
    }
});

// Quên mật khẩu
app.get('/forgot-password', authenticationMiddleware.requireLogout, (request, response) => {
    response.render('forgot-password', { 
        title: 'Quên mật khẩu', 
        successMessage: null, 
        errorMessage: null 
    });
});

app.post('/forgot-password', async (request, response) => {
    try {
        const { email } = request.body;
        
        if (!email || email.trim() === '') {
            return response.render('forgot-password', { 
                title: 'Quên mật khẩu', 
                errorMessage: 'Vui lòng nhập email', 
                successMessage: null 
            });
        }
        
        const foundUser = await User.findOne({ email: email.toLowerCase() });
        
        if (!foundUser) {
            return response.render('forgot-password', { 
                title: 'Quên mật khẩu', 
                errorMessage: 'Email không tồn tại trong hệ thống', 
                successMessage: null 
            });
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        foundUser.resetPasswordToken = resetToken;
        foundUser.resetPasswordExpires = Date.now() + 3600000;
        await foundUser.save();
        
        const resetUrl = `http://localhost:${PORT}/reset-password/${resetToken}`;
        
        const mailOptions = {
            to: foundUser.email,
            from: `"PC Market" <${process.env.EMAIL_USER}>`,
            subject: 'Đặt lại mật khẩu - PC Market',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Đặt lại mật khẩu</h2>
                    <p>Xin chào <strong>${foundUser.fullName}</strong>,</p>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p>Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
                    </p>
                    <p>Link này có hiệu lực trong 1 giờ.</p>
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                </div>
            `
        };
        
        if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
            await emailTransporter.sendMail(mailOptions);
            console.log(`Đã gửi email đặt lại mật khẩu tới ${foundUser.email}`);
        } else {
            console.log(`[DEMO] Link đặt lại mật khẩu: ${resetUrl}`);
        }
        
        response.render('forgot-password', { 
            title: 'Quên mật khẩu', 
            successMessage: `Email đặt lại mật khẩu đã được gửi đến ${foundUser.email}. Vui lòng kiểm tra hộp thư.`, 
            errorMessage: null 
        });
        
    } catch (error) {
        console.error('Lỗi gửi email quên mật khẩu:', error);
        response.render('forgot-password', { 
            title: 'Quên mật khẩu', 
            errorMessage: 'Lỗi gửi email, vui lòng thử lại sau', 
            successMessage: null 
        });
    }
});

app.get('/reset-password/:token', authenticationMiddleware.requireLogout, async (request, response) => {
    try {
        const foundUser = await User.findOne({
            resetPasswordToken: request.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!foundUser) {
            return response.redirect('/forgot-password');
        }
        
        response.render('reset-password', { 
            title: 'Đặt lại mật khẩu', 
            token: request.params.token, 
            errorMessage: null 
        });
    } catch (error) {
        response.redirect('/forgot-password');
    }
});

app.post('/reset-password/:token', async (request, response) => {
    try {
        const { password, confirmPassword } = request.body;
        
        if (password !== confirmPassword) {
            return response.render('reset-password', { 
                title: 'Đặt lại mật khẩu', 
                token: request.params.token, 
                errorMessage: 'Mật khẩu xác nhận không khớp' 
            });
        }
        
        const foundUser = await User.findOne({
            resetPasswordToken: request.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!foundUser) {
            return response.redirect('/forgot-password');
        }
        
        foundUser.password = password;
        foundUser.resetPasswordToken = null;
        foundUser.resetPasswordExpires = null;
        await foundUser.save();
        
        response.redirect('/login');
    } catch (error) {
        response.render('reset-password', { 
            title: 'Đặt lại mật khẩu', 
            token: request.params.token, 
            errorMessage: 'Đặt lại mật khẩu thất bại, vui lòng thử lại' 
        });
    }
});

// Đăng xuất
app.get('/logout', async (request, response) => {
    if (request.session.user && request.session.user.id && request.session.cart) {
        await Cart.findOneAndUpdate(
            { user: request.session.user.id },
            { items: request.session.cart, updatedAt: Date.now() },
            { upsert: true }
        );
    }
    request.session.destroy();
    response.redirect('/');
});

// ==================== ROUTES GIỎ HÀNG ====================

app.post('/cart/add', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { productId, quantity = 1 } = request.body;
        const selectedProduct = await Product.findById(productId);
        
        if (!selectedProduct) {
            return response.json({ success: false, message: 'Sản phẩm không tồn tại' });
        }
        
        if (selectedProduct.stock < quantity) {
            return response.json({ success: false, message: 'Sản phẩm không đủ hàng trong kho' });
        }
        
        let cart = await Cart.findOne({ user: request.session.user.id });
        
        if (!cart) {
            cart = new Cart({
                user: request.session.user.id,
                items: []
            });
        }
        
        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity += parseInt(quantity);
        } else {
            cart.items.push({
                productId: selectedProduct._id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                image: selectedProduct.image,
                slug: selectedProduct.slug,
                quantity: parseInt(quantity)
            });
        }
        
        await cart.save();
        request.session.cart = cart.items;
        
        const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
        
        response.json({ 
            success: true, 
            message: 'Đã thêm vào giỏ hàng',
            cartCount: cartItemCount
        });
    } catch (error) {
        console.error('Lỗi thêm giỏ hàng:', error);
        response.json({ success: false, message: 'Lỗi khi thêm vào giỏ hàng' });
    }
});

app.get('/cart', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        let cart = await Cart.findOne({ user: request.session.user.id });
        
        if (!cart) {
            cart = new Cart({ user: request.session.user.id, items: [] });
            await cart.save();
        }
        
        request.session.cart = cart.items;
        
        const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        response.render('cart', { 
            title: 'Giỏ hàng của tôi', 
            cart: cart.items, 
            total: cartTotal 
        });
    } catch (error) {
        console.error('Lỗi tải giỏ hàng:', error);
        response.status(500).send('Lỗi tải giỏ hàng');
    }
});

app.post('/cart/update', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { productId, quantity } = request.body;
        
        let cart = await Cart.findOne({ user: request.session.user.id });
        
        if (cart) {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex !== -1 && quantity > 0) {
                cart.items[itemIndex].quantity = parseInt(quantity);
                await cart.save();
                request.session.cart = cart.items;
            }
        }
        
        response.json({ success: true });
    } catch (error) {
        console.error('Lỗi cập nhật:', error);
        response.json({ success: false });
    }
});

app.post('/cart/remove', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { productId } = request.body;
        
        let cart = await Cart.findOne({ user: request.session.user.id });
        
        if (cart) {
            cart.items = cart.items.filter(item => item.productId.toString() !== productId);
            await cart.save();
            request.session.cart = cart.items;
        }
        
        const cartItemCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        
        response.json({ 
            success: true, 
            message: 'Xóa sản phẩm thành công',
            cartCount: cartItemCount
        });
    } catch (error) {
        console.error('Lỗi xóa sản phẩm:', error);
        response.json({ success: false, message: 'Xóa sản phẩm thất bại' });
    }
});

app.get('/cart/count', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        let cart = await Cart.findOne({ user: request.session.user.id });
        const cartItemCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        response.json({ count: cartItemCount });
    } catch (error) {
        response.json({ count: 0 });
    }
});

// ==================== ROUTES THANH TOÁN ====================

app.get('/checkout', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        if (!request.session.cart || request.session.cart.length === 0) {
            return response.redirect('/cart');
        }
        
        const currentUser = await User.findById(request.session.user.id);
        const cartSubtotal = request.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = 30000;
        const orderTotal = cartSubtotal + shippingCost;
        
        let availableVouchers = [];
        try {
            availableVouchers = await Voucher.find({
                isActive: true,
                showOnCheckout: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
                $or: [
                    { quantity: 0 },
                    { $expr: { $lt: ["$usedCount", "$quantity"] } }
                ]
            }).limit(10);
        } catch (err) {
            console.log('Lỗi lấy voucher:', err.message);
        }
        
        response.render('checkout', {
            title: 'Thanh toán',
            cart: request.session.cart,
            user: currentUser,
            subtotal: cartSubtotal,
            shippingFee: shippingCost,
            total: orderTotal,
            vouchers: availableVouchers,
            userPoints: currentUser.points || 0
        });
    } catch (error) {
        console.error('Lỗi tải trang thanh toán:', error);
        response.status(500).send('Lỗi tải trang thanh toán');
    }
});

// Xử lý đặt hàng
app.post('/checkout', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { fullName, email, phone, address, paymentMethod, note, voucherCode } = request.body;
        
        // Kiểm tra giỏ hàng
        if (!request.session.cart || request.session.cart.length === 0) {
            return response.redirect('/cart');
        }
        
        const currentUser = await User.findById(request.session.user.id);
        
        // Tính toán đơn hàng
        const cartSubtotal = request.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let shippingCost = 30000;
        let totalDiscount = 0;
        let isFreeShip = false;
        let appliedVouchers = [];
        
        // Xử lý voucher (có thể có nhiều mã, phân cách bằng dấu phẩy)
        if (voucherCode && voucherCode.trim() !== '') {
            const codes = voucherCode.split(',');
            
            for (const code of codes) {
                const trimmedCode = code.trim().toUpperCase();
                if (!trimmedCode) continue;
                
                const voucher = await Voucher.findOne({ code: trimmedCode });
                if (voucher && voucher.isValid(cartSubtotal)) {
                    if (voucher.type === 'freeship') {
                        isFreeShip = true;
                        appliedVouchers.push(voucher);
                    } else {
                        const discount = voucher.calculateDiscount(cartSubtotal);
                        totalDiscount += discount;
                        appliedVouchers.push(voucher);
                    }
                }
            }
            
            // Cập nhật phí ship nếu có mã freeship
            if (isFreeShip) {
                shippingCost = 0;
            }
            
            // Giới hạn tổng giảm giá không vượt quá tổng đơn hàng
            totalDiscount = Math.min(totalDiscount, cartSubtotal);
            
            // Cập nhật số lượt sử dụng voucher
            for (const voucher of appliedVouchers) {
                voucher.usedCount += 1;
                await voucher.save();
            }
        }
        
        const orderTotal = cartSubtotal + shippingCost - totalDiscount;
        const orderCode = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Tạo đơn hàng mới
        const newOrder = new Order({
            orderCode: orderCode,
            user: currentUser._id,
            fullName: fullName || currentUser.fullName,
            email: email || currentUser.email,
            phone: phone || currentUser.phone,
            address: address || currentUser.address,
            items: request.session.cart.map(item => ({
                product: item.productId,
                productName: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: cartSubtotal,
            shippingFee: shippingCost,
            discount: totalDiscount,
            total: orderTotal,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: 'Chưa thanh toán',
            note: note || '',
            orderStatus: 'Chờ xác nhận',
            statusHistory: [{ 
                status: 'Chờ xác nhận', 
                date: new Date(), 
                note: 'Đơn hàng đã được tạo' 
            }]
        });
        
        await newOrder.save();
        
        // Cập nhật tồn kho
        for (const cartItem of request.session.cart) {
            await Product.findByIdAndUpdate(cartItem.productId, {
                $inc: { stock: -cartItem.quantity, soldCount: cartItem.quantity }
            });
        }
        
        // Cập nhật điểm tích lũy
        const pointsToAdd = Math.floor(orderTotal / 1000);
        currentUser.points = (currentUser.points || 0) + pointsToAdd;
        currentUser.totalSpent = (currentUser.totalSpent || 0) + orderTotal;
        await currentUser.save();
        
        // Xóa giỏ hàng
        request.session.cart = [];
        await Cart.findOneAndUpdate(
            { user: currentUser._id },
            { items: [], updatedAt: Date.now() },
            { upsert: true }
        );
        
        response.redirect(`/orders/${newOrder._id}`);
        
    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        response.status(500).send('Có lỗi xảy ra khi đặt hàng: ' + error.message);
    }
});

// ==================== ROUTES VOUCHER API ====================

app.post('/check-voucher', authenticationMiddleware.requireLogin, async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        const shippingFee = 30000;
        
        if (typeof code === 'string') {
            const voucher = await Voucher.findOne({ code: code.toUpperCase() });
            
            if (!voucher) {
                return res.json({ success: false, message: 'Mã giảm giá không tồn tại' });
            }
            
            if (!voucher.isValid(subtotal)) {
                let message = 'Mã giảm giá không thể áp dụng';
                const now = new Date();
                if (now < voucher.startDate) {
                    message = `Mã giảm giá chưa đến ngày áp dụng`;
                } else if (now > voucher.endDate) {
                    message = `Mã giảm giá đã hết hạn`;
                } else if (voucher.quantity > 0 && voucher.usedCount >= voucher.quantity) {
                    message = 'Mã giảm giá đã hết lượt sử dụng';
                } else if (voucher.minOrderValue > 0 && subtotal < voucher.minOrderValue) {
                    message = `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này`;
                }
                return res.json({ success: false, message: message });
            }
            
            let discountAmount = 0;
            let isFreeShip = false;
            
            if (voucher.type === 'discount_percent') {
                discountAmount = (subtotal * voucher.discountValue) / 100;
                if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
                    discountAmount = voucher.maxDiscount;
                }
            } else if (voucher.type === 'discount_fixed') {
                discountAmount = voucher.discountValue;
            } else if (voucher.type === 'freeship') {
                isFreeShip = true;
                discountAmount = shippingFee;
            }
            discountAmount = Math.min(discountAmount, subtotal);
            
            return res.json({
                success: true,
                voucher: {
                    id: voucher._id,
                    code: voucher.code,
                    name: voucher.name,
                    type: voucher.type,
                    discountValue: voucher.discountValue,
                    discountAmount: discountAmount,
                    isFreeShip: isFreeShip
                }
            });
        }
        
        res.json({ success: false, message: 'Dữ liệu không hợp lệ' });
        
    } catch (error) {
        console.error('Lỗi kiểm tra voucher:', error);
        res.json({ success: false, message: 'Lỗi kiểm tra mã, vui lòng thử lại' });
    }
});

// ==================== ROUTES QUẢN LÝ ĐƠN HÀNG KHÁCH HÀNG ====================

app.get('/orders', authenticationMiddleware.requireLogin, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.session.user.id }).sort('-createdAt');
        res.render('orders', { title: 'Đơn hàng của tôi', orders: orders });
    } catch (error) {
        res.status(500).send('Lỗi tải đơn hàng');
    }
});

app.get('/orders/:orderId', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const orderDetail = await Order.findById(request.params.orderId);
        
        if (!orderDetail) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        
        if (orderDetail.user.toString() !== request.session.user.id) {
            return response.status(403).send('Bạn không có quyền xem đơn hàng này');
        }
        
        response.render('order-detail', { 
            title: 'Chi tiết đơn hàng', 
            order: orderDetail 
        });
    } catch (error) {
        console.error('Lỗi tải chi tiết đơn hàng:', error);
        response.status(500).send('Lỗi tải chi tiết đơn hàng');
    }
});

app.get('/orders/:orderId/edit', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const order = await Order.findById(request.params.orderId);
        
        if (!order) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        
        if (order.user.toString() !== request.session.user.id) {
            return response.status(403).send('Bạn không có quyền sửa đơn hàng này');
        }
        
        if (order.orderStatus !== 'Chờ xác nhận') {
            return response.status(400).send('Chỉ có thể sửa đơn hàng khi đang ở trạng thái chờ xác nhận');
        }
        
        response.render('order-edit', { 
            title: 'Sửa thông tin đơn hàng', 
            order: order 
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang sửa đơn hàng');
    }
});

app.put('/orders/:orderId', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { fullName, email, phone, address, note } = request.body;
        const order = await Order.findById(request.params.orderId);
        
        if (!order || order.user.toString() !== request.session.user.id) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        
        if (order.orderStatus !== 'Chờ xác nhận') {
            return response.status(400).send('Chỉ có thể sửa đơn hàng khi đang chờ xác nhận');
        }
        
        order.fullName = fullName || order.fullName;
        order.email = email || order.email;
        order.phone = phone || order.phone;
        order.address = address || order.address;
        order.note = note || order.note;
        
        order.statusHistory.push({ 
            status: order.orderStatus, 
            date: new Date(), 
            note: 'Khách hàng đã cập nhật thông tin đơn hàng' 
        });
        
        await order.save();
        response.redirect(`/orders/${order._id}`);
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi cập nhật đơn hàng');
    }
});

app.post('/orders/:orderId/cancel', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const targetOrder = await Order.findById(request.params.orderId);
        
        if (!targetOrder) {
            return response.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        
        if (targetOrder.user.toString() !== request.session.user.id) {
            return response.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này' });
        }
        
        if (targetOrder.orderStatus !== 'Chờ xác nhận') {
            return response.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn hàng đang chờ xác nhận' });
        }
        
        targetOrder.orderStatus = 'Đã hủy';
        targetOrder.statusHistory.push({ 
            status: 'Đã hủy', 
            date: new Date(), 
            note: 'Khách hàng đã hủy đơn hàng' 
        });
        await targetOrder.save();
        
        for (const item of targetOrder.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity, soldCount: -item.quantity }
            });
        }
        
        response.json({ success: true, message: 'Hủy đơn hàng thành công' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ success: false, message: 'Lỗi khi hủy đơn hàng' });
    }
});

app.delete('/orders/:orderId', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const targetOrder = await Order.findById(request.params.orderId);
        
        if (!targetOrder) {
            return response.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        
        if (targetOrder.user.toString() !== request.session.user.id) {
            return response.status(403).json({ success: false, message: 'Bạn không có quyền xóa đơn hàng này' });
        }
        
        if (targetOrder.orderStatus !== 'Đã giao hàng' && targetOrder.orderStatus !== 'Đã hủy') {
            return response.status(400).json({ 
                success: false, 
                message: 'Chỉ có thể xóa đơn hàng đã giao hoặc đã hủy' 
            });
        }
        
        await Order.findByIdAndDelete(request.params.orderId);
        response.json({ success: true, message: 'Xóa đơn hàng thành công' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
    }
});

// ==================== ROUTES TÀI KHOẢN ====================

app.get('/account', authenticationMiddleware.requireLogin, async (request, response) => {
    const currentUser = await User.findById(request.session.user.id);
    response.render('account', { 
        title: 'Quản lý tài khoản', 
        user: currentUser, 
        message: null 
    });
});

app.put('/account', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { fullName, phone, address } = request.body;
        await User.findByIdAndUpdate(request.session.user.id, { 
            fullName: fullName, 
            phone: phone, 
            address: address 
        });
        request.session.user.fullName = fullName;
        
        const updatedUser = await User.findById(request.session.user.id);
        response.render('account', { 
            title: 'Quản lý tài khoản', 
            user: updatedUser, 
            message: 'Cập nhật thông tin tài khoản thành công!' 
        });
    } catch (error) {
        const currentUser = await User.findById(request.session.user.id);
        response.render('account', { 
            title: 'Quản lý tài khoản', 
            user: currentUser, 
            message: 'Cập nhật thông tin thất bại, vui lòng thử lại!' 
        });
    }
});

app.post('/account/change-password', authenticationMiddleware.requireLogin, async (request, response) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = request.body;
        const currentUser = await User.findById(request.session.user.id);
        
        const isPasswordValid = await currentUser.comparePassword(currentPassword);
        if (!isPasswordValid) {
            const updatedUser = await User.findById(request.session.user.id);
            return response.render('account', { 
                title: 'Quản lý tài khoản', 
                user: updatedUser, 
                message: 'Mật khẩu hiện tại không đúng!' 
            });
        }
        
        if (newPassword !== confirmPassword) {
            const updatedUser = await User.findById(request.session.user.id);
            return response.render('account', { 
                title: 'Quản lý tài khoản', 
                user: updatedUser, 
                message: 'Mật khẩu xác nhận không khớp!' 
            });
        }
        
        currentUser.password = newPassword;
        await currentUser.save();
        
        const updatedUser = await User.findById(request.session.user.id);
        response.render('account', { 
            title: 'Quản lý tài khoản', 
            user: updatedUser, 
            message: 'Đổi mật khẩu thành công!' 
        });
    } catch (error) {
        const currentUser = await User.findById(request.session.user.id);
        response.render('account', { 
            title: 'Quản lý tài khoản', 
            user: currentUser, 
            message: 'Đổi mật khẩu thất bại, vui lòng thử lại!' 
        });
    }
});

// ==================== ROUTES ADMIN API ====================

app.get('/api/order-statistics', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const pendingOrders = await Order.countDocuments({ orderStatus: 'Chờ xác nhận' });
        const confirmedOrders = await Order.countDocuments({ orderStatus: 'Đã xác nhận' });
        const preparingOrders = await Order.countDocuments({ orderStatus: 'Đang chuẩn bị' });
        const shippingOrders = await Order.countDocuments({ orderStatus: 'Đang giao hàng' });
        const deliveredOrders = await Order.countDocuments({ orderStatus: 'Đã giao hàng' });
        const cancelledOrders = await Order.countDocuments({ orderStatus: 'Đã hủy' });
        
        response.json({
            success: true,
            pending: pendingOrders,
            confirmed: confirmedOrders,
            preparing: preparingOrders,
            shipping: shippingOrders,
            delivered: deliveredOrders,
            cancelled: cancelledOrders
        });
    } catch (error) {
        console.error(error);
        response.json({ success: false });
    }
});

app.get('/api/revenue-statistics', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const revenueData = await Order.aggregate([
            { $match: { orderStatus: 'Đã giao hàng' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 } } }
        ]);
        
        const totalRevenue = revenueData[0]?.totalRevenue || 0;
        const completedOrders = revenueData[0]?.orderCount || 0;
        
        const monthlyRevenue = await Order.aggregate([
            { $match: { orderStatus: 'Đã giao hàng' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const dailyRevenue = await Order.aggregate([
            { $match: { orderStatus: 'Đã giao hàng', createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        response.json({
            success: true,
            totalRevenue: totalRevenue,
            completedOrders: completedOrders,
            monthlyRevenue: monthlyRevenue,
            dailyRevenue: dailyRevenue
        });
    } catch (error) {
        console.error('Lỗi thống kê doanh thu:', error);
        response.json({ success: false, message: 'Lỗi thống kê doanh thu' });
    }
});

// ==================== ROUTES ADMIN DASHBOARD ====================

app.get('/admin/dashboard', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        
        const revenueData = await Order.aggregate([
            { $match: { orderStatus: 'Đã giao hàng' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueData[0]?.total || 0;
        
        const recentOrders = await Order.find()
            .sort('-createdAt')
            .limit(10)
            .populate('user');
        
        response.render('admin/dashboard', {
            title: 'Bảng điều khiển quản trị',
            totalOrders: totalOrders,
            totalProducts: totalProducts,
            totalCustomers: totalCustomers,
            revenue: totalRevenue,
            recentOrders: recentOrders
        });
    } catch (error) {
        console.error('Lỗi dashboard:', error);
        response.status(500).send('Lỗi tải trang dashboard');
    }
});

// ==================== ROUTES ADMIN SẢN PHẨM ====================

app.get('/admin/products', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const allProducts = await Product.find().populate('categories').sort('-createdAt');
        const allCategories = await Category.find().sort('order');
        
        response.render('admin/products', { 
            title: 'Quản lý sản phẩm', 
            products: allProducts,
            categories: allCategories
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang quản lý sản phẩm');
    }
});

app.get('/admin/products/create', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const allCategories = await Category.find();
        response.render('admin/product-form', { 
            title: 'Thêm sản phẩm mới', 
            product: null, 
            categories: allCategories 
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang thêm sản phẩm');
    }
});

app.post('/admin/products', authenticationMiddleware.requireAdmin, upload.single('image'), async (request, response) => {
    try {
        const { name, categories, price, oldPrice, stock, cpu, ram, storage, graphics, mainboard, case: caseName, psu, hdd, cooler, brand, screenSize, dimensions, panelType, resolution, refreshRate, description, specifications } = request.body;
        const productSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        let categoryArray = [];
        if (categories) {
            if (typeof categories === 'string') {
                categoryArray = [categories];
            } else if (Array.isArray(categories)) {
                categoryArray = categories;
            }
        }
        
        const newProduct = new Product({
        name: name,
        slug: productSlug,
        categories: categoryArray,
        price: parseInt(price),
        oldPrice: oldPrice ? parseInt(oldPrice) : null,
        stock: parseInt(stock),
        cpu: cpu || '',
        ram: ram || '',
        storage: storage || '',
        graphics: graphics || '',
        mainboard: mainboard || '',
        case: caseName || '',
        psu: psu || '',
        hdd: hdd || '',
        cooler: cooler || '',
        brand: brand || '',
        // ===== THÊM THÔNG SỐ MÀN HÌNH =====
        screenSize: screenSize || '',
        dimensions: dimensions || '',
        panelType: panelType || '',
        resolution: resolution || '',
        refreshRate: refreshRate || '',
        // ===== KẾT THÚC =====
        description: description || '',
        specifications: specifications || '',
        image: request.file ? '/uploads/' + request.file.filename : null
});
        
        await newProduct.save();
        response.redirect('/admin/products');
    } catch (error) {
        console.error('Lỗi thêm sản phẩm:', error);
        const allCategories = await Category.find();
        response.render('admin/product-form', { 
            title: 'Thêm sản phẩm mới', 
            product: null, 
            categories: allCategories, 
            error: 'Lỗi khi thêm sản phẩm: ' + error.message
        });
    }
});

app.get('/admin/products/edit/:productId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const targetProduct = await Product.findById(request.params.productId).populate('categories');
        const allCategories = await Category.find();
        response.render('admin/product-form', { 
            title: 'Chỉnh sửa sản phẩm', 
            product: targetProduct, 
            categories: allCategories 
        });
    } catch (error) {
        console.error(error);
        response.redirect('/admin/products');
    }
});

app.put('/admin/products/:productId', authenticationMiddleware.requireAdmin, upload.single('image'), async (request, response) => {
    try {
        const { name, categories, price, oldPrice, stock, cpu, ram, storage, graphics, mainboard, case: caseName, psu, hdd, cooler, brand, screenSize, dimensions, panelType, resolution, refreshRate, description, specifications } = request.body;
        
        let categoryArray = [];
        if (categories) {
            if (typeof categories === 'string') {
                categoryArray = [categories];
            } else if (Array.isArray(categories)) {
                categoryArray = categories;
            }
        }
        
        const updateData = {
            name: name,
            categories: categoryArray,
            price: parseInt(price),
            oldPrice: oldPrice ? parseInt(oldPrice) : null,
            stock: parseInt(stock),
            cpu: cpu || '',
            ram: ram || '',
            storage: storage || '',
            graphics: graphics || '',
            mainboard: mainboard || '',
            case: caseName || '',
            psu: psu || '',
            hdd: hdd || '',
            cooler: cooler || '',
            brand: brand || '',
            screenSize: screenSize || '',
            dimensions: dimensions || '',
            panelType: panelType || '',
            resolution: resolution || '',
            refreshRate: refreshRate || '',
            description: description || '',
            specifications: specifications || ''
        };
        
        if (request.file) {
            updateData.image = '/uploads/' + request.file.filename;
        }
        
        await Product.findByIdAndUpdate(request.params.productId, updateData);
        response.redirect('/admin/products');
    } catch (error) {
        console.error('Lỗi cập nhật sản phẩm:', error);
        response.redirect('/admin/products');
    }
});

app.delete('/admin/products/:productId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        await Product.findByIdAndDelete(request.params.productId);
        response.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/products');
    }
});

// ==================== ROUTES ADMIN DANH MỤC ====================

app.get('/admin/categories', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const allCategories = await Category.find().sort('order');
        response.render('admin/categories', { 
            title: 'Quản lý danh mục sản phẩm', 
            categories: allCategories 
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang quản lý danh mục');
    }
});

app.post('/admin/categories', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const { name, description, order } = request.body;
        const categorySlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newCategory = new Category({ 
            name: name, 
            slug: categorySlug, 
            description: description || '', 
            order: parseInt(order) || 0 
        });
        await newCategory.save();
        response.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/categories');
    }
});

app.put('/admin/categories/:categoryId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const { name, description, order } = request.body;
        await Category.findByIdAndUpdate(request.params.categoryId, { 
            name: name, 
            description: description || '', 
            order: parseInt(order) || 0 
        });
        response.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/categories');
    }
});

app.delete('/admin/categories/:categoryId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        await Category.findByIdAndDelete(request.params.categoryId);
        response.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/categories');
    }
});

// ==================== ROUTES ADMIN ĐƠN HÀNG ====================

app.get('/admin/orders', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const statusFilter = request.query.status;
        let filterQuery = {};
        if (statusFilter && statusFilter !== 'all') {
            filterQuery.orderStatus = statusFilter;
        }
        const allOrders = await Order.find(filterQuery)
            .sort('-createdAt')
            .populate('user');
        response.render('admin/orders', { 
            title: 'Quản lý đơn hàng', 
            orders: allOrders, 
            currentStatus: statusFilter || 'all'
        });
    } catch (error) {
        console.error('Lỗi tải danh sách đơn hàng:', error);
        response.status(500).send('Lỗi tải trang quản lý đơn hàng');
    }
});

app.get('/admin/orders/:orderId/edit', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const orderDetail = await Order.findById(request.params.orderId).populate('user');
        if (!orderDetail) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        response.render('admin/order-edit', { 
            title: 'Sửa thông tin đơn hàng', 
            order: orderDetail 
        });
    } catch (error) {
        console.error('Lỗi tải form sửa đơn hàng:', error);
        response.status(500).send('Lỗi tải trang sửa đơn hàng: ' + error.message);
    }
});

app.put('/admin/orders/:orderId/status', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const { status, note } = request.body;
        const targetOrder = await Order.findById(request.params.orderId);
        
        if (!targetOrder) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        
        const oldStatus = targetOrder.orderStatus;
        
        targetOrder.orderStatus = status;
        targetOrder.statusHistory.push({ 
            status: status, 
            date: new Date(), 
            note: note || `Cập nhật trạng thái từ ${oldStatus} thành ${status}` 
        });
        
        if (status === 'Đã xác nhận' && oldStatus === 'Chờ xác nhận') {
            for (const item of targetOrder.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity, soldCount: item.quantity }
                });
            }
        }
        
        if (status === 'Đã giao hàng' && oldStatus !== 'Đã giao hàng') {
            targetOrder.paymentStatus = 'Đã thanh toán';
            
            const user = await User.findById(targetOrder.user);
            if (user) {
                const pointsToAdd = Math.floor(targetOrder.total / 1000);
                user.points = (user.points || 0) + pointsToAdd;
                user.totalSpent = (user.totalSpent || 0) + targetOrder.total;
                await user.save();
            }
        }
        
        if (status === 'Đã hủy' && oldStatus !== 'Đã hủy' && oldStatus !== 'Đã giao hàng') {
            for (const item of targetOrder.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity, soldCount: -item.quantity }
                });
            }
        }
        
        if (status === 'Đã hủy' && oldStatus === 'Đã giao hàng') {
            const user = await User.findById(targetOrder.user);
            if (user) {
                const pointsToSubtract = Math.floor(targetOrder.total / 1000);
                user.points = Math.max(0, (user.points || 0) - pointsToSubtract);
                user.totalSpent = Math.max(0, (user.totalSpent || 0) - targetOrder.total);
                await user.save();
            }
            targetOrder.paymentStatus = 'Chưa thanh toán';
        }
        
        await targetOrder.save();
        
        response.redirect(`/admin/orders/${request.params.orderId}`);
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái:', error);
        response.status(500).send('Lỗi cập nhật trạng thái: ' + error.message);
    }
});

app.delete('/admin/orders/:orderId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const targetOrder = await Order.findById(request.params.orderId);
        
        if (!targetOrder) {
            return response.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        
        if (targetOrder.orderStatus !== 'Đã giao hàng' && targetOrder.orderStatus !== 'Đã hủy') {
            return response.status(400).json({ 
                success: false, 
                message: 'Chỉ có thể xóa đơn hàng đã giao hoặc đã hủy' 
            });
        }
        
        await Order.findByIdAndDelete(request.params.orderId);
        response.json({ success: true, message: 'Xóa đơn hàng thành công' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
    }
});

app.get('/admin/orders/:orderId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const orderDetail = await Order.findById(request.params.orderId).populate('user');
        if (!orderDetail) {
            return response.status(404).send('Không tìm thấy đơn hàng');
        }
        response.render('admin/order-detail', { 
            title: 'Chi tiết đơn hàng', 
            order: orderDetail 
        });
    } catch (error) {
        console.error('Lỗi tải chi tiết đơn hàng:', error);
        response.status(500).send('Lỗi tải chi tiết đơn hàng');
    }
});

// ==================== ROUTES ADMIN KHÁCH HÀNG ====================

app.get('/admin/customers', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const allCustomers = await User.find({ role: 'customer' }).sort('-createdAt');
        response.render('admin/customers', { 
            title: 'Quản lý khách hàng', 
            customers: allCustomers 
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang quản lý khách hàng');
    }
});

app.put('/admin/customers/:customerId/toggle', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const targetCustomer = await User.findById(request.params.customerId);
        if (!targetCustomer) {
            return response.status(404).send('Không tìm thấy khách hàng');
        }
        targetCustomer.isActive = !targetCustomer.isActive;
        await targetCustomer.save();
        response.redirect('/admin/customers');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/customers');
    }
});

app.delete('/admin/customers/:customerId', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        await User.findByIdAndDelete(request.params.customerId);
        response.redirect('/admin/customers');
    } catch (error) {
        console.error(error);
        response.redirect('/admin/customers');
    }
});

// ==================== ROUTES ADMIN BÁO CÁO ====================

app.get('/admin/reports', authenticationMiddleware.requireAdmin, async (request, response) => {
    try {
        const bestSellingProducts = await Product.find()
            .sort('-soldCount')
            .limit(10)
            .populate('categories');
        
        response.render('admin/reports', {
            title: 'Thống kê báo cáo',
            bestSellers: bestSellingProducts
        });
    } catch (error) {
        console.error(error);
        response.status(500).send('Lỗi tải trang thống kê báo cáo');
    }
});

// ==================== ROUTES ADMIN VOUCHER ====================

app.get('/admin/vouchers', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort('-createdAt');
        res.render('admin/vouchers', { 
            title: 'Quản lý mã giảm giá', 
            vouchers: vouchers,
            user: req.session.user
        });
    } catch (error) {
        console.error('Lỗi tải danh sách voucher:', error);
        res.status(500).send('Lỗi tải danh sách mã giảm giá: ' + error.message);
    }
});

app.get('/admin/vouchers/create', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        res.render('admin/voucher-form', { 
            title: 'Thêm mã giảm giá', 
            voucher: null 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải form tạo voucher');
    }
});

app.post('/admin/vouchers', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const { code, name, description, type, discountValue, maxDiscount, minOrderValue, quantity, startDate, endDate } = req.body;
        
        const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
        if (existingVoucher) {
            return res.status(400).send('Mã giảm giá đã tồn tại');
        }
        
        const voucher = new Voucher({
            code: code.toUpperCase(),
            name: name,
            description: description || '',
            type: type,
            discountValue: parseInt(discountValue) || 0,
            maxDiscount: maxDiscount ? parseInt(maxDiscount) : null,
            minOrderValue: parseInt(minOrderValue) || 0,
            quantity: parseInt(quantity) || 0,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true,
            showOnCheckout: true
        });
        
        await voucher.save();
        res.redirect('/admin/vouchers');
    } catch (error) {
        console.error('Lỗi tạo voucher:', error);
        res.status(500).send('Lỗi tạo mã giảm giá: ' + error.message);
    }
});

app.get('/admin/vouchers/edit/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).send('Không tìm thấy mã giảm giá');
        }
        res.render('admin/voucher-form', { 
            title: 'Sửa mã giảm giá', 
            voucher: voucher 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi tải form sửa voucher');
    }
});

app.put('/admin/vouchers/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const { code, name, description, type, discountValue, maxDiscount, minOrderValue, quantity, startDate, endDate, isActive } = req.body;
        
        await Voucher.findByIdAndUpdate(req.params.id, {
            code: code.toUpperCase(),
            name: name,
            description: description || '',
            type: type,
            discountValue: parseInt(discountValue) || 0,
            maxDiscount: maxDiscount ? parseInt(maxDiscount) : null,
            minOrderValue: parseInt(minOrderValue) || 0,
            quantity: parseInt(quantity) || 0,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: isActive === 'true'
        });
        
        res.redirect('/admin/vouchers');
    } catch (error) {
        console.error('Lỗi cập nhật voucher:', error);
        res.status(500).send('Lỗi cập nhật mã giảm giá');
    }
});

app.delete('/admin/vouchers/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        await Voucher.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Lỗi xóa voucher:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa mã giảm giá' });
    }
});

app.put('/admin/vouchers/:id/toggle-active', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ success: false });
        
        voucher.isActive = !voucher.isActive;
        await voucher.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.put('/admin/vouchers/:id/toggle-show', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ success: false });
        
        voucher.showOnCheckout = !voucher.showOnCheckout;
        await voucher.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// ==================== ROUTES STAFF ====================

// ========== 1. DASHBOARD ==========
app.get('/staff/dashboard', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const staffId = req.session.user.id;
        
        const myProcessedOrders = await Order.countDocuments({ processedBy: staffId });
        const myCreatedOrders = await Order.countDocuments({ createdBy: staffId });
        const pendingOrders = await Order.countDocuments({ orderStatus: 'Chờ xác nhận' });
        const confirmedOrders = await Order.countDocuments({ orderStatus: 'Đã xác nhận' });
        const shippingOrders = await Order.countDocuments({ orderStatus: 'Đang giao hàng' });
        
        const personalRevenue = await Order.aggregate([
            { 
                $match: { 
                    processedBy: new mongoose.Types.ObjectId(staffId),
                    orderStatus: 'Đã giao hàng'
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        const recentOrders = await Order.find({
            orderStatus: { $in: ['Chờ xác nhận', 'Đã xác nhận'] }
        })
        .sort('-createdAt')
        .limit(10)
        .populate('user')
        .populate('processedBy', 'fullName');

        res.render('staff/dashboard', {
            title: 'Bảng điều khiển nhân viên',
            myProcessedOrders,
            myCreatedOrders,
            pendingOrders,
            confirmedOrders,
            shippingOrders,
            personalRevenue: personalRevenue[0]?.total || 0,
            recentOrders
        });
    } catch (error) {
        console.error('Lỗi staff dashboard:', error);
        res.status(500).send('Lỗi tải dashboard');
    }
});

// ========== 2. DANH SÁCH ĐƠN HÀNG ==========
app.get('/staff/orders', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const statusFilter = req.query.status;
        let filter = {};
        if (statusFilter && statusFilter !== 'all') {
            filter.orderStatus = statusFilter;
        }
        
        const orders = await Order.find(filter)
            .sort('-createdAt')
            .populate('user')
            .populate('processedBy', 'fullName')
            .populate('createdBy', 'fullName');
        
        res.render('staff/orders', {
            title: 'Quản lý đơn hàng',
            orders,
            currentStatus: statusFilter || 'all'
        });
    } catch (error) {
        console.error('Lỗi staff orders:', error);
        res.status(500).send('Lỗi tải đơn hàng');
    }
});

// ========== 3. FORM TẠO ĐƠN HỘ (GET) - PHẢI ĐẶT TRƯỚC :orderId ==========
app.get('/staff/orders/create', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, stock: { $gt: 0 } })
            .populate('categories')
            .sort('name');
        res.render('staff/order-create', {
            title: 'Tạo đơn hàng hộ khách',
            products
        });
    } catch (error) {
        console.error('Lỗi tải form tạo đơn:', error);
        res.status(500).send('Lỗi tải trang tạo đơn');
    }
});

// ========== 4. XỬ LÝ TẠO ĐƠN HỘ (POST) ==========
app.post('/staff/orders/create', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, customerAddress, items, paymentMethod, note } = req.body;
        const staffId = req.session.user.id;
        
        let parsedItems = [];
        try {
            parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        } catch (e) {
            return res.status(400).send('Dữ liệu sản phẩm không hợp lệ');
        }
        
        if (!parsedItems || parsedItems.length === 0) {
            return res.status(400).send('Vui lòng chọn ít nhất 1 sản phẩm');
        }
        
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of parsedItems) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            if (product.stock < item.quantity) {
                return res.status(400).send(`Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stock})`);
            }
            subtotal += product.price * item.quantity;
            orderItems.push({
                product: product._id,
                productName: product.name,
                quantity: parseInt(item.quantity),
                price: product.price
            });
        }
        
        const shippingFee = 0;
        const orderCode = 'INS' + Date.now() + Math.floor(Math.random() * 100);
        
        const newOrder = new Order({
            orderCode,
            user: null,
            fullName: customerName,
            email: customerEmail || 'guest@showroom.local',
            phone: customerPhone,
            address: customerAddress || 'Mua trực tiếp tại showroom',
            items: orderItems,
            subtotal,
            shippingFee,
            discount: 0,
            total: subtotal + shippingFee,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: 'Chưa thanh toán',
            orderStatus: 'Đã xác nhận',
            orderSource: 'in-store',
            createdBy: staffId,
            processedBy: staffId,
            note: note || '',
            statusHistory: [{
                status: 'Đã xác nhận',
                date: new Date(),
                note: `Đơn tạo hộ bởi NV ${req.session.user.fullName}`
            }]
        });
        
        await newOrder.save();
        
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity, soldCount: item.quantity }
            });
        }
        
        await User.findByIdAndUpdate(staffId, { 
            $inc: { ordersCreated: 1, ordersProcessed: 1 } 
        });
        
        res.redirect(`/staff/orders/${newOrder._id}`);
    } catch (error) {
        console.error('Lỗi tạo đơn hộ:', error);
        res.status(500).send('Lỗi tạo đơn hàng: ' + error.message);
    }
});

// ========== 5. CHI TIẾT ĐƠN HÀNG - ĐẶT SAU create ==========
app.get('/staff/orders/:orderId', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('user')
            .populate('processedBy', 'fullName staffCode')
            .populate('createdBy', 'fullName staffCode')
            .populate('staffNotes.staff', 'fullName staffCode');
        
        if (!order) return res.status(404).send('Không tìm thấy đơn hàng');
        
        res.render('staff/order-detail', {
            title: 'Chi tiết đơn hàng',
            order
        });
    } catch (error) {
        console.error('Lỗi staff order detail:', error);
        res.status(500).send('Lỗi tải chi tiết đơn hàng');
    }
});

// ========== 6. CẬP NHẬT TRẠNG THÁI ĐƠN ==========
app.put('/staff/orders/:orderId/status', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const { status, note } = req.body;
        const staffId = req.session.user.id;
        const order = await Order.findById(req.params.orderId);
        
        if (!order) return res.status(404).send('Không tìm thấy đơn hàng');
        
        const oldStatus = order.orderStatus;
        
        // Staff KHÔNG được chuyển sang 'Đã hủy'
        if (status === 'Đã hủy') {
            return res.status(403).send('Chỉ admin mới có quyền hủy đơn');
        }
        
        order.orderStatus = status;
        order.processedBy = staffId;
        order.statusHistory.push({
            status,
            date: new Date(),
            note: note || `NV cập nhật từ "${oldStatus}" → "${status}"`
        });
        
        // Xử lý kho khi xác nhận
        if (status === 'Đã xác nhận' && oldStatus === 'Chờ xác nhận') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity, soldCount: item.quantity }
                });
            }
        }
        
        // Khi giao hàng thành công
        if (status === 'Đã giao hàng' && oldStatus !== 'Đã giao hàng') {
            order.paymentStatus = 'Đã thanh toán';
            const user = await User.findById(order.user);
            if (user) {
                user.points = (user.points || 0) + Math.floor(order.total / 1000);
                user.totalSpent = (user.totalSpent || 0) + order.total;
                await user.save();
            }
        }
        
        await order.save();
        
        // Tăng số đơn đã xử lý
        await User.findByIdAndUpdate(staffId, { $inc: { ordersProcessed: 1 } });
        
        res.redirect(`/staff/orders/${req.params.orderId}`);
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái:', error);
        res.status(500).send('Lỗi cập nhật trạng thái: ' + error.message);
    }
});

// ========== 7. GHI CHÚ NỘI BỘ ĐƠN HÀNG ==========
app.post('/staff/orders/:orderId/note', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === '') {
            return res.json({ success: false, message: 'Nội dung ghi chú không được để trống' });
        }
        
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        
        order.staffNotes.push({
            staff: req.session.user.id,
            content: content.trim(),
            createdAt: new Date()
        });
        
        await order.save();
        res.json({ success: true, message: 'Đã lưu ghi chú' });
    } catch (error) {
        console.error('Lỗi ghi chú:', error);
        res.status(500).json({ success: false, message: 'Lỗi lưu ghi chú' });
    }
});

// ========== 8. XEM SẢN PHẨM & TỒN KHO ==========
app.get('/staff/products', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const products = await Product.find().populate('categories').sort('-createdAt');
        const categories = await Category.find();
        res.render('staff/products', {
            title: 'Xem sản phẩm & tồn kho',
            products,
            categories
        });
    } catch (error) {
        console.error('Lỗi staff products:', error);
        res.status(500).send('Lỗi tải sản phẩm');
    }
});

// ========== 9. XEM KHÁCH HÀNG ==========
app.get('/staff/customers', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const customers = await User.find({ role: 'customer' }).sort('-createdAt');
        res.render('staff/customers', {
            title: 'Danh sách khách hàng',
            customers
        });
    } catch (error) {
        console.error('Lỗi staff customers:', error);
        res.status(500).send('Lỗi tải khách hàng');
    }
});

// ========== 10. ĐỀ XUẤT NHẬP HÀNG - DANH SÁCH ==========
app.get('/staff/stock-requests', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const requests = await StockRequest.find({ requestedBy: req.session.user.id })
            .populate('product')
            .populate('reviewedBy', 'fullName')
            .sort('-createdAt');
        
        const products = await Product.find({ isActive: true }).sort('name');
        
        res.render('staff/stock-requests', {
            title: 'Đề xuất nhập hàng',
            requests,
            products
        });
    } catch (error) {
        console.error('Lỗi stock requests:', error);
        res.status(500).send('Lỗi tải đề xuất: ' + error.message);
    }
});

// ========== 11. ĐỀ XUẤT NHẬP HÀNG - TẠO MỚI ==========
app.post('/staff/stock-requests', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const { productId, requestedQuantity, reason } = req.body;
        
        if (!productId || !requestedQuantity || requestedQuantity < 1) {
            return res.status(400).send('Dữ liệu không hợp lệ');
        }
        
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Không tìm thấy sản phẩm');
        
        const request = new StockRequest({
            product: productId,
            requestedBy: req.session.user.id,
            currentStock: product.stock,
            requestedQuantity: parseInt(requestedQuantity),
            reason: reason || '',
            status: 'Chờ duyệt'
        });
        
        await request.save();
        res.redirect('/staff/stock-requests');
    } catch (error) {
        console.error('Lỗi tạo đề xuất:', error);
        res.status(500).send('Lỗi tạo đề xuất: ' + error.message);
    }
});

// ========== 12. BÁO CÁO CÁ NHÂN ==========
app.get('/staff/reports', authenticationMiddleware.requireStaff, async (req, res) => {
    try {
        const staffId = req.session.user.id;
        
        const totalProcessed = await Order.countDocuments({ processedBy: staffId });
        const totalCreated = await Order.countDocuments({ createdBy: staffId });
        
        const revenueData = await Order.aggregate([
            { 
                $match: { 
                    processedBy: new mongoose.Types.ObjectId(staffId), 
                    orderStatus: 'Đã giao hàng' 
                } 
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        const monthlyRevenue = await Order.aggregate([
            { 
                $match: { 
                    processedBy: new mongoose.Types.ObjectId(staffId), 
                    orderStatus: 'Đã giao hàng' 
                } 
            },
            { 
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.render('staff/reports', {
            title: 'Báo cáo cá nhân',
            totalProcessed,
            totalCreated,
            totalRevenue: revenueData[0]?.total || 0,
            monthlyRevenue
        });
    } catch (error) {
        console.error('Lỗi báo cáo staff:', error);
        res.status(500).send('Lỗi tải báo cáo');
    }
});



// ==================== ROUTES ADMIN QUẢN LÝ NHÂN VIÊN ====================

// Danh sách nhân viên
app.get('/admin/staffs', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const staffs = await User.find({ role: 'staff' }).sort('-createdAt');
        res.render('admin/staffs', {
            title: 'Quản lý nhân viên',
            staffs
        });
    } catch (error) {
        console.error('Lỗi admin staffs:', error);
        res.status(500).send('Lỗi tải danh sách nhân viên');
    }
});

// Form thêm nhân viên
app.get('/admin/staffs/create', authenticationMiddleware.requireAdmin, async (req, res) => {
    res.render('admin/staff-form', {
        title: 'Thêm nhân viên',
        staff: null
    });
});

// Xử lý thêm nhân viên
app.post('/admin/staffs', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, address, password, staffCode, department, joinedAt } = req.body;
        
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).send('Email đã tồn tại');
        
        const newStaff = new User({
            fullName,
            email: email.toLowerCase(),
            phone,
            address,
            password,
            role: 'staff',
            staffCode: staffCode || 'NV' + Date.now(),
            department: department || 'sales',
            joinedAt: joinedAt ? new Date(joinedAt) : new Date()
        });
        
        await newStaff.save();
        res.redirect('/admin/staffs');
    } catch (error) {
        console.error('Lỗi tạo nhân viên:', error);
        res.status(500).send('Lỗi tạo nhân viên: ' + error.message);
    }
});

// Form sửa nhân viên
app.get('/admin/staffs/edit/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff) return res.status(404).send('Không tìm thấy nhân viên');
        res.render('admin/staff-form', {
            title: 'Sửa nhân viên',
            staff
        });
    } catch (error) {
        res.status(500).send('Lỗi tải form');
    }
});

// Xử lý sửa nhân viên
app.put('/admin/staffs/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const { fullName, phone, address, staffCode, department } = req.body;
        
        await User.findByIdAndUpdate(req.params.id, {
            fullName,
            phone,
            address,
            staffCode,
            department
        });
        
        res.redirect('/admin/staffs');
    } catch (error) {
        console.error('Lỗi cập nhật nhân viên:', error);
        res.status(500).send('Lỗi cập nhật');
    }
});

// Khóa/mở khóa nhân viên
app.put('/admin/staffs/:id/toggle', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff) return res.status(404).send('Không tìm thấy nhân viên');
        
        staff.isActive = !staff.isActive;
        await staff.save();
        res.redirect('/admin/staffs');
    } catch (error) {
        res.status(500).send('Lỗi cập nhật');
    }
});

// Danh sách đề xuất nhập hàng (admin)
app.get('/admin/stock-requests', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const statusFilter = req.query.status;
        let filter = {};
        if (statusFilter && statusFilter !== 'all') {
            filter.status = statusFilter;
        }
        
        const requests = await StockRequest.find(filter)
            .populate('product')
            .populate('requestedBy', 'fullName staffCode')
            .populate('reviewedBy', 'fullName')
            .sort('-createdAt');
        
        res.render('admin/stock-requests', {
            title: 'Duyệt đề xuất nhập hàng',
            requests,
            currentStatus: statusFilter || 'all'
        });
    } catch (error) {
        console.error('Lỗi admin stock requests:', error);
        res.status(500).send('Lỗi tải đề xuất');
    }
});

// Duyệt/từ chối đề xuất
app.put('/admin/stock-requests/:id', authenticationMiddleware.requireAdmin, async (req, res) => {
    try {
        const { status, reviewNote } = req.body;
        const request = await StockRequest.findById(req.params.id);
        if (!request) return res.status(404).send('Không tìm thấy đề xuất');
        
        request.status = status;
        request.reviewNote = reviewNote || '';
        request.reviewedBy = req.session.user.id;
        request.reviewedAt = new Date();
        
        // Nếu duyệt và nhập hàng → cập nhật kho
        if (status === 'Đã nhập hàng') {
            await Product.findByIdAndUpdate(request.product, {
                $inc: { stock: request.requestedQuantity }
            });
        }
        
        await request.save();
        res.redirect('/admin/stock-requests');
    } catch (error) {
        console.error('Lỗi duyệt đề xuất:', error);
        res.status(500).send('Lỗi duyệt đề xuất');
    }
});

// ==================== KHỞI ĐỘNG SERVER ====================

createDefaultAdminAccount();
createDefaultStaffAccount();
initializeSampleData();
createSampleVouchers();

app.listen(PORT, () => {
    console.log(`Server đang chạy tại địa chỉ: http://localhost:${PORT}`);
    console.log('Chào mừng bạn đến với website bán máy tính PC Market');
});