const mongoose = require('mongoose');
require('dotenv').config();

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Kết nối đến MongoDB thành công!');
    } catch (error) {
        console.error('Kết nối đến MongoDB thất bại:', error.message);
        process.exit(1);
    }
};

module.exports = connectDatabase;