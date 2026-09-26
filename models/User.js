const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'staff', 'admin'],
        default: 'customer'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    points: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
     staffCode: {
        type: String,
        default: null,
        sparse: true
    },
    department: {
        type: String,
        default: null
    },
    joinedAt: {
        type: Date,
        default: null
    },
    ordersProcessed: {
        type: Number,
        default: 0
    },
    ordersCreated: {
        type: Number,
        default: 0
    }
});

// Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
});

// Phương thức so sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);