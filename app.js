require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database(path.join(__dirname, "bot_data.db"));

passport.use(
    new Strategy(
        {
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_REDIRECT_URL,
            scope: ["identify"],
        },
        (accessToken, refreshToken, profile, done) => {
            process.nextTick(() => done(null, profile));
        }
    )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Express 中介層設定
app.use(
    session({
        secret: "supersecretkey",
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

// 靜態檔案路徑 (前端 HTML/JS/CSS)
app.use(express.static(path.join(__dirname, "public")));

// Discord 登入路由
app.get("/login", passport.authenticate("discord"));
app.get(
    "/callback",
    passport.authenticate("discord", {
        failureRedirect: "/",
    }),
    (req, res) => {
        res.redirect("/dashboard");
    }
);

// 登出路由
app.get("/logout", (req, res) => {
    req.logout(() => {});
    res.redirect("/");
});

// 獲取用戶收藏
app.get("/api/favorites", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    db.all("SELECT id, label, description, image_url FROM favorites WHERE user_id = ?", [userId], (err, rows) => {
        if (err) {
            console.error(`獲取收藏失敗: ${err.message}`);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});

// 獲取用戶歷史紀錄
app.get("/api/history", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    db.all("SELECT id, label, description, image_url FROM history WHERE user_id = ? ORDER BY ROWID DESC", [userId], (err, rows) => {
        if (err) {
            console.error(`獲取歷史紀錄失敗: ${err.message}`);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});

// 刪除收藏項目
app.delete("/api/favorites/:id", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const favoriteId = req.params.id;

    if (!userId) {
        console.error("User ID not found in request");
        return res.status(500).json({ error: "User ID missing from request" });
    }

    // 查找並刪除收藏項目
    db.get("SELECT * FROM favorites WHERE user_id = ? AND id = ?", [userId, favoriteId], (err, row) => {
        if (err) {
            console.error("Error during database lookup: ", err);
            return res.status(500).json({ error: "Database error during lookup" });
        }
        if (!row) {
            console.error(`Item with ID ${favoriteId} not found for user ${userId}`);
            return res.status(404).json({ error: "Item not found" });
        }

        // 使用 id 進行刪除操作
        db.run("DELETE FROM favorites WHERE user_id = ? AND id = ?", [userId, favoriteId], function (err) {
            if (err) {
                console.error("Error during deletion: ", err);
                return res.status(500).json({ error: "Database error during deletion" });
            }
            if (this.changes === 0) {
                console.error(`No item deleted, possibly due to a mismatch for user ID ${userId}`);
                return res.status(404).json({ error: "No item was deleted, possibly due to a mismatch" });
            }
            console.log(`Item with ID ${favoriteId} successfully deleted for user ${userId}`);
            res.status(200).json({ message: "Item successfully deleted" });
        });
    });
});

// 刪除歷史紀錄項目
app.delete("/api/history/:id", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const historyId = req.params.id;

    if (!userId) {
        console.error("User ID not found in request");
        return res.status(500).json({ error: "User ID missing from request" });
    }

    // 查找並刪除歷史紀錄項目
    db.get("SELECT * FROM history WHERE user_id = ? AND id = ?", [userId, historyId], (err, row) => {
        if (err) {
            console.error("Error during database lookup: ", err);
            return res.status(500).json({ error: "Database error during lookup" });
        }
        if (!row) {
            console.error(`Item with ID ${historyId} not found for user ${userId}`);
            return res.status(404).json({ error: "Item not found" });
        }

        // 使用 'id' 進行刪除操作
        db.run("DELETE FROM history WHERE user_id = ? AND id = ?", [userId, historyId], function (err) {
            if (err) {
                console.error("Error during deletion: ", err);
                return res.status(500).json({ error: "Database error during deletion" });
            }
            if (this.changes === 0) {
                console.error(`No item deleted, possibly due to a mismatch for user ID ${userId}`);
                return res.status(404).json({ error: "No item was deleted, possibly due to a mismatch" });
            }
            console.log(`Item with ID ${historyId} successfully deleted for user ${userId}`);
            res.status(200).json({ message: "Item successfully deleted" });
        });
    });
});

// 用戶儀表板
app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));