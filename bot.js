require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 初始化資料庫
const db = new Database('data.db', { verbose: console.log });
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

// 插入檔案記錄
function insertUploadRecord(userId, userName, fileName, filePath) {
    const stmt = db.prepare('INSERT INTO uploads (userId, userName, fileName, filePath) VALUES (?, ?, ?, ?)');
    stmt.run(userId, userName, fileName, filePath);
}

// 環境變數
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const FILE_STORAGE_PATH = path.join(__dirname, process.env.FILE_STORAGE_PATH || 'uploads');

// 確保檔案儲存目錄存在
if (!fs.existsSync(FILE_STORAGE_PATH)) {
    fs.mkdirSync(FILE_STORAGE_PATH);
}

// 初始化 Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel],
});

// 註冊全域斜線指令
const commands = [
    {
        name: 'upload',
        description: '上傳檔案',
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('正在註冊全域斜線指令...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // 全域指令
            { body: commands }
        );
        console.log('全域斜線指令註冊成功！');
    } catch (error) {
        console.error('註冊斜線指令失敗:', error);
    }
})();

// 處理斜線指令
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // 限制指令僅能在私訊中執行
    if (interaction.channel.type !== 1) {
        return await interaction.reply({
            content: '此指令僅限私訊中使用。',
            ephemeral: true, // 僅用戶可見
        });
    }

    if (commandName === 'upload') {
        await interaction.reply({
            content: '請附加檔案到此對話並再次執行指令。',
            ephemeral: true // 僅用戶可見
        });
    }
});

// 處理私訊中的檔案上傳
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 僅處理來自私訊的檔案上傳
    if (message.channel.type === 'DM' && message.attachments.size > 0) {
        message.attachments.forEach(async (attachment) => {
            const fileName = attachment.name;
            const filePath = path.join(FILE_STORAGE_PATH, fileName);

            try {
                const response = await fetch(attachment.url);
                const buffer = await response.buffer();
                fs.writeFileSync(filePath, buffer);

                insertUploadRecord(message.author.id, message.author.username, fileName, filePath);

                await message.reply(`檔案 ${fileName} 已成功上傳並記錄！`);
            } catch (error) {
                console.error('檔案處理失敗:', error);
                await message.reply('上傳檔案時發生錯誤，請稍後再試！');
            }
        });
    }
});

// Bot 啟動
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(TOKEN);
