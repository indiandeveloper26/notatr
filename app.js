const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🟢 Telegram Bot Setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// 🟢 Premium user check logic
const PREMIUM_USERS_FILE = "./premium_users.json";
let PREMIUM_USERS = {};

function loadPremiumUsers() {
  if (fs.existsSync(PREMIUM_USERS_FILE)) {
    PREMIUM_USERS = JSON.parse(fs.readFileSync(PREMIUM_USERS_FILE));
  }
}

function savePremiumUsers() {
  fs.writeFileSync(PREMIUM_USERS_FILE, JSON.stringify(PREMIUM_USERS));
}

function isPremium(chatId) {
  const expiry = PREMIUM_USERS[chatId];
  return expiry && new Date(expiry) > new Date();
}

loadPremiumUsers();

// 🟢 Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🟢 /start and /buy commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Welcome to the Trading Bot! Type /buy to activate premium access.");
});

bot.onText(/\/buy/, async (msg) => {
  const chatId = msg.chat.id;
  const order = await razorpay.orders.create({
    amount: 19900, // ₹199
    currency: "INR",
    receipt: `${chatId}-${Date.now()}`,
    notes: { chat_id: chatId.toString() },
  });

  const link = `https://rzp.io/l/${order.id}`;
  bot.sendMessage(chatId, `💳 Click to pay and activate Premium:\n${link}`);
});

// 🟢 Webhook Server
app.use(bodyParser.json());

app.post("/razorpay-webhook", (req, res) => {
  const event = req.body;

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const chatId = payment.notes.chat_id;

    if (chatId) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);

      PREMIUM_USERS[chatId] = expiry;
      savePremiumUsers();

      bot.sendMessage(chatId, "✅ Your Premium is now active for 1 month!");
    }
  }

  res.status(200).send("Webhook received");
});

// 🟢 Start Express Server
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
