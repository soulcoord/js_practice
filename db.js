// db.js
const Database = require('better-sqlite3');
const db = new Database('data.db', { verbose: console.log });

// 初始化資料表
db.exec(`
    CREATE TABLE IF NOT EXISTS verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        fileUrl TEXT NOT NULL,
        fileName TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

/**
 * 插入驗證碼與檔案的關聯資料
 * @param {string} code 驗證碼
 * @param {string} fileUrl 檔案 URL
 * @param {string} fileName 檔案名稱
 */
function insertVerification(code, fileUrl, fileName) {
    const stmt = db.prepare('INSERT INTO verifications (code, fileUrl, fileName) VALUES (?, ?, ?)');
    stmt.run(code, fileUrl, fileName);
}

/**
 * 查詢驗證碼是否存在且未過期
 * @param {string} code 驗證碼
 * @returns {object|null} 查詢結果
 */
function getVerification(code) {
    const stmt = db.prepare('SELECT * FROM verifications WHERE code = ?');
    return stmt.get(code);
}

/**
 * 刪除驗證碼資料
 * @param {string} code 驗證碼
 */
function deleteVerification(code) {
    const stmt = db.prepare('DELETE FROM verifications WHERE code = ?');
    stmt.run(code);
}

module.exports = { insertVerification, getVerification, deleteVerification };
