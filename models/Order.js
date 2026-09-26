const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderCode: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: String,
        quantity: Number,
        price: Number
    }],
    subtotal: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 30000
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'banking', 'momo', 'zalopay'],
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['Chưa thanh toán', 'Đã thanh toán', 'Thất bại'],
        default: 'Chưa thanh toán'
    },
    orderStatus: {
        type: String,
        enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'],
        default: 'Chờ xác nhận'
    },
    statusHistory: [{
        status: String,
        date: Date,
        note: String
    }],
    note: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    staffNotes: [{
        staff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    orderSource: {
        type: String,
        enum: ['online', 'in-store'],
        default: 'online'
    }
});

orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);