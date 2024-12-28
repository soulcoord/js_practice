const Database = require('better-sqlite3');
const db = new Database('data.db', { verbose: console.log });

// 初始化資料表
db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        uploadTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

/**
 * 插入檔案上傳記錄
 * @param {string} userId 用戶 ID
 * @param {string} userName 用戶名稱
 * @param {string} fileName 檔案名稱
 * @param {string} filePath 檔案路徑
 */
function insertUploadRecord(userId, userName, fileName, filePath) {
    const stmt = db.prepare('INSERT INTO uploads (userId, userName, fileName, filePath) VALUES (?, ?, ?, ?)');
    stmt.run(userId, userName, fileName, filePath);
}

/**
 * 查詢所有上傳記錄
 * @returns {Array} 所有檔案記錄
 */
function getAllUploads() {
    const stmt = db.prepare('SELECT * FROM uploads ORDER BY uploadTime DESC');
    return stmt.all();
}

module.exports = { insertUploadRecord, getAllUploads };