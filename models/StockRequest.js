const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currentStock: {
        type: Number,
        default: 0
    },
    requestedQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã nhập hàng'],
        default: 'Chờ duyệt'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewNote: {
        type: String,
        default: ''
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StockRequest', stockRequestSchema);