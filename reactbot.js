// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');
// const http = require('http');
// const express = require('express');
// const { Server } = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // React app origin, for development '*'
//   }
// });

// // Telegram Bot setup
// // const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// const INTERVAL = ['15m', '1h', '4h'];
// const SYMBOLS = [ 'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT' ];
// const VOLUME_SMA_PERIOD = 20;
// const USER_IDS_FILE = './user_chat_ids.json';

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
//       time: c[0]
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
//     ({ target, stoploss } = calculateTargetsATRBased(signal, lastClose, lastAtr));
//   }

//   return { signal, lastClose, lastRsi, lastEma, lastMacd, lastVolume, lastVolumeSMA, target, stoploss, lastAtr };
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
//   const candles = await fetchKlines(symbol, INTERVAL[0]);  // Use first interval (15m)
//   const price = await fetchCurrentPrice(symbol);
//   if (!candles || !price) return;

//   const analysis = analyzeData(candles);
//   if (!analysis) return;

//   console.log(`Analysis for ${symbol} @ ${new Date(candles.at(-1).time).toLocaleString()}: Signal=${analysis.signal}, Price=${price.toFixed(2)}`);

//   // Emit signal to all connected Socket.IO clients
//   io.emit('signal', { symbol, analysis, price });

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
//       await bot.sendMessage(chatId, `📊 *${symbol}* Signal: *${analysis.signal}*\n💰 Entry: ${price.toFixed(2)}\n🎯 Target: ${analysis.target.toFixed(2)}\n🛑 Stoploss: ${analysis.stoploss.toFixed(2)}\n📉 RSI: ${analysis.lastRsi.toFixed(2)} | EMA: ${analysis.lastEma.toFixed(2)}\n📈 MACD: ${analysis.lastMacd.MACD.toFixed(2)} / ${analysis.lastMacd.signal.toFixed(2)}\n📊 Volume: ${analysis.lastVolume.toFixed(0)} / SMA: ${analysis.lastVolumeSMA.toFixed(0)}`, { parse_mode: 'Markdown' });

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

// // Load saved users on start
// loadUserChatIds();

// // Check one symbol every 60 seconds
// setInterval(checkNextSymbol, 60 * 1000);

// io.on('connection', (socket) => {
//   console.log('New client connected: ' + socket.id);
//   socket.on('disconnect', () => {
//     console.log('Client disconnected: ' + socket.id);
//   });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });






require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // React app origin, for development '*'
  }
});

const INTERVAL = ['15m', '1h', '4h'];
const SYMBOLS = [ 'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT' ];
const VOLUME_SMA_PERIOD = 20;

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
  } else {
    target = price - targetMultiplier * atr;
    stoploss = price + stoplossMultiplier * atr;
  }
  return { target, stoploss };
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
  } catch (e) {
    console.error("Kline fetch error for", symbol, e.message);
    return null;
  }
}

async function fetchCurrentPrice(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const res = await axios.get(url);
    return parseFloat(res.data.price);
  } catch (e) {
    console.error("Price fetch error for", symbol, e.message);
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
    ({ target, stoploss } = calculateTargetsATRBased(signal, lastClose, lastAtr));
  }

  return { signal, lastClose, lastRsi, lastEma, lastMacd, lastVolume, lastVolumeSMA, target, stoploss, lastAtr };
}

async function checkSymbol(symbol) {
  const candles = await fetchKlines(symbol, INTERVAL[0]);  // Use first interval (15m)
  const price = await fetchCurrentPrice(symbol);
  if (!candles || !price) return;

  const analysis = analyzeData(candles);
  if (!analysis) return;

  console.log(`Analysis for ${symbol} @ ${new Date(candles.at(-1).time).toLocaleString()}: Signal=${analysis.signal}, Price=${price.toFixed(2)}`);

  // Emit signal to all connected Socket.IO clients
  io.emit('signal', { symbol, analysis, price });
}

let currentSymbolIndex = 0;

async function checkNextSymbol() {
  const symbol = SYMBOLS[currentSymbolIndex];
  console.log(`Checking symbol: ${symbol}`);
  await checkSymbol(symbol);
  currentSymbolIndex = (currentSymbolIndex + 1) % SYMBOLS.length;
}

// Check one symbol every 60 seconds
setInterval(checkNextSymbol, 60 * 1000);

io.on('connection', (socket) => {
  console.log('New client connected: ' + socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected: ' + socket.id);
  });
});



app.get("/trad",(req,res)=>{
    res.send("this is trading server for apii liten 5000 port")
})

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


