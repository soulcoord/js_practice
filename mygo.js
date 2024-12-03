require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ComponentType } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// 初始化 Discord Bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const TOKEN = process.env.DISCORD_TOKEN;

// 載入 JSON 檔案
const jsonFilePath = path.join(__dirname, "filtered_valid_images.json");
let jsonData = [];
try {
    jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    console.log("成功載入 JSON 資料");
} catch (error) {
    console.error(`載入 JSON 檔案失敗: ${error.message}`);
}

// 初始化 SQLite 資料庫
const db = new sqlite3.Database(path.join(__dirname, "bot_data.db"), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(`無法連接到 SQLite 資料庫: ${err.message}`);
    } else {
        console.log("成功連接到 SQLite 資料庫");
    }
});

// 建立資料表
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS favorites (
            user_id TEXT,
            label TEXT,
            description TEXT,
            image_url TEXT
        )
    `, (err) => {
        if (err) {
            console.error(`資料表創建失敗: ${err.message}`);
        }
    });
    db.run(`
        CREATE TABLE IF NOT EXISTS history (
            user_id TEXT,
            label TEXT,
            description TEXT,
            image_url TEXT
        )
    `, (err) => {
        if (err) {
            console.error(`資料表創建失敗: ${err.message}`);
        }
    });
});

// 動態註冊指令
const commands = [
    {
        name: "搜索",
        description: "根據關鍵字搜索圖片",
        options: [
            {
                type: 3, // STRING
                name: "query",
                description: "請輸入搜索關鍵字",
                required: true,
                autocomplete: true,
            },
        ],
    },
    { name: "收藏", description: "查看並管理您的收藏" },
    { name: "歷史瀏覽", description: "查看您的歷史瀏覽記錄" },
];

// 註冊應用指令
client.on("ready", async () => {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("應用指令已註冊！");
    } catch (err) {
        console.error("指令註冊失敗: ", err);
    }
    console.log(`已登入為 ${client.user.tag}`);
});

// 搜索指令
client.on("interactionCreate", async (interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();
        const suggestions = jsonData
            .filter((record) => record.text.toLowerCase().includes(focusedValue.toLowerCase()))
            .map((record) => ({ name: record.text.slice(0, 100), value: record.text.slice(0, 100) }))
            .slice(0, 25);
        await interaction.respond(suggestions);
        return;
    }

    if (!interaction.isCommand()) return;

    if (interaction.commandName === "搜索") {
        const query = interaction.options.getString("query");
        const results = jsonData.filter((record) => record.text.toLowerCase().includes(query.toLowerCase()));

        if (results.length > 0) {
            const embeds = results.map((result, idx) =>
                new EmbedBuilder()
                    .setTitle(`結果 ${idx + 1}: ${result.text.slice(0, 100)}`)
                    .setDescription(`集數: ${result.episode}, 帶數: ${result.frame}`)
                    .setImage(`https://cdn.anon-tokyo.com/thumb/thumb/${result.episode}__${result.frame}.jpg`)
                    .setColor("Blue")
            );

            let currentPage = 0;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("上一頁").setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId("next").setLabel("下一頁").setStyle(ButtonStyle.Primary).setDisabled(embeds.length <= 1)
            );

            const message = await interaction.reply({
                embeds: [embeds[currentPage]],
                components: [row],
                ephemeral: true,
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({ 
                filter: (i) => i.user.id === interaction.user.id, 
                componentType: ComponentType.Button, 
                time: 180000 
            });

            collector.on("collect", async (btnInteraction) => {
                await btnInteraction.deferUpdate();
                if (btnInteraction.customId === "prev") currentPage--;
                else if (btnInteraction.customId === "next") currentPage++;

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === embeds.length - 1);

                await btnInteraction.editReply({ embeds: [embeds[currentPage]], components: [row] });
            });

            collector.on("end", async () => {
                row.components.forEach((btn) => btn.setDisabled(true));
                await message.edit({ components: [row] });
            });
        } else {
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("搜索結果").setDescription("找不到相關結果").setColor("Red")],
                ephemeral: true,
            });
        }
    }

    // 收藏指令
    if (interaction.commandName === "收藏") {
        db.all("SELECT label, description, image_url FROM favorites WHERE user_id = ?", [interaction.user.id], async (err, rows) => {
            if (err || rows.length === 0) {
                await interaction.reply({ content: "您目前沒有收藏。", ephemeral: true });
                return;
            }

            const embeds = rows.map((row, idx) =>
                new EmbedBuilder().setTitle(row.label).setDescription(row.description).setImage(row.image_url).setColor("Blue")
            );

            let currentPage = 0;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("上一頁").setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId("next").setLabel("下一頁").setStyle(ButtonStyle.Primary).setDisabled(embeds.length <= 1)
            );

            const message = await interaction.reply({
                embeds: [embeds[currentPage]],
                components: [row],
                ephemeral: true,
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({ 
                filter: (i) => i.user.id === interaction.user.id, 
                componentType: ComponentType.Button, 
                time: 180000 
            });

            collector.on("collect", async (btnInteraction) => {
                await btnInteraction.deferUpdate();
                if (btnInteraction.customId === "prev") currentPage--;
                else if (btnInteraction.customId === "next") currentPage++;

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === embeds.length - 1);

                await btnInteraction.editReply({ embeds: [embeds[currentPage]], components: [row] });
            });

            collector.on("end", async () => {
                row.components.forEach((btn) => btn.setDisabled(true));
                await message.edit({ components: [row] });
            });
        });
    }

    // 歷史瀏覽指令
    if (interaction.commandName === "歷史瀏覽") {
        db.all("SELECT label, description, image_url FROM history WHERE user_id = ?", [interaction.user.id], async (err, rows) => {
            if (err || rows.length === 0) {
                await interaction.reply({ content: "您目前沒有歷史瀏覽記錄。", ephemeral: true });
                return;
            }

            const embeds = rows.map((row) =>
                new EmbedBuilder().setTitle(row.label).setDescription(row.description).setImage(row.image_url).setColor("Blue")
            );

            let currentPage = 0;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("prev").setLabel("上一頁").setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId("next").setLabel("下一頁").setStyle(ButtonStyle.Primary).setDisabled(embeds.length <= 1)
            );

            const message = await interaction.reply({
                embeds: [embeds[currentPage]],
                components: [row],
                ephemeral: true,
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({ 
                filter: (i) => i.user.id === interaction.user.id, 
                componentType: ComponentType.Button, 
                time: 180000 
            });

            collector.on("collect", async (btnInteraction) => {
                await btnInteraction.deferUpdate();
                if (btnInteraction.customId === "prev") currentPage--;
                else if (btnInteraction.customId === "next") currentPage++;

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === embeds.length - 1);

                await btnInteraction.editReply({ embeds: [embeds[currentPage]], components: [row] });
            });

            collector.on("end", async () => {
                row.components.forEach((btn) => btn.setDisabled(true));
                await message.edit({ components: [row] });
            });
        });
    }
});

client.on("error", (error) => {
    console.error("Discord 客戶端出錯: ", error);
});

client.login(TOKEN);
