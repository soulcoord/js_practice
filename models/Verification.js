// models/Verification.js
const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: { expires: '1h' } } // 驗證碼1小時後過期
});

module.exports = mongoose.model('Verification', VerificationSchema);
