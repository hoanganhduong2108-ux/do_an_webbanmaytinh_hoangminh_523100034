const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    price: {
        type: Number,
        required: true,
        min: 0
    },
    oldPrice: {
        type: Number,
        default: null
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    image: {
        type: String,
        default: null
    },
    images: [{
        type: String
    }],
    cpu: {
        type: String,
        default: ''
    },
    ram: {
        type: String,
        default: ''
    },
    storage: {
        type: String,
        default: ''
    },
    graphics: {
        type: String,
        default: ''
    },
    // ===== THÔNG SỐ LINH KIỆN =====
    mainboard: {
        type: String,
        default: ''
    },
    case: {
        type: String,
        default: ''
    },
    psu: {
        type: String,
        default: ''
    },
    hdd: {
        type: String,
        default: ''
    },
    cooler: {
        type: String,
        default: ''
    },
    brand: {
        type: String,
        default: ''
    },
    // ===== THÔNG SỐ MÀN HÌNH (MỚI) =====
    screenSize: {
        type: String,
        default: ''
    },
    dimensions: {
        type: String,
        default: ''
    },
    panelType: {
        type: String,
        default: ''
    },
    resolution: {
        type: String,
        default: ''
    },
    refreshRate: {
        type: String,
        default: ''
    },
    // ===== KẾT THÚC =====
    description: {
        type: String,
        default: ''
    },
    specifications: {
        type: String,
        default: ''
    },
    soldCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);