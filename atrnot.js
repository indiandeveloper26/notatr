require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { SMA } = require('technicalindicators');
const fs = require('fs');

const bot = new TelegramBot('8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE', { polling: true });
const USER_IDS_FILE = './user_chat_ids.json';

const INTERVAL = '15m';
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];
const TRAILING_PERCENT = 0.01; // 1% trailing stoploss

let USER_CHAT_IDS = [];
let activeTrades = {}; // Structure: activeTrades[chatId][symbol] = { entry, stoploss, status }

function loadUserChatIds() {
  if (fs.existsSync(USER_IDS_FILE)) {
    USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
  }
}
function saveUserChatIds() {
  fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS));
}

async function fetchKlines(symbol, interval, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await axios.get(url);
  return res.data.map(c => ({
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    time: c[0]
  }));
}

function isAboveIchimokuCloud(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  const recentHigh9 = Math.max(...highs.slice(-9));
  const recentLow9 = Math.min(...lows.slice(-9));
  const tenkan = (recentHigh9 + recentLow9) / 2;

  const recentHigh26 = Math.max(...highs.slice(-26));
  const recentLow26 = Math.min(...lows.slice(-26));
  const kijun = (recentHigh26 + recentLow26) / 2;

  const spanA = (tenkan + kijun) / 2;
  const spanB = (Math.max(...highs.slice(-52)) + Math.min(...lows.slice(-52))) / 2;

  const close = closes.at(-1);
  return close > spanA && close > spanB;
}

function isBelowIchimokuCloud(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);

  const recentHigh9 = Math.max(...highs.slice(-9));
  const recentLow9 = Math.min(...lows.slice(-9));
  const tenkan = (recentHigh9 + recentLow9) / 2;

  const recentHigh26 = Math.max(...highs.slice(-26));
  const recentLow26 = Math.min(...lows.slice(-26));
  const kijun = (recentHigh26 + recentLow26) / 2;

  const spanA = (tenkan + kijun) / 2;
  const spanB = (Math.max(...highs.slice(-52)) + Math.min(...lows.slice(-52))) / 2;

  const close = closes.at(-1);
  return close < spanA && close < spanB;
}

function analyze(candles) {
  const closes = candles.map(c => c.close);
  const sma200 = SMA.calculate({ values: closes, period: 200 });

  return {
    close: closes.at(-1),
    sma200: sma200.at(-1),
    aboveCloud: isAboveIchimokuCloud(candles),
    belowCloud: isBelowIchimokuCloud(candles),
  };
}

function updateTrailingStop(trade, currentPrice, direction) {
  const trailAmount = currentPrice * TRAILING_PERCENT;
  if (direction === 'buy') {
    const newStop = currentPrice - trailAmount;
    if (newStop > trade.stoploss) {
      trade.stoploss = newStop;
    }
  } else if (direction === 'sell') {
    const newStop = currentPrice + trailAmount;
    if (newStop < trade.stoploss) {
      trade.stoploss = newStop;
    }
  }
}

async function checkSymbol(symbol) {
  const candles = await fetchKlines(symbol, INTERVAL);
  if (!candles || candles.length < 52) return;
  const analysis = analyze(candles);
  const price = analysis.close;

  for (const chatId of USER_CHAT_IDS) {
    if (!activeTrades[chatId]) activeTrades[chatId] = {};
    const trade = activeTrades[chatId][symbol];

    // Exit if trailing stop hit
    if (trade && trade.status === 'buy') {
      updateTrailingStop(trade, price, 'buy');
      if (price <= trade.stoploss) {
        await `bot.sendMessage(chatId, 🔴 *${symbol} SELL (Exit BUY)*\nExit: ${price.toFixed(2)}\nTrailing Stop Hit, { parse_mode: 'Markdown' })`
        delete activeTrades[chatId][symbol];
        continue;
      }
    } else if (trade && trade.status === 'sell') {
      updateTrailingStop(trade, price, 'sell');
      if (price >= trade.stoploss) {
        await `bot.sendMessage(chatId, 🟢 *${symbol} BUY (Exit SELL)*\nExit: ${price.toFixed(2)}\nTrailing Stop Hit, { parse_mode: 'Markdown' })`
        delete activeTrades[chatId][symbol];
        continue;
      }
    }

    // New BUY Signal
    if (price > analysis.sma200 && analysis.aboveCloud && !trade) {
      const stoploss = price - price * TRAILING_PERCENT;
      activeTrades[chatId][symbol] = {
        entry: price,
        stoploss: stoploss,
        status: 'buy'
      };
      await `bot.sendMessage(chatId, 🟢 *${symbol} BUY Signal*\nEntry: ${price.toFixed(2)}\nInitial SL: ${stoploss.toFixed(2)}, { parse_mode: 'Markdown' })`
    }

    // New SELL Signal
    if (price < analysis.sma200 && analysis.belowCloud && !trade) {
      const stoploss = price + price * TRAILING_PERCENT;
      activeTrades[chatId][symbol] = {
        entry: price,
        stoploss: stoploss,
        status: 'sell'
      };
      await `bot.sendMessage(chatId, 🔴 *${symbol} SELL Signal*\nEntry: ${price.toFixed(2)}\nInitial SL: ${stoploss.toFixed(2)}, { parse_mode: 'Markdown' })`
    }
  }
}

let symbolIndex = 0;
async function rotateSymbols() {
  const symbol = SYMBOLS[symbolIndex];
  await checkSymbol(symbol);
  symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
}

bot.onText(/\/start/, msg => {
  const id = msg.chat.id;
  if (!USER_CHAT_IDS.includes(id)) {
    USER_CHAT_IDS.push(id);
    saveUserChatIds();
  }
  bot.sendMessage(id, '✅ SMA 200 + Ichimoku bot active with trailing SL. You will receive BUY & SELL signals.');
});

loadUserChatIds();
setInterval(rotateSymbols, 60 * 1000); // Check each symbol every minute
console.log('Bot running...');