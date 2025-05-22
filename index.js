

require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');
const cron = require('node-cron');

const TELEGRAM_BOT_TOKEN = '7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT',
  'SOLUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'TRXUSDT', 'AVAXUSDT', 'SHIBUSDT'
];

const INTERVAL_15M = '15m';
const INTERVAL_1H = '1h';
const TARGET_MULTIPLIER = 1.5;
const STOPLOSS_MULTIPLIER = 1.0;
const VOLUME_SMA_PERIOD = 20;
const EMA_1H_PERIOD = 200;

let USER_CHAT_IDS = [];
let activeTrades = {};
let userTradeLock = {};
let symbolIndex = 0;

function hasActiveTrade(chatId) {
  return userTradeLock[chatId] !== undefined;
}

async function fetchKlines(symbol, interval, limit = 100) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await axios.get(url);
    return res.data.map(c => ({
      open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]),
      close: parseFloat(c[4]), volume: parseFloat(c[5]), time: c[0]
    }));
  } catch (err) {
    console.error(`Error fetching klines for ${symbol}:`, err.message);
    return null;
  }
}

async function fetchCurrentPrice(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const res = await axios.get(url);
    return parseFloat(res.data.price);
  } catch (err) {
    console.error(`Error fetching current price for ${symbol}:`, err.message);
    return null;
  }
}

function analyzeData15m(candles) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const rsi = RSI.calculate({ values: closes, period: 14 });
  const ema = EMA.calculate({ values: closes, period: 14 });
  const macd = MACD.calculate({
    values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    SimpleMAOscillator: false, SimpleMASignal: false
  });
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD });

  if (!rsi.length || !ema.length || !macd.length || !atr.length || !volumeSMA.length) return null;

  const lastClose = closes.at(-1);
  const lastEma = ema.at(-1);
  const lastMacd = macd.at(-1);
  const lastRsi = rsi.at(-1);
  const lastAtr = atr.at(-1);
  const lastVolume = volumes.at(-1);
  const lastVolumeSMA = volumeSMA.at(-1);

  let signal = 'HOLD';
  const volumeOkay = lastVolume > lastVolumeSMA;

  if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal) signal = 'BUY';
  else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal) signal = 'SELL';

  return { signal, lastClose, lastEma, lastRsi, lastMacd, lastAtr, lastVolume, lastVolumeSMA };
}

function analyzeData1h(candles) {
  const closes = candles.map(c => c.close);
  if (closes.length < EMA_1H_PERIOD) return null;
  const ema200 = EMA.calculate({ values: closes, period: EMA_1H_PERIOD });
  return ema200.at(-1);
}

function checkIfHit(price, trade) {
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

async function checkNextSymbol() {
  const symbol = SYMBOLS[symbolIndex];
  symbolIndex = (symbolIndex + 1) % SYMBOLS.length;

  const candles15m = await fetchKlines(symbol, INTERVAL_15M);
  const candles1h = await fetchKlines(symbol, INTERVAL_1H);
  if (!candles15m || !candles1h) return;

  const signalData = analyzeData15m(candles15m);
  const ema200 = analyzeData1h(candles1h);
  if (!signalData || !ema200) return;

  const { signal, lastClose, lastAtr } = signalData;

  // HOLD signal par sabhi users ko message bhejna yahan add kiya gaya hai
  if (signal === 'HOLD') {
    for (const chatId of USER_CHAT_IDS) {
      const holdMsg = `⏸ HOLD signal for ${symbol}.\nMarket is indecisive right now.\nCurrent Price: ${lastClose.toFixed(2)}`;
      bot.sendMessage(chatId, holdMsg);
    }
    return;
  }

  if ((signal === 'BUY' && lastClose < ema200) ||
      (signal === 'SELL' && lastClose > ema200)) return;

  const entry = lastClose;
  const target = signal === 'BUY'
    ? entry + lastAtr * TARGET_MULTIPLIER
    : entry - lastAtr * TARGET_MULTIPLIER;
  const stoploss = signal === 'BUY'
    ? entry - lastAtr * STOPLOSS_MULTIPLIER
    : entry + lastAtr * STOPLOSS_MULTIPLIER;

  for (const chatId of USER_CHAT_IDS) {
    if (hasActiveTrade(chatId)) continue;

    if (!activeTrades[chatId]) activeTrades[chatId] = {};
    activeTrades[chatId][symbol] = { signal, entry, target, stoploss };
    userTradeLock[chatId] = true;

    const tradeMsg = `📢 ${signal} Signal for ${symbol}!
💰 Entry: ${entry.toFixed(2)}
🎯 Target: ${target.toFixed(2)}
🛑 Stoploss: ${stoploss.toFixed(2)}`;
    bot.sendMessage(chatId, tradeMsg);
  }
}

async function monitorTrades() {
  for (const chatId of USER_CHAT_IDS) {
    const trades = activeTrades[chatId];
    if (!trades) continue;

    for (const symbol in trades) {
      const currentPrice = await fetchCurrentPrice(symbol);
      if (!currentPrice) continue;

      const trade = trades[symbol];
      const hit = checkIfHit(currentPrice, trade);
      if (hit) {
        const hitMsg = hit === 'target'
          ? `✅ Target hit for ${symbol}!\nEntry: ${trade.entry.toFixed(2)}\nTarget: ${trade.target.toFixed(2)}\nCurrent: ${currentPrice.toFixed(2)}`
          : `⚠️ Stoploss hit for ${symbol}!\nEntry: ${trade.entry.toFixed(2)}\nStoploss: ${trade.stoploss.toFixed(2)}\nCurrent: ${currentPrice.toFixed(2)}`;

        await bot.sendMessage(chatId, hitMsg);
        delete activeTrades[chatId][symbol];
        delete userTradeLock[chatId];
      }
    }
  }
}

// BOT COMMANDS

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!USER_CHAT_IDS.includes(chatId)) {
    USER_CHAT_IDS.push(chatId);
    activeTrades[chatId] = {};
  }
  bot.sendMessage(chatId, "✅ Bot started! You will now receive signals.");
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  USER_CHAT_IDS = USER_CHAT_IDS.filter(id => id !== chatId);
  delete activeTrades[chatId];
  delete userTradeLock[chatId];
  bot.sendMessage(chatId, "🛑 Bot stopped. You will no longer receive signals.");
});

bot.onText(/\/active/, (msg) => {
  const chatId = msg.chat.id;
  if (!activeTrades[chatId] || Object.keys(activeTrades[chatId]).length === 0) {
    bot.sendMessage(chatId, "🚫 No active trades.");
    return;
  }

  let statusMsg = "📊 Active trades:\n\n";
  for (const symbol in activeTrades[chatId]) {
    const trade = activeTrades[chatId][symbol];
    statusMsg += `🔹 ${symbol}\n  Signal: ${trade.signal}\n  Entry: ${trade.entry.toFixed(2)}\n  Target: ${trade.target.toFixed(2)}\n  Stoploss: ${trade.stoploss.toFixed(2)}\n\n`;
  }

  bot.sendMessage(chatId, statusMsg);
});

bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, "👇 Click to start", {
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Start Bot", callback_data: "start_bot" }]]
    }
  });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  if (query.data === 'start_bot') {
    if (!USER_CHAT_IDS.includes(chatId)) {
      USER_CHAT_IDS.push(chatId);
      activeTrades[chatId] = {};
    }
    bot.sendMessage(chatId, "✅ Bot started! You will now receive signals.");
  }
});

// CRON JOBS

cron.schedule('*/15 * * * *', async () => {
  await checkNextSymbol();
});

cron.schedule('*/5 * * * *', async () => {
  await monitorTrades();
});
