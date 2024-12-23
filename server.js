const express = require('express');
const { getVerification, deleteVerification } = require('./db');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // 引入 path 模組

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 提供驗證頁面
app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// 驗證碼驗證 API
app.post('/verify', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).send('驗證碼為必填項。');
    }

    const verification = getVerification(code);

    if (!verification) {
        return res.status(400).send('驗證碼無效或已過期。');
    }

    // 生成下載連結
    const downloadToken = uuidv4();
    const downloadLink = `${req.protocol}://${req.get('host')}/download/${downloadToken}`;

    // 將下載連結與檔案資訊儲存到 downloadLinks
    downloadLinks[downloadToken] = {
        fileUrl: verification.fileUrl,
        fileName: verification.fileName,
        code, // 儲存驗證碼以便在下載後刪除
        createdAt: new Date()
    };

    res.send(`
        驗證成功！<br>
        <a href="/download/${downloadToken}">點此下載您的檔案</a>
    `);
});

// 下載檔案
const downloadLinks = {};

app.get('/download/:token', (req, res) => {
    const { token } = req.params;
    const link = downloadLinks[token];

    if (!link) {
        return res.status(400).send('下載連結無效或已過期。');
    }

    // 檢查下載連結是否過期（例如 10 分鐘）
    const now = new Date();
    const diff = (now - link.createdAt) / 1000 / 60; // 分鐘
    if (diff > 10) {
        delete downloadLinks[token];
        return res.status(400).send('下載連結已過期。');
    }

    // 刪除資料庫中的驗證碼資料
    deleteVerification(link.code);

    // 移除 downloadLinks 中的資料
    delete downloadLinks[token];

    // 重定向到檔案 URL
    res.redirect(link.fileUrl);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
