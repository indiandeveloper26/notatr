// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');

// // Change interval here to 15 minutes candles

// const INTERVAL = '15m'



// const SYMBOLS = [
//   'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
//   'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
// ];

// const VOLUME_SMA_PERIOD = 20;
// const USER_IDS_FILE = './user_chat_ids.json';

// const bot = new TelegramBot("7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY"|| "YOUR_BOT_TOKEN_HERE", { polling: true });

// let USER_CHAT_IDS = [];
// let activeTrades = {};
// let lastSignalSent = {};

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
//   } else {
//     target = price - targetMultiplier * atr;
//     stoploss = price + stoplossMultiplier * atr;
//   }
//   return { target, stoploss };
// }

// function loadUserChatIds() {
//   if (fs.existsSync(USER_IDS_FILE)) {
//     USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
//   }
// }

// function saveUserChatIds() {
//   fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS));
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
//       time: c[0]  // candle start timestamp in milliseconds
//     }));
//   } catch (e) {
//     console.error("Kline fetch error for", symbol, e.message);
//     return null;
//   }
// }

// async function fetchCurrentPrice(symbol) {
//   try {
//     const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
//     const res = await axios.get(url);
//     return parseFloat(res.data.price);
//   } catch (e) {
//     console.error("Price fetch error for", symbol, e.message);
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
//   const sma200 = SMA.calculate({ period: 200, values: closes });

//   const ichimoku = require('technicalindicators').IchimokuCloud.calculate({
//     high: highs,
//     low: lows,
//     conversionPeriod: 9,
//     basePeriod: 26,
//     spanPeriod: 52,
//     displacement: 26
//   });

//   const lastClose = closes.at(-1);
//   const lastEma = ema.at(-1);
//   const lastMacd = macd.at(-1);
//   const lastRsi = rsi.at(-1);
//   const lastAtr = atr.at(-1);
//   const lastVolume = volumes.at(-1);
//   const lastVolumeSMA = volumeSMA.at(-1);
//   const lastSma200 = sma200.at(-1);
//   const lastIchimoku = ichimoku.at(-1); // Contains conversion, base, spanA, spanB

//   let signal = 'HOLD';

//   const volumeOkay = lastVolume > (0.8 * lastVolumeSMA);

//   // Original condition + SMA200 trend filter + Ichimoku cloud logic
//   if (
//     volumeOkay &&
//     lastClose > lastEma &&
//     lastMacd.MACD > lastMacd.signal &&
//     lastRsi > 50 &&
//     lastClose > lastSma200 &&
//     lastIchimoku && lastClose > lastIchimoku.spanA && lastClose > lastIchimoku.spanB
//   ) {
//     signal = 'BUY';
//   } else if (
//     volumeOkay &&
//     lastClose < lastEma &&
//     lastMacd.MACD < lastMacd.signal &&
//     lastRsi < 50 &&
//     lastClose < lastSma200 &&
//     lastIchimoku && lastClose < lastIchimoku.spanA && lastClose < lastIchimoku.spanB
//   ) {
//     signal = 'SELL';
//   }

//   let target = null, stoploss = null;
//   if (signal !== 'HOLD') {
//     ({ target, stoploss } = calculateTargetsATRBased(signal, lastClose, lastAtr));
//   }

//   return {
//     signal,
//     lastClose,
//     lastRsi,
//     lastEma,
//     lastMacd,
//     lastVolume,
//     lastVolumeSMA,
//     target,
//     stoploss,
//     lastAtr,
//     lastSma200,
//     lastIchimoku
//   };
// }


// function checkIfHit(price, trade) {
//   if (!trade) return false;
//   if (trade.signal === 'BUY') {
//     if (price >= trade.target) return 'target';
//     if (price <= trade.stoploss) return 'stoploss';
//   } else {
//     if (price <= trade.target) return 'target';
//     if (price >= trade.stoploss) return 'stoploss';
//   }
//   return false;
// }

// async function checkSymbol(symbol) {
//   const candles = await fetchKlines(symbol, INTERVAL);
//   const price = await fetchCurrentPrice(symbol);
//   if (!candles || !price) return;

//   const analysis = analyzeData(candles);
//   if (!analysis) return;

//   console.log(`Analysis for ${symbol} @ ${new Date(candles.at(-1).time).toLocaleString()}: Signal=${analysis.signal}, Price=${price.toFixed(2)}`);

//   for (const chatId of USER_CHAT_IDS) {
//     if (!activeTrades[chatId]) activeTrades[chatId] = {};
//     if (!lastSignalSent[chatId]) lastSignalSent[chatId] = {};

//     const trade = activeTrades[chatId][symbol];

//     if (trade && trade.status === 'active') {
//       const hit = checkIfHit(price, trade);
//       if (hit) {
//         await bot.sendMessage(chatId, `✅ *${symbol} ${trade.signal}* trade closed by *${hit.toUpperCase()}* at ${price.toFixed(2)}`, { parse_mode: 'Markdown' });
//         trade.status = 'closed';
//         delete activeTrades[chatId][symbol];
//         lastSignalSent[chatId][symbol] = null;
//       }
//       continue;
//     }

//     if (analysis.signal !== 'HOLD' && !activeTrades[chatId][symbol]) {
//       await bot.sendMessage(chatId, `📊 *${symbol}* Signal: *${analysis.signal}*
// 💰 Entry: ${price.toFixed(2)}
// 🎯 Target: ${analysis.target.toFixed(2)}
// 🛑 Stoploss: ${analysis.stoploss.toFixed(2)}
// 📉 RSI: ${analysis.lastRsi.toFixed(2)} | EMA: ${analysis.lastEma.toFixed(2)}
// 📈 MACD: ${analysis.lastMacd.MACD.toFixed(2)} / ${analysis.lastMacd.signal.toFixed(2)}
// 📊 Volume: ${analysis.lastVolume.toFixed(0)} / SMA: ${analysis.lastVolumeSMA.toFixed(0)}`, { parse_mode: 'Markdown' });

//       activeTrades[chatId][symbol] = {
//         signal: analysis.signal,
//         entry: price,
//         target: analysis.target,
//         stoploss: analysis.stoploss,
//         atr: analysis.lastAtr,
//         status: 'active'
//       };
//       lastSignalSent[chatId][symbol] = analysis.signal;
//     } else if (analysis.signal === 'HOLD' && lastSignalSent[chatId][symbol] !== 'HOLD') {
//       await bot.sendMessage(chatId, `ℹ️ *${symbol}* ka signal: *HOLD* hai.`, { parse_mode: 'Markdown' });
//       lastSignalSent[chatId][symbol] = 'HOLD';
//     }
//   }
// }

// let currentSymbolIndex = 0;

// async function checkNextSymbol() {
//   const symbol = SYMBOLS[currentSymbolIndex];
//   console.log(`Checking symbol: ${symbol}`);
//   await checkSymbol(symbol);

//   currentSymbolIndex = (currentSymbolIndex + 1) % SYMBOLS.length;
// }

// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   if (!USER_CHAT_IDS.includes(chatId)) {
//     USER_CHAT_IDS.push(chatId);
//     saveUserChatIds();
//   }
//   bot.sendMessage(chatId, '✅ Welcome! You will now receive trading signals.');
// });

// bot.onText(/\/active/, (msg) => {
//   const chatId = msg.chat.id;
//   const trades = activeTrades[chatId];
//   if (!trades || Object.keys(trades).length === 0) {
//     return bot.sendMessage(chatId, '📭 No active trades.');
//   }
//   let response = "📈 Your Active Trades:\n";
//   for (const symbol in trades) {
//     const t = trades[symbol];
//     response += `\n*${symbol}* - ${t.signal}\nEntry: ${t.entry.toFixed(2)}\nTarget: ${t.target.toFixed(2)}\nStoploss: ${t.stoploss.toFixed(2)}\nStatus: ${t.status}\n`;
//   }
//   bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
// });

// // Load saved users on start
// loadUserChatIds();

// // Check one symbol every minute (rotating symbols)
// // setInterval(checkNextSymbol, 60 * 1000);

// setInterval(checkNextSymbol,  60 * 1000); // every 5 minutes


// console.log('Bot started and polling...');














require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA, MACD, SMA, ATR, ADX } = require('technicalindicators');

const INTERVAL = '15m';
const HIGHER_INTERVALS = ['1h', '4h'];
const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];

const bot = new TelegramBot("8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE", { polling: true });
const USER_IDS_FILE = './user_chat_ids.json';
const VOLUME_SMA_PERIOD = 20;

let USER_CHAT_IDS = [];
let activeTrades = {};
let lastSignalSent = {};
let cooldowns = {}; // cooldowns[symbol] = timestamp

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
    open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[5]), time: c[0]
  }));
}

function isAboveCloud(candles) {
  const closes = candles.map(c => c.close);
  const nineHigh = SMA.calculate({ values: candles.map(c => c.high), period: 9 });
  const nineLow = SMA.calculate({ values: candles.map(c => c.low), period: 9 });
  const tenkan = nineHigh.map((h, i) => (h + nineLow[i]) / 2);

  const high26 = SMA.calculate({ values: candles.map(c => c.high), period: 26 });
  const low26 = SMA.calculate({ values: candles.map(c => c.low), period: 26 });
  const kijun = high26.map((h, i) => (h + low26[i]) / 2);

  const spanA = kijun.map((k, i) => (k + tenkan[i]) / 2);
  const spanB = SMA.calculate({ values: candles.map(c => c.high).map((v, i, arr) => (v + candles[i].low) / 2), period: 52 });

  const close = closes.at(-1);
  const sA = spanA.at(-1);
  const sB = spanB.at(-1);

  return close > Math.max(sA, sB);
}

function analyze(candles) {
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const volume = candles.map(c => c.volume);

  const sma200 = SMA.calculate({ values: close, period: 200 });
  const adx = ADX.calculate({ close, high, low, period: 14 });
  const atr = ATR.calculate({ close, high, low, period: 14 });
  const volSMA = SMA.calculate({ values: volume, period: VOLUME_SMA_PERIOD });

  const latest = {
    close: close.at(-1),
    sma200: sma200.at(-1),
    aboveCloud: isAboveCloud(candles),
    adx: adx.at(-1)?.adx || 0,
    volume: volume.at(-1),
    avgVol: volSMA.at(-1),
    atr: atr.at(-1)
  };

  return latest;
}

function isBuyValid(analysis) {
  return (
    analysis.close > analysis.sma200 &&
    analysis.aboveCloud &&
    analysis.adx > 20 &&
    analysis.volume > 0.8 * analysis.avgVol
  );
}

function calculateTargets(price, atr) {
  return {
    target: price + 1.5 * atr,
    stoploss: price - 1.0 * atr
  };
}

async function checkSymbol(symbol) {
  const main = await fetchKlines(symbol, INTERVAL);
  if (!main) return;
  const checks = await Promise.all(HIGHER_INTERVALS.map(tf => fetchKlines(symbol, tf)));
  if (checks.includes(null)) return;

  const m15 = analyze(main);
  const h1 = analyze(checks[0]);
  const h4 = analyze(checks[1]);

  if (!isBuyValid(m15) || !isBuyValid(h1) || !isBuyValid(h4)) return;

  const now = Date.now();
  if (cooldowns[symbol] && now - cooldowns[symbol] < 2 * 60 * 60 * 1000) return;
  cooldowns[symbol] = now;

  const { target, stoploss } = calculateTargets(m15.close, m15.atr);
  for (const chatId of USER_CHAT_IDS) {
    await bot.sendMessage(chatId, `🟢 ${symbol} BUY Signal
Price: ${m15.close.toFixed(2)}
Target: ${target.toFixed(2)}
Stoploss: ${stoploss.toFixed(2)}
ADX: ${m15.adx.toFixed(2)} | Volume: ${m15.volume.toFixed(0)} / ${m15.avgVol.toFixed(0)}`, { parse_mode: 'Markdown' });
  }
}

let symbolIndex = 0;
async function rotateSymbols() {
  await checkSymbol(SYMBOLS[symbolIndex]);
  symbolIndex = (symbolIndex + 1) % SYMBOLS.length;
}

bot.onText(/\/start/, msg => {
  const id = msg.chat.id;
  if (!USER_CHAT_IDS.includes(id)) {
    USER_CHAT_IDS.push(id);
    saveUserChatIds();
  }
  bot.sendMessage(id, '✅ Bot activated. You will now receive signals.');
});

loadUserChatIds();
setInterval(rotateSymbols, 60 * 1000);
console.log('Bot running...');