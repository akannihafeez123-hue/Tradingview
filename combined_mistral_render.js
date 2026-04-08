require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// ===============================
// 🌐 KEEP ALIVE (Render)
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Mistral Institutional Bot Running");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ===============================
// 🤖 TELEGRAM BOT
// ===============================
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

console.log("🤖 Bot started...");

// ===============================
// 📡 COMMAND SYSTEM
// ===============================
let scanning = false;

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot live. Use /scan to start.");
});

bot.onText(/\/scan/, (msg) => {
  scanning = true;
  bot.sendMessage(msg.chat.id, "📡 Scanning started...");
});

bot.onText(/\/stop/, (msg) => {
  scanning = false;
  bot.sendMessage(msg.chat.id, "🛑 Scanning stopped.");
});

// ===============================
// 🧠 SIGNAL LOOP (SAFE)
// ===============================
setInterval(() => {
  if (!scanning) return;

  try {
    console.log("🔍 Running scan...");

    const signal = Math.random() > 0.5 ? "BUY" : "SELL";

    if (process.env.CHAT_ID) {
      bot.sendMessage(
        process.env.CHAT_ID,
        `📊 Signal: ${signal}\n⏱ ${new Date().toLocaleTimeString()}`
      );
    }
  } catch (err) {
    console.error("❌ Signal error:", err.message);
  }
}, 60000);

// ===============================
// ⚠️ ERROR HANDLING
// ===============================
bot.on("polling_error", (error) => {
  console.error("❌ Telegram polling error:", error.message);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled rejection:", err);
});
