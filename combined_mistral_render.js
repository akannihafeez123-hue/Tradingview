require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// Health check route (Render uptime)
app.get("/", (req, res) => {
  res.send("🚀 Mistral Bot is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Telegram Bot Setup
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "/start") {
    bot.sendMessage(chatId, "🤖 Bot is live and ready.");
  } else {
    bot.sendMessage(chatId, "📡 Signal engine active...");
  }
});

// Error handling
bot.on("polling_error", (error) => {
  console.error("Telegram polling error:", error.message);
});
