const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['discount_percent', 'discount_fixed', 'freeship'],
        default: 'discount_fixed'
    },
    discountValue: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    },
    usedCount: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // TRƯỜNG MỚI: Hiển thị trên trang thanh toán
    showOnCheckout: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Kiểm tra voucher còn hiệu lực không
voucherSchema.methods.isValid = function(subtotal) {
    const now = new Date();
    if (!this.isActive) return false;
    if (now < this.startDate) return false;
    if (now > this.endDate) return false;
    if (this.quantity > 0 && this.usedCount >= this.quantity) return false;
    if (this.minOrderValue > 0 && subtotal < this.minOrderValue) return false;
    return true;
};

// Tính số tiền giảm
voucherSchema.methods.calculateDiscount = function(subtotal) {
    if (!this.isValid(subtotal)) return 0;
    
    let discount = 0;
    if (this.type === 'discount_percent') {
        discount = (subtotal * this.discountValue) / 100;
        if (this.maxDiscount && discount > this.maxDiscount) {
            discount = this.maxDiscount;
        }
    } else if (this.type === 'discount_fixed') {
        discount = this.discountValue;
    } else if (this.type === 'freeship') {
        discount = 30000; // Phí ship cố định
    }
    discount = Math.min(Math.round(discount), subtotal);
    return discount;
};

module.exports = mongoose.model('Voucher', voucherSchema);