require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { ATR, LinearRegression } = require('technicalindicators');

const SYMBOL = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'SHIBUSDT', 'DOTUSDT'
];

const INTERVAL = '15m';
const BOT = new TelegramBot("7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY", { polling: true });

const USER_CHAT_IDS = [];
const activeTrades = {};
const lastSignalSent = {};
const tradeHistory = {}; // Tracks timestamps of trades per user

async function fetchKlines(symbol, interval, limit = 250) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await axios.get(url);
  return res.data.map(c => ({
    time: c[0], open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[5],
  }));
}

async function fetchPrice(symbol) {
  const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
  return +res.data.price;
}

function canSendTrade(userId) {
  const now = Date.now();
  tradeHistory[userId] = (tradeHistory[userId] || []).filter(t => now - t < 24 * 60 * 60 * 1000);
  return tradeHistory[userId].length < 20;
}

function analyze(candles) {
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const volume = candles.map(c => c.volume);

  const lsma50 = LinearRegression.calculate({ values: close, period: 50 }).at(-1);
  const atr = ATR.calculate({ high, low, close, period: 14 }).at(-1);
  const lastClose = close.at(-1);
  const currentVolume = volume.at(-1);
  const avgVolume = volume.slice(-20).reduce((a, b) => a + b, 0) / 20;

  const distanceFromLSMA = Math.abs(lastClose - lsma50);
  const lsmaThreshold = 0.5 * atr;

  const hour = new Date().getUTCHours();
  if (hour >= 2 && hour <= 6) return { signal: 'HOLD' };

  let signal = 'HOLD';
  if (lastClose > lsma50 && distanceFromLSMA > lsmaThreshold && currentVolume > avgVolume) {
    signal = 'BUY';
  } else if (lastClose < lsma50 && distanceFromLSMA > lsmaThreshold && currentVolume > avgVolume) {
    signal = 'SELL';
  }

  let target = null, stoploss = null;
  if (signal === 'BUY') {
    target = lastClose + 1.5 * atr;
    stoploss = lastClose - 1.0 * atr;
  } else if (signal === 'SELL') {
    target = lastClose - 1.5 * atr;
    stoploss = lastClose + 1.0 * atr;
  }

  return { signal, entry: lastClose, lsma50, atr, target, stoploss };
}

function checkHit(price, trade) {
  if (!trade) return false;
  if (trade.signal === 'BUY') {
    if (price >= trade.target) return 'target';
    if (price <= trade.stoploss) return 'stoploss';
  } else if (trade.signal === 'SELL') {
    if (price <= trade.target) return 'target';
    if (price >= trade.stoploss) return 'stoploss';
  }
  return false;
}

let currentSymbolIndex = 0;

async function checkOneSymbolPerMinute() {
  const symbol = SYMBOL[currentSymbolIndex];
  const candles = await fetchKlines(symbol, INTERVAL);
  const price = await fetchPrice(symbol);
  const result = analyze(candles);

  for (const userId of USER_CHAT_IDS) {
    if (!activeTrades[userId]) activeTrades[userId] = {};
    if (!lastSignalSent[userId]) lastSignalSent[userId] = {};

    const trade = activeTrades[userId][symbol];
    const lastSent = lastSignalSent[userId][symbol];

    const hit = checkHit(price, trade);
    if (hit) {
      await BOT.sendMessage(userId, `✅ *${symbol}* का ${trade.signal} ट्रेड *${hit.toUpperCase()}* पर बंद हुआ\n💰 Price: ${price}`, { parse_mode: 'Markdown' });
      delete activeTrades[userId][symbol];
      lastSignalSent[userId][symbol] = null;
      continue;
    }

    if (result.signal === 'HOLD') {
      if (lastSent !== 'HOLD') {
        await BOT.sendMessage(userId, `⚠️ *${symbol}* अभी कोई सिग्नल नहीं: HOLD`, { parse_mode: 'Markdown' });
        lastSignalSent[userId][symbol] = 'HOLD';
      }
    } else if (canSendTrade(userId)) {
      activeTrades[userId][symbol] = {
        signal: result.signal,
        entry: result.entry,
        target: result.target,
        stoploss: result.stoploss
      };
      lastSignalSent[userId][symbol] = result.signal;
      tradeHistory[userId].push(Date.now());

      const msg = `📈 *${symbol} (${INTERVAL})*\nSignal: *${result.signal}*\n💰 Entry: ${price}\n🎯 Target: ${result.target.toFixed(2)}\n🛑 Stoploss: ${result.stoploss.toFixed(2)}\n\nLSMA(50): ${result.lsma50?.toFixed(2)}`;
      await BOT.sendMessage(userId, msg, { parse_mode: 'Markdown' });
    }
  }

  currentSymbolIndex = (currentSymbolIndex + 1) % SYMBOL.length;
}

BOT.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);
  if (!tradeHistory[chatId]) tradeHistory[chatId] = [];
  BOT.sendMessage(chatId, "✅ Bot चालू हो गया है। हर 2 मिनट में 1 symbol का signal चेक होगा।\n⚠️ 24 घंटे में अधिकतम 20 high-quality trades मिलेंगे।");
});

BOT.onText(/\/status/, async msg => {
  const chatId = msg.chat.id;
  if (!activeTrades[chatId]) return BOT.sendMessage(chatId, "कोई एक्टिव ट्रेड नहीं है।");

  for (const symbol of SYMBOL) {
    const trade = activeTrades[chatId][symbol];
    if (!trade) continue;

    const current = await fetchPrice(symbol);
    const text = `🪙 *${symbol}*\nType: ${trade.signal}\nEntry: ${trade.entry.toFixed(2)}\nNow: ${current.toFixed(2)}\n🎯 Target: ${trade.target.toFixed(2)}\n🛑 SL: ${trade.stoploss.toFixed(2)}`;
    await BOT.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }
});

setInterval(checkOneSymbolPerMinute, 2 * 60 * 1000);
console.log("✅ LSMA 50 Based High-Accuracy Bot Running...");
