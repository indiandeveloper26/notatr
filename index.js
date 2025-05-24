// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');

// // Aap yahan interval change kar sakte hain '5m', '15m', '1h'
// const INTERVAL = '15m';  // Change to '1h' or '5m' as needed

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
// const VOLUME_SMA_PERIOD = 20;
// const USER_IDS_FILE = './user_chat_ids.json';

// const bot = new TelegramBot('8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE', { polling: true });
// let USER_CHAT_IDS = [];
// let activeTrades = {};
// let lastSignalSent = {};
// let symbolIndex = 0;

// function calculateTargetsATRBased(signal, price, atr) {
//   const atrPercent = (atr / price) * 100;
//   let targetMultiplier = 1.5;
//   let stoplossMultiplier = 1.0;

//   if (atrPercent < 0.5) {
//     targetMultiplier = 2.0;
//     stoplossMultiplier = 0.7;
//   } else if (atrPercent > 2.0) {
//     targetMultiplier = 1.2;
//     stoplossMultiplier = 1.5;
//   }

//   let target, stoploss;
//   if (signal === 'BUY') {
//     target = price + targetMultiplier * atr;
//     stoploss = price - stoplossMultiplier * atr;
//   } else if (signal === 'SELL') {
//     target = price - targetMultiplier * atr;
//     stoploss = price + stoplossMultiplier * atr;
//   }
//   return { target, stoploss };
// }

// function loadUserChatIds() {
//   try {
//     if (fs.existsSync(USER_IDS_FILE)) {
//       USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
//     }
//   } catch (err) {
//     console.error("Error loading user chat ids:", err.message);
//   }
// }

// function saveUserChatIds() {
//   try {
//     fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS));
//   } catch (err) {
//     console.error("Error saving user chat ids:", err.message);
//   }
// }

// async function fetchKlines(symbol, interval, limit = 100) {
//   try {
//     const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//     const res = await axios.get(url);
//     return res.data.map(c => ({
//       open: parseFloat(c[1]),
//       high: parseFloat(c[2]),
//       low: parseFloat(c[3]),
//       close: parseFloat(c[4]),
//       volume: parseFloat(c[5]),
//       time: c[0]
//     }));
//   } catch (err) {
//     console.error("Kline fetch error:", err.message);
//     return null;
//   }
// }

// async function fetchCurrentPrice(symbol) {
//   try {
//     const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
//     const res = await axios.get(url);
//     return parseFloat(res.data.price);
//   } catch (err) {
//     console.error("Price fetch error:", err.message);
//     return null;
//   }
// }

// function analyzeData(candles) {
//   const closes = candles.map(c => c.close);
//   const highs = candles.map(c => c.high);
//   const lows = candles.map(c => c.low);
//   const volumes = candles.map(c => c.volume);

//   const rsi = RSI.calculate({ values: closes, period: 14 });
//   const ema = EMA.calculate({ values: closes, period: 14 });
//   const macd = MACD.calculate({
//     values: closes,
//     fastPeriod: 12,
//     slowPeriod: 26,
//     signalPeriod: 9,
//     SimpleMAOscillator: false,
//     SimpleMASignal: false
//   });
//   const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
//   const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD });

//   const lastClose = closes.at(-1);
//   const lastEma = ema.at(-1);
//   const lastMacd = macd.at(-1);
//   const lastRsi = rsi.at(-1);
//   const lastAtr = atr.at(-1);
//   const lastVolume = volumes.at(-1);
//   const lastVolumeSMA = volumeSMA.at(-1);

//   let signal = 'HOLD';
//   const volumeOkay = lastVolume > (0.8 * lastVolumeSMA);

//   if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal && lastRsi > 50) {
//     signal = 'BUY';
//   } else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal && lastRsi < 50) {
//     signal = 'SELL';
//   }

//   let target = null, stoploss = null;
//   if (signal !== 'HOLD') {
//     const { target: t, stoploss: s } = calculateTargetsATRBased(signal, lastClose, lastAtr);
//     target = t;
//     stoploss = s;
//   }

//   return {
//     signal,
//     lastClose,
//     lastEma,
//     lastRsi,
//     lastMacd,
//     lastAtr,
//     lastVolume,
//     lastVolumeSMA,
//     target,
//     stoploss
//   };
// }

// function checkIfHit(price, trade) {
//   if (!trade) return false;
//   if (trade.signal === 'BUY') {
//     if (price >= trade.target) return 'target';
//     if (price <= trade.stoploss) return 'stoploss';
//   } else if (trade.signal === 'SELL') {
//     if (price <= trade.target) return 'target';
//     if (price >= trade.stoploss) return 'stoploss';
//   }
//   return false;
// }

// async function sendSignalForSymbol(symbol) {
//   const candles = await fetchKlines(symbol, INTERVAL);
//   const price = await fetchCurrentPrice(symbol);
//   if (!candles || !price) return;

//   const analysis = analyzeData(candles);
//   if (!analysis) return;

//   for (const chatId of USER_CHAT_IDS) {
//     if (!activeTrades[chatId]) activeTrades[chatId] = {};
//     if (!lastSignalSent[chatId]) lastSignalSent[chatId] = {};

//     const trade = activeTrades[chatId][symbol];
//     const lastSent = lastSignalSent[chatId][symbol];

//     if (trade && trade.status === 'active') {
//       const hit = checkIfHit(price, trade);
//       if (hit) {
//         await bot.sendMessage(chatId, `⚠️ *${symbol} ${trade.signal}* trade closed due to *${hit.toUpperCase()}* at ${price.toFixed(2)}`, { parse_mode: 'Markdown' });
//         activeTrades[chatId][symbol].status = 'closed';
//         delete activeTrades[chatId][symbol];
//         lastSignalSent[chatId][symbol] = null;
//       }
//       continue;
//     }

//     if (analysis.signal === 'HOLD') {
//       if (lastSent !== 'HOLD') {
//         await bot.sendMessage(chatId, `ℹ️ *${symbol}* ka signal: *HOLD* hai.`, { parse_mode: 'Markdown' });
//         lastSignalSent[chatId][symbol] = 'HOLD';
//       }
//       continue;
//     }

//     if (lastSent !== analysis.signal) {
//       const msg = `
// 📡 Signal - ${symbol} (${INTERVAL})
// 📈 Signal: ${analysis.signal}
// 💰 Entry: ${price.toFixed(2)}
// 🎯 Target: ${analysis.target.toFixed(2)}
// 🛑 Stoploss: ${analysis.stoploss.toFixed(2)}

// 📊 RSI: ${analysis.lastRsi.toFixed(2)}
// 📉 EMA14: ${analysis.lastEma.toFixed(2)}
// 📈 MACD: ${analysis.lastMacd.MACD.toFixed(2)}
// 🟡 Signal Line: ${analysis.lastMacd.signal.toFixed(2)}
// 📊 Volume: ${analysis.lastVolume.toFixed(0)}
// 📉 SMA Volume: ${analysis.lastVolumeSMA.toFixed(0)}
//       `;
//       await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

//       activeTrades[chatId][symbol] = {
//         signal: analysis.signal,
//         entry: price,
//         target: analysis.target,
//         stoploss: analysis.stoploss,
//         atr: analysis.lastAtr,
//         status: 'active'
//       };
//       lastSignalSent[chatId][symbol] = analysis.signal;
//     }
//   }
// }

// async function run() {
//   if (USER_CHAT_IDS.length === 0) {
//     console.log("No users subscribed yet.");
//     return;
//   }

//   const symbol = SYMBOLS[symbolIndex];
//   console.log(`Checking symbol: ${symbol} on interval ${INTERVAL}`);
//   await sendSignalForSymbol(symbol);
//   symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
// }

// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   if (!USER_CHAT_IDS.includes(chatId)) {
//     USER_CHAT_IDS.push(chatId);
//     saveUserChatIds();
//   }
//   bot.sendMessage(chatId, '✅ Welcome! Aapko ab trade signals milenge.');
// });

// bot.onText(/\/active/, (msg) => {
//   const chatId = msg.chat.id;
//   const trades = activeTrades[chatId];

//   if (!trades || Object.keys(trades).length === 0) {
//     bot.sendMessage(chatId, "🚫 Koi active trade nahi hai.");
//     return;
//   }

//   let response = "📊 Aapke Active Trades:\n\n";
//   for (const symbol in trades) {
//     const t = trades[symbol];
//     response += `*${symbol}*\nSignal: ${t.signal}\nEntry: ${t.entry.toFixed(2)}\nTarget: ${t.target.toFixed(2)}\nStoploss: ${t.stoploss.toFixed(2)}\nStatus: ${t.status}\n\n`;
//   }
//   bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
// });

// loadUserChatIds();
// setInterval(run, 60 * 1000);










require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');

// Aap yahan interval change kar sakte hain '5m', '15m', '1h'
const INTERVAL = '15m';  // Change to '1h' or '5m' as needed

const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'LINKUSDT'
];
const VOLUME_SMA_PERIOD = 20;
const USER_IDS_FILE = './user_chat_ids.json';

const bot = new TelegramBot("7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY", { polling: true });
let USER_CHAT_IDS = [];
let activeTrades = {};
let lastSignalSent = {};
let symbolIndex = 0;

function calculateTargetsATRBased(signal, price, atr) {
  const atrPercent = (atr / price) * 100;
  let targetMultiplier = 1.5;
  let stoplossMultiplier = 1.0;

  if (atrPercent < 0.5) {
    targetMultiplier = 2.0;
    stoplossMultiplier = 0.7;
  } else if (atrPercent > 2.0) {
    targetMultiplier = 1.2;
    stoplossMultiplier = 1.5;
  }

  let target, stoploss;
  if (signal === 'BUY') {
    target = price + targetMultiplier * atr;
    stoploss = price - stoplossMultiplier * atr;
  } else if (signal === 'SELL') {
    target = price - targetMultiplier * atr;
    stoploss = price + stoplossMultiplier * atr;
  }
  return { target, stoploss };
}

function loadUserChatIds() {
  try {
    if (fs.existsSync(USER_IDS_FILE)) {
      USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
    }
  } catch (err) {
    console.error("Error loading user chat ids:", err.message);
  }
}

function saveUserChatIds() {
  try {
    fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS));
  } catch (err) {
    console.error("Error saving user chat ids:", err.message);
  }
}

async function fetchKlines(symbol, interval, limit = 100) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await axios.get(url);
    return res.data.map(c => ({
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      time: c[0]
    }));
  } catch (err) {
    console.error("Kline fetch error:", err.message);
    return null;
  }
}

async function fetchCurrentPrice(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const res = await axios.get(url);
    return parseFloat(res.data.price);
  } catch (err) {
    console.error("Price fetch error:", err.message);
    return null;
  }
}

function analyzeData(candles) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const rsi = RSI.calculate({ values: closes, period: 14 });
  const ema = EMA.calculate({ values: closes, period: 14 });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD });

  const lastClose = closes.at(-1);
  const lastEma = ema.at(-1);
  const lastMacd = macd.at(-1);
  const lastRsi = rsi.at(-1);
  const lastAtr = atr.at(-1);
  const lastVolume = volumes.at(-1);
  const lastVolumeSMA = volumeSMA.at(-1);

  let signal = 'HOLD';
  const volumeOkay = lastVolume > (0.8 * lastVolumeSMA);

  if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal && lastRsi > 50) {
    signal = 'BUY';
  } else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal && lastRsi < 50) {
    signal = 'SELL';
  }

  let target = null, stoploss = null;
  if (signal !== 'HOLD') {
    const { target: t, stoploss: s } = calculateTargetsATRBased(signal, lastClose, lastAtr);
    target = t;
    stoploss = s;
  }

  return {
    signal,
    lastClose,
    lastEma,
    lastRsi,
    lastMacd,
    lastAtr,
    lastVolume,
    lastVolumeSMA,
    target,
    stoploss
  };
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

async function sendSignalForSymbol(symbol) {
  const candles = await fetchKlines(symbol, INTERVAL);
  const price = await fetchCurrentPrice(symbol);
  if (!candles || !price) return;

  const analysis = analyzeData(candles);
  if (!analysis) return;

  for (const chatId of USER_CHAT_IDS) {
    if (!activeTrades[chatId]) activeTrades[chatId] = {};
    if (!lastSignalSent[chatId]) lastSignalSent[chatId] = {};

    const trade = activeTrades[chatId][symbol];
    const lastSent = lastSignalSent[chatId][symbol];

    // Target ya Stoploss hit hone par summary message bhejna
    if (trade && trade.status === 'active') {
      const hit = checkIfHit(price, trade);
      if (hit) {
        await bot.sendMessage(chatId, `⚠️ *${symbol} ${trade.signal}* trade closed due to *${hit.toUpperCase()}* at ${price.toFixed(2)}`, { parse_mode: 'Markdown' });
        activeTrades[chatId][symbol].status = 'closed';
        delete activeTrades[chatId][symbol];
        lastSignalSent[chatId][symbol] = null;
      }
      continue;
    }

    if (analysis.signal === 'HOLD') {
      if (lastSent !== 'HOLD') {
        await bot.sendMessage(chatId, `ℹ️ *${symbol}* ka signal: *HOLD* hai.`, { parse_mode: 'Markdown' });
        lastSignalSent[chatId][symbol] = 'HOLD';
      }
      continue;
    }

    if (lastSent !== analysis.signal) {
      const msg = `
📡 Signal - ${symbol} (${INTERVAL})
📈 Signal: ${analysis.signal}
💰 Entry: ${price.toFixed(2)}
🎯 Target: ${analysis.target.toFixed(2)}
🛑 Stoploss: ${analysis.stoploss.toFixed(2)}

📊 RSI: ${analysis.lastRsi.toFixed(2)}
📉 EMA14: ${analysis.lastEma.toFixed(2)}
📈 MACD: ${analysis.lastMacd.MACD.toFixed(2)}
🟡 Signal Line: ${analysis.lastMacd.signal.toFixed(2)}
📊 Volume: ${analysis.lastVolume.toFixed(0)}
📉 SMA Volume: ${analysis.lastVolumeSMA.toFixed(0)}
      `;
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

      activeTrades[chatId][symbol] = {
        signal: analysis.signal,
        entry: price,
        target: analysis.target,
        stoploss: analysis.stoploss,
        atr: analysis.lastAtr,
        status: 'active'
      };
      lastSignalSent[chatId][symbol] = analysis.signal;
    }
  }
}

async function run() {
  if (USER_CHAT_IDS.length === 0) {
    console.log("No users subscribed yet.");
    return;
  }

  const symbol = SYMBOLS[symbolIndex];
  console.log(`Checking symbol: ${symbol} on interval ${INTERVAL}`);
  await sendSignalForSymbol(symbol);
  symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!USER_CHAT_IDS.includes(chatId)) {
    USER_CHAT_IDS.push(chatId);
    saveUserChatIds();
  }
  bot.sendMessage(chatId, '✅ Welcome! Aapko ab trade signals milenge.');
});

bot.onText(/\/active/, (msg) => {
  const chatId = msg.chat.id;
  const trades = activeTrades[chatId];

  if (!trades || Object.keys(trades).length === 0) {
    bot.sendMessage(chatId, "🚫 Koi active trade nahi hai.");
    return;
  }

  let response = "📊 Aapke Active Trades:\n\n";
  for (const symbol in trades) {
    const t = trades[symbol];
    response += `*${symbol}*\nSignal: ${t.signal}\nEntry: ${t.entry.toFixed(2)}\nTarget: ${t.target.toFixed(2)}\nStoploss: ${t.stoploss.toFixed(2)}\nStatus: ${t.status}\n\n`;
  }
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

loadUserChatIds();
setInterval(run, 60 * 1000);
