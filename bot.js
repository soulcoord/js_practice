const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { insertVerification } = require('./db');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000';

// Register the slash command

const commands = [
    new SlashCommandBuilder()
        .setName('upload')
        .setDescription('上傳檔案並取得驗證碼')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('要上傳的檔案')
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // 註冊全域指令
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'upload') {
        const file = interaction.options.getAttachment('file');

        if (!file) {
            return interaction.reply({ content: '請附加要上傳的檔案。', ephemeral: true });
        }

        const fileUrl = file.url;
        const fileName = file.name;

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 將驗證碼與檔案資訊儲存到 SQLite
        insertVerification(verificationCode, fileUrl, fileName);

        try {
            await interaction.user.send(`您的驗證碼是：\`${verificationCode}\`。\n請前往 ${WEBSITE_URL}/verify 輸入驗證碼下載檔案。`);
            interaction.reply({ content: '已將驗證碼發送到您的私訊。', ephemeral: true });
        } catch (err) {
            console.error('Error sending DM:', err);
            interaction.reply({ content: '無法發送私訊。請檢查您的隱私設置。', ephemeral: true });
        }
    }
});

client.login(DISCORD_TOKEN);
