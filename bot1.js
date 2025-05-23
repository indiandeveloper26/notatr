// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');
// const brain = require('brain.js');

// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// const SYMBOLS = [
//   'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
//   'DOGEUSDT', 'SOLUSDT', 'DOTUSDT', 'MATICUSDT',
//   'LTCUSDT', 'TRXUSDT', 'AVAXUSDT', 'SHIBUSDT'
// ];
// const INTERVAL_15m = '15m';
// const INTERVAL_1h = '1h';
// const TARGET_MULTIPLIER = 1.5;
// const STOPLOSS_MULTIPLIER = 1.0;
// const VOLUME_SMA_PERIOD = 20;
// const EMA_1H_PERIOD = 200;
// const MODEL_FILE = 'advanced_lstm_model.json';
// const TRAILING_ATR_FACTOR = 1;

// const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
// let USER_CHAT_IDS = [];
// let activeTrades = {};

// async function fetchKlines(symbol, interval, limit = 250) {
//   try {
//     const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
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
//     console.error`(Error fetching klines for ${symbol} (${interval}):, err.message)`
//     return [];
//   }
// }

// async function fetchCurrentPrice(symbol) {
//   try {
//     const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
//     const res = await axios.get(url);
//     return parseFloat(res.data.price);
//   } catch (err) {
//     console.error`(Error fetching price for ${symbol}:, err.message)`
//     return null;
//   }
// }

// function analyzeData15m(candles) {
//   const closes = candles.map(c => c.close);
//   const highs = candles.map(c => c.high);
//   const lows = candles.map(c => c.low);
//   const volumes = candles.map(c => c.volume);

//   const rsi = RSI.calculate({ values: closes, period: 14 });
//   const ema15 = EMA.calculate({ values: closes, period: 14 });
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

//   if (!macd.length || !rsi.length || !ema15.length || !atr.length || !volumeSMA.length) return null;

//   const lastClose = closes.at(-1);
//   const lastEma = ema15.at(-1);
//   const lastMacd = macd.at(-1);
//   const lastRsi = rsi.at(-1);
//   const lastAtr = atr.at(-1);
//   const lastVolume = volumes.at(-1);
//   const lastVolumeSMA = volumeSMA.at(-1);

//   let signal = 'HOLD';
//   const volumeOkay = lastVolume > lastVolumeSMA;
//   if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal) signal = 'BUY';
//   else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal) signal = 'SELL';

//   return {
//     signal,
//     lastClose,
//     lastEma,
//     lastRsi,
//     lastMacd,
//     lastAtr,
//     lastVolume,
//     lastVolumeSMA
//   };
// }

// function analyzeData1h(candles) {
//   const closes = candles.map(c => c.close);
//   if (closes.length < EMA_1H_PERIOD) return null;
//   const ema1h = EMA.calculate({ values: closes, period: EMA_1H_PERIOD });
//   return ema1h.at(-1);
// }

// function updateTrailingStop(trade, currentPrice) {
//   if (trade.signal === 'BUY') {
//     let profit = currentPrice - trade.entry;
//     if (profit > trade.atr * TRAILING_ATR_FACTOR) {
//       let newStoploss = currentPrice - trade.atr * TRAILING_ATR_FACTOR;
//       trade.stoploss = Math.max(trade.stoploss, newStoploss);
//     }
//   } else if (trade.signal === 'SELL') {
//     let profit = trade.entry - currentPrice;
//     if (profit > trade.atr * TRAILING_ATR_FACTOR) {
//       let newStoploss = currentPrice + trade.atr * TRAILING_ATR_FACTOR;
//       trade.stoploss = Math.min(trade.stoploss, newStoploss);
//     }
//   }
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

// async function prepareData(symbol = 'BTCUSDT') {
//   const candles = await fetchKlines(symbol, INTERVAL_15m, 250);
//   if (candles.length === 0) return [];
//   const closes = candles.map(c => c.close);
//   const rsi = RSI.calculate({ period: 14, values: closes });
//   const ema = EMA.calculate({ period: 14, values: closes });
//   const macd = MACD.calculate({
//     values: closes,
//     fastPeriod: 12,
//     slowPeriod: 26,
//     signalPeriod: 9,
//     SimpleMAOscillator: false,
//     SimpleMASignal: false
//   });
//   let data = [];
//   for (let i = Math.max(14, 26); i < closes.length - 1; i++) {
//     if (!rsi[i - 14] || !ema[i - 14] || !macd[i - 26]) continue;
//     const feature1 = rsi[i - 14] / 100;
//     const feature2 = closes[i] / ema[i - 14];
//     const feature3 = macd[i - 26].MACD;
//     const feature4 = macd[i - 26].signal;
//     const priceChange = (closes[i + 1] - closes[i]) / closes[i];
//     data.push([feature1, feature2, feature3, feature4, priceChange]);
//   }
//   return data;
// }

// async function trainAndSaveModel(symbol = 'BTCUSDT') {
//   const data = await prepareData(symbol);
//   if (data.length === 0) throw new Error("Insufficient training data.");
//   const trainingData = data.map(d => [...d.slice(0, 4), d[4]]);
//   const net = new brain.recurrent.LSTMTimeStep({ inputSize: 4, hiddenLayers: [20, 15], outputSize: 1 });
//   net.train(trainingData, { iterations: 3000, learningRate: 0.005, errorThresh: 0.003 });
//   fs.writeFileSync(MODEL_FILE, JSON.stringify(net.toJSON(), null, 2));
//   return net;
// }

// async function loadModel() {
//   if (fs.existsSync(MODEL_FILE)) {
//     const modelJSON = JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
//     const net = new brain.recurrent.LSTMTimeStep();
//     net.fromJSON(modelJSON);
//     return net;
//   } else {
//     return await trainAndSaveModel();
//   }
// }

// async function predictNext(symbol = 'BTCUSDT') {
//   const net = await loadModel();
//   const data = await prepareData(symbol);
//   if (data.length === 0) return null;
//   const latest = data[data.length - 1];
//   const prediction = net.run(latest.slice(0, 4));
//   const signal = prediction > 0.005 ? 'BUY' : prediction < -0.005 ? 'SELL' : 'HOLD';
//   return { prediction, signal };
// }

// async function onlineLearningStep(symbol = 'BTCUSDT') {
//   try {
//     const net = await loadModel();
//     const newData = await prepareData(symbol);
//     if (newData.length === 0) return;
//     const trainingData = newData.map(d => [...d.slice(0, 4), d[4]]);
//     net.train(trainingData, { iterations: 500, learningRate: 0.005, errorThresh: 0.004 });
//     fs.writeFileSync(MODEL_FILE, JSON.stringify(net.toJSON(), null, 2));
//   } catch (error) {
//     console.error("Online learning failed:", error.message);
//   }
// }

// bot.onText(/\/predict/, async (msg) => {
//   const chatId = msg.chat.id;
//   const result = await predictNext();
//   if (result) {
//     bot.sendMessage`(chatId, LSTM Prediction: ${result.prediction}\nSignal: ${result.signal})`
//   } else {
//     bot.sendMessage(chatId, 'Prediction failed.');
//   }
// });

// bot.onText(/\/trainLSTM/, async (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, 'Training LSTM model...');
//   try {
//     await trainAndSaveModel();
//     bot.sendMessage(chatId, 'Model trained and saved.');
//   } catch (err) {
//     bot.sendMessage(chatId, 'Training failed: ' + err.message);
//   }
// });

// setInterval(checkNextSymbol, 100000);
// setInterval(monitorActiveTrades, 150000);
// setInterval(onlineLearningStep, 600000);
// setInterval(predictNext, 600000);

// console.log("Trading bot with LSTM prediction, online learning and risk management is running...");










// require('dotenv').config();
// const axios = require('axios');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');

// const bot = new TelegramBot('8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE' || 'YOUR_TOKEN_HERE', { polling: true });

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
// const INTERVAL = '15m';
// const USER_CHAT_IDS = [];
// const VOLUME_SMA_PERIOD = 20;
// const TARGET_MULTIPLIER = 1.5;
// const STOPLOSS_MULTIPLIER = 1.0;

// // Per-user per-symbol active trade: { userId: { symbol: { entry, signal, target, stoploss, atr } } }
// const activeTrades = {};

// async function fetchKlines(symbol, interval, limit = 100) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//     volume: parseFloat(c[5]),
//     time: c[0],
//   }));
// }

// async function fetchCurrentPrice(symbol) {
//   const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
//   return parseFloat(res.data.price);
// }

// function analyze(candles) {
//   const closes = candles.map(c => c.close);
//   const highs = candles.map(c => c.high);
//   const lows = candles.map(c => c.low);
//   const volumes = candles.map(c => c.volume);

//   const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1);
//   const ema = EMA.calculate({ values: closes, period: 14 }).at(-1);
//   const macd = MACD.calculate({
//     values: closes,
//     fastPeriod: 12,
//     slowPeriod: 26,
//     signalPeriod: 9,
//     SimpleMAOscillator: false,
//     SimpleMASignal: false
//   }).at(-1);
//   const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 }).at(-1);
//   const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD }).at(-1);
//   const lastClose = closes.at(-1);
//   const lastVolume = volumes.at(-1);

//   let signal = 'HOLD';
//   const volumeOkay = lastVolume > 0.8 * volumeSMA;

//   if (volumeOkay && lastClose > ema && macd.MACD > macd.signal && rsi > 45) signal = 'BUY';
//   else if (volumeOkay && lastClose < ema && macd.MACD < macd.signal && rsi < 55) signal = 'SELL';

//   let target = null, stoploss = null;
//   if (signal === 'BUY') {
//     target = lastClose + TARGET_MULTIPLIER * atr;
//     stoploss = lastClose - STOPLOSS_MULTIPLIER * atr;
//   } else if (signal === 'SELL') {
//     target = lastClose - TARGET_MULTIPLIER * atr;
//     stoploss = lastClose + STOPLOSS_MULTIPLIER * atr;
//   }

//   return { signal, entry: lastClose, rsi, ema, macd, atr, target, stoploss, volume: lastVolume, volumeSMA };
// }

// function checkHit(price, trade) {
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

// async function checkAndSendSignals() {
//   for (const symbol of SYMBOLS) {
//     const candles = await fetchKlines(symbol, INTERVAL);
//     const currentPrice = await fetchCurrentPrice(symbol);
//     if (!candles || !currentPrice) continue;

//     for (const chatId of USER_CHAT_IDS) {
//       if (!activeTrades[chatId]) activeTrades[chatId] = {};
//       const trade = activeTrades[chatId][symbol];

//       if (trade) {
//         const hit = checkHit(currentPrice, trade);
//         if (hit) {
//           await bot.sendMessage(chatId, `✅ ${symbol} का ${trade.signal} ट्रेड *${hit.toUpperCase()}* पर बंद हुआ\n💰 Price: ${currentPrice}`, { parse_mode: 'Markdown' });
//           delete activeTrades[chatId][symbol];
//         }
//       } else {
//         const result = analyze(candles);
//         if (!result || result.signal === 'HOLD') {
//           await bot.sendMessage(chatId, `⚠️ ${symbol} में अभी कोई ट्रेडिंग सिग्नल नहीं है (HOLD)`);
//           continue;
//         }

//         const msg = `📈 *${symbol} (${INTERVAL})*\nSignal: *${result.signal}*\nPrice: ${currentPrice}\n🎯 Target: ${result.target.toFixed(2)}\n🛑 Stoploss: ${result.stoploss.toFixed(2)}\n\nRSI: ${result.rsi.toFixed(2)}\nEMA14: ${result.ema.toFixed(2)}\nMACD: ${result.macd.MACD.toFixed(2)} / ${result.macd.signal.toFixed(2)}\nVolume: ${result.volume.toFixed(0)} / Avg: ${result.volumeSMA.toFixed(0)}`;
//         await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

//         activeTrades[chatId][symbol] = {
//           signal: result.signal,
//           entry: result.entry,
//           target: result.target,
//           stoploss: result.stoploss,
//           atr: result.atr
//         };
//       }
//     }
//   }
// }

// // === Telegram Commands ===
// bot.onText(/\/start/, msg => {
//   const chatId = msg.chat.id;
//   if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);
//   bot.sendMessage(chatId, "✅ Bot चालू हो गया है। हर मिनट मार्केट चेक होगा और सिग्नल मिलेगा।");
// });

// bot.onText(/\/status/, async msg => {
//   const chatId = msg.chat.id;
//   if (!activeTrades[chatId]) return bot.sendMessage(chatId, "कोई एक्टिव ट्रेड नहीं है।");
//   let msgText = '📊 आपके Active Trades:\n\n';
//   for (const [symbol, trade] of Object.entries(activeTrades[chatId])) {
//     const now = await fetchCurrentPrice(symbol);
//     msgText += `🪙 *${symbol}*\nType: ${trade.signal}\nEntry: ${trade.entry.toFixed(2)}\nNow: ${now.toFixed(2)}\n🎯 Target: ${trade.target.toFixed(2)}\n🛑 SL: ${trade.stoploss.toFixed(2)}\n\n`;
//   }
//   bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
// });

// // === Run Every Minute ===
// console.log("🚀 Bot started. Checking every 1 minute...");
// checkAndSendSignals();
// setInterval(checkAndSendSignals, 60 * 1000);




require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');

// CONFIG
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '15m';
const BOT = new TelegramBot( "7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY" || 'YOUR_BOT_TOKEN', { polling: true });
const USER_CHAT_IDS = []; // Will be filled on /start
const activeTrades = {}; // { userId: { symbol: { signal, entry, target, stoploss } } }

// STRATEGY CONFIG
const TARGET_MULTIPLIER = 1.5;
const STOPLOSS_MULTIPLIER = 1.0;
const VOLUME_SMA_PERIOD = 20;

// === BINANCE API ===
async function fetchKlines(symbol, interval, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await axios.get(url);
  return res.data.map(c => ({
    time: c[0],
    open: +c[1],
    high: +c[2],
    low: +c[3],
    close: +c[4],
    volume: +c[5],
  }));
}

async function fetchPrice(symbol) {
  const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
  return +res.data.price;
}

// === INDICATOR ANALYSIS ===
function analyze(candles) {
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const volume = candles.map(c => c.volume);

  const rsi = RSI.calculate({ values: close, period: 14 }).at(-1);
  const ema = EMA.calculate({ values: close, period: 14 }).at(-1);
  const macd = MACD.calculate({
    values: close,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).at(-1);
  const atr = ATR.calculate({ high, low, close, period: 14 }).at(-1);
  const volumeSMA = SMA.calculate({ values: volume, period: VOLUME_SMA_PERIOD }).at(-1);
  const lastClose = close.at(-1);
  const lastVolume = volume.at(-1);

  let signal = 'HOLD';
  const volumeOkay = lastVolume > 0.8 * volumeSMA;

  if (volumeOkay && lastClose > ema && macd?.MACD > macd?.signal && rsi > 45) signal = 'BUY';
  else if (volumeOkay && lastClose < ema && macd?.MACD < macd?.signal && rsi < 55) signal = 'SELL';

  let target = null, stoploss = null;
  if (signal === 'BUY') {
    target = lastClose + TARGET_MULTIPLIER * atr;
    stoploss = lastClose - STOPLOSS_MULTIPLIER * atr;
  } else if (signal === 'SELL') {
    target = lastClose - TARGET_MULTIPLIER * atr;
    stoploss = lastClose + STOPLOSS_MULTIPLIER * atr;
  }

  return { signal, entry: lastClose, rsi, ema, macd, atr, target, stoploss, volume: lastVolume, volumeSMA };
}

// === TRADE CHECK ===
function checkHit(price, trade) {
  if (!trade) return false;
  if (trade.signal === 'BUY') {
    if (price >= trade.target) return 'target';
    if (price <= trade.stoploss) return 'stoploss';
  } else {
    if (price <= trade.target) return 'target';
    if (price >= trade.stoploss) return 'stoploss';
  }
  return false;
}

// === MAIN FUNCTION ===
async function checkSignals() {
  for (const symbol of SYMBOLS) {
    const candles = await fetchKlines(symbol, INTERVAL);
    const price = await fetchPrice(symbol);

    for (const chatId of USER_CHAT_IDS) {
      if (!activeTrades[chatId]) activeTrades[chatId] = {};
      const trade = activeTrades[chatId][symbol];

      if (trade) {
        const hit = checkHit(price, trade);
        if (hit) {
          await BOT.sendMessage(chatId, `✅ *${symbol}* का ${trade.signal} ट्रेड *${hit.toUpperCase()}* पर बंद हुआ\n💰 Price: ${price}`, { parse_mode: 'Markdown' });
          delete activeTrades[chatId][symbol];
        }
      } else {
        const result = analyze(candles);

        if (result.signal === 'HOLD') {
          await BOT.sendMessage(chatId, `⚠️ *${symbol}* अभी कोई सिग्नल नहीं: HOLD`, { parse_mode: 'Markdown' });
          continue;
        }

        activeTrades[chatId][symbol] = {
          signal: result.signal,
          entry: result.entry,
          target: result.target,
          stoploss: result.stoploss,
        };

        const msg = `📈 *${symbol} (${INTERVAL})*\nSignal: *${result.signal}*\n💰 Price: ${price}\n🎯 Target: ${result.target.toFixed(2)}\n🛑 Stoploss: ${result.stoploss.toFixed(2)}\n\nRSI: ${result.rsi.toFixed(2)}\nEMA: ${result.ema.toFixed(2)}\nMACD: ${result.macd?.MACD?.toFixed(2)} / ${result.macd?.signal?.toFixed(2)}\nVolume: ${result.volume.toFixed(0)} / Avg: ${result.volumeSMA.toFixed(0)}`;
        await BOT.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      }
    }
  }
}

// === TELEGRAM COMMANDS ===
BOT.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);
  BOT.sendMessage(chatId, "✅ Bot चालू हो गया है। हर मिनट signal check होगा।");
});

BOT.onText(/\/status/, async msg => {
  const chatId = msg.chat.id;
  if (!activeTrades[chatId]) return BOT.sendMessage(chatId, "कोई एक्टिव ट्रेड नहीं है।");

  let text = "📊 Active Trades:\n\n";
  for (const [symbol, trade] of Object.entries(activeTrades[chatId])) {
    const current = await fetchPrice(symbol);
    text += `🪙 *${symbol}*\nType: ${trade.signal}\nEntry: ${trade.entry.toFixed(2)}\nNow: ${current.toFixed(2)}\n🎯 Target: ${trade.target.toFixed(2)}\n🛑 SL: ${trade.stoploss.toFixed(2)}\n\n`;
  }

  BOT.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// === RUN LOOP ===
setInterval(checkSignals, 60 * 1000); // 1 minute
console.log('✅ Crypto Signal Bot Started');






// // require('dotenv').config();
// // const axios = require('axios');
// // const TelegramBot = require('node-telegram-bot-api');
// // const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');
// // let toekn="7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY"
// // // === CONFIG ===
// // const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
// // const INTERVAL = '1m'; // 1 min
// // const BOT = new TelegramBot(toekn || '', { polling: true });
// // const USER_CHAT_IDS = []; // Chat IDs collected from /start
// // const activeTrades = {}; // { chatId: { symbol: { signal, entry, target, stoploss } } }
// // let currentSymbolIndex = 0; // For round-robin check

// // const TARGET_MULTIPLIER = 1.5;
// // const STOPLOSS_MULTIPLIER = 1.0;
// // const VOLUME_SMA_PERIOD = 20;

// // // === BINANCE HELPERS ===
// // async function fetchKlines(symbol, interval, limit = 100) {
// //   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
// //   const res = await axios.get(url);
// //   return res.data.map(c => ({
// //     time: c[0], open: +c[1], high: +c[2], low: +c[3],
// //     close: +c[4], volume: +c[5],
// //   }));
// // }
// // async function fetchPrice(symbol) {
// //   const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
// //   return +res.data.price;
// // }

// // // === ANALYSIS ===
// // function analyze(candles) {
// //   const close = candles.map(c => c.close);
// //   const high = candles.map(c => c.high);
// //   const low = candles.map(c => c.low);
// //   const volume = candles.map(c => c.volume);

// //   const rsi = RSI.calculate({ values: close, period: 14 }).at(-1);
// //   const ema = EMA.calculate({ values: close, period: 14 }).at(-1);
// //   const macd = MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }).at(-1);
// //   const atr = ATR.calculate({ high, low, close, period: 14 }).at(-1);
// //   const volumeSMA = SMA.calculate({ values: volume, period: VOLUME_SMA_PERIOD }).at(-1);

// //   const lastClose = close.at(-1);
// //   const lastVolume = volume.at(-1);
// //   const volumeOkay = lastVolume > 0.8 * volumeSMA;

// //   let signal = 'HOLD';
// //   if (volumeOkay && lastClose > ema && macd?.MACD > macd?.signal && rsi > 45) signal = 'BUY';
// //   else if (volumeOkay && lastClose < ema && macd?.MACD < macd?.signal && rsi < 55) signal = 'SELL';

// //   let target = null, stoploss = null;
// //   if (signal === 'BUY') {
// //     target = lastClose + TARGET_MULTIPLIER * atr;
// //     stoploss = lastClose - STOPLOSS_MULTIPLIER * atr;
// //   } else if (signal === 'SELL') {
// //     target = lastClose - TARGET_MULTIPLIER * atr;
// //     stoploss = lastClose + STOPLOSS_MULTIPLIER * atr;
// //   }

// //   return { signal, entry: lastClose, rsi, ema, macd, atr, target, stoploss, volume: lastVolume, volumeSMA };
// // }

// // function checkHit(price, trade) {
// //   if (!trade) return false;
// //   if (trade.signal === 'BUY') {
// //     if (price >= trade.target) return 'target';
// //     if (price <= trade.stoploss) return 'stoploss';
// //   } else {
// //     if (price <= trade.target) return 'target';
// //     if (price >= trade.stoploss) return 'stoploss';
// //   }
// //   return false;
// // }

// // // === MAIN LOOP ===
// // async function checkNextSymbol() {
// //   const symbol = SYMBOLS[currentSymbolIndex];
// //   currentSymbolIndex = (currentSymbolIndex + 1) % SYMBOLS.length;

// //   const candles = await fetchKlines(symbol, INTERVAL);
// //   const price = await fetchPrice(symbol);
// //   const result = analyze(candles);

// //   for (const chatId of USER_CHAT_IDS) {
// //     if (!activeTrades[chatId]) activeTrades[chatId] = {};

// //     const trade = activeTrades[chatId][symbol];
// //     if (trade) {
// //       const hit = checkHit(price, trade);
// //       if (hit) {
// //         await BOT.sendMessage(chatId, `✅ *${symbol}* का ${trade.signal} ट्रेड *${hit.toUpperCase()}* पर बंद हुआ\n💰 Price: ${price}`, { parse_mode: 'Markdown' });
// //         delete activeTrades[chatId][symbol];
// //       }
// //     } else {
// //       if (result.signal === 'HOLD') {
// //         await BOT.sendMessage(chatId, `⚠️ *${symbol}* अभी कोई सिग्नल नहीं: HOLD`, { parse_mode: 'Markdown' });
// //       } else {
// //         activeTrades[chatId][symbol] = {
// //           signal: result.signal,
// //           entry: result.entry,
// //           target: result.target,
// //           stoploss: result.stoploss,
// //         };

// //         const msg = `📈 *${symbol} (${INTERVAL})*\nSignal: *${result.signal}*\n💰 Price: ${price}\n🎯 Target: ${result.target.toFixed(2)}\n🛑 Stoploss: ${result.stoploss.toFixed(2)}\n\nRSI: ${result.rsi.toFixed(2)}\nEMA: ${result.ema.toFixed(2)}\nMACD: ${result.macd?.MACD?.toFixed(2)} / ${result.macd?.signal?.toFixed(2)}\nVolume: ${result.volume.toFixed(0)} / Avg: ${result.volumeSMA.toFixed(0)}`;
// //         await BOT.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
// //       }
// //     }
// //   }
// // }

// // // === TELEGRAM COMMANDS ===
// // BOT.onText(/\/start/, msg => {
// //   const chatId = msg.chat.id;
// //   if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);
// //   BOT.sendMessage(chatId, "✅ Bot चालू हो गया है। हर मिनट एक symbol चेक होगा और signal भेजेगा।");
// // });

// // BOT.onText(/\/status/, async msg => {
// //   const chatId = msg.chat.id;
// //   if (!activeTrades[chatId]) return BOT.sendMessage(chatId, "कोई एक्टिव ट्रेड नहीं है।");

// //   let text = "📊 Active Trades:\n\n";
// //   for (const [symbol, trade] of Object.entries(activeTrades[chatId])) {
// //     const current = await fetchPrice(symbol);
// //     text += `🪙 *${symbol}*\nType: ${trade.signal}\nEntry: ${trade.entry.toFixed(2)}\nNow: ${current.toFixed(2)}\n🎯 Target: ${trade.target.toFixed(2)}\n🛑 SL: ${trade.stoploss.toFixed(2)}\n\n`;
// //   }

// //   BOT.sendMessage(chatId, text, { parse_mode: 'Markdown' });
// // });

// // // === LOOP START ===
// // setInterval(checkNextSymbol, 60 * 1000); // Check 1 symbol per minute
// // console.log('✅ Crypto Signal Bot Started');

















// require('dotenv').config();
// const axios = require('axios');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, ATR, SMA } = require('technicalindicators');

// // CONFIG
// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
// const INTERVAL = '15m';
// const BOT = new TelegramBot("7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY" || 'YOUR_BOT_TOKEN', { polling: true });
// const USER_CHAT_IDS = [];
// const activeTrades = {};

// const TARGET_MULTIPLIER = 1.5;
// const STOPLOSS_MULTIPLIER = 1.0;
// const VOLUME_SMA_PERIOD = 20;

// // === API FUNCTIONS ===
// async function fetchKlines(symbol, interval, limit = 100) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0], open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[5],
//   }));
// }

// async function fetchPrice(symbol) {
//   const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
//   return +res.data.price;
// }

// function analyze(candles) {
//   const close = candles.map(c => c.close);
//   const high = candles.map(c => c.high);
//   const low = candles.map(c => c.low);
//   const volume = candles.map(c => c.volume);

//   const rsi = RSI.calculate({ values: close, period: 14 }).at(-1);
//   const ema = EMA.calculate({ values: close, period: 14 }).at(-1);
//   const macd = MACD.calculate({
//     values: close,
//     fastPeriod: 12,
//     slowPeriod: 26,
//     signalPeriod: 9,
//     SimpleMAOscillator: false,
//     SimpleMASignal: false,
//   }).at(-1);
//   const atr = ATR.calculate({ high, low, close, period: 14 }).at(-1);
//   const volumeSMA = SMA.calculate({ values: volume, period: VOLUME_SMA_PERIOD }).at(-1);
//   const lastClose = close.at(-1);
//   const lastVolume = volume.at(-1);

//   let signal = 'HOLD';
//   const volumeOkay = lastVolume > 0.8 * volumeSMA;

//   if (volumeOkay && lastClose > ema && macd?.MACD > macd?.signal && rsi > 45) signal = 'BUY';
//   else if (volumeOkay && lastClose < ema && macd?.MACD < macd?.signal && rsi < 55) signal = 'SELL';

//   let target = null, stoploss = null;
//   if (signal === 'BUY') {
//     target = lastClose + TARGET_MULTIPLIER * atr;
//     stoploss = lastClose - STOPLOSS_MULTIPLIER * atr;
//   } else if (signal === 'SELL') {
//     target = lastClose - TARGET_MULTIPLIER * atr;
//     stoploss = lastClose + STOPLOSS_MULTIPLIER * atr;
//   }

//   return { signal, entry: lastClose, rsi, ema, macd, atr, target, stoploss, volume: lastVolume, volumeSMA };
// }

// function checkHit(price, trade) {
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

// // === MAIN CHECK FUNCTION ===
// async function checkSignals() {
//   for (const symbol of SYMBOLS) {
//     const candles = await fetchKlines(symbol, INTERVAL);
//     const price = await fetchPrice(symbol);

//     for (const chatId of USER_CHAT_IDS) {
//       if (!activeTrades[chatId]) activeTrades[chatId] = {};
//       const trade = activeTrades[chatId][symbol];

//       if (trade) {
//         const hit = checkHit(price, trade);
//         if (hit) {
//           await BOT.sendMessage(chatId, `✅ *${symbol}* का ${trade.signal} ट्रेड *${hit.toUpperCase()}* पर बंद हुआ\n💰 Price: ${price}`, { parse_mode: 'Markdown' });
//           delete activeTrades[chatId][symbol];
//         }
//       } else {
//         const result = analyze(candles);

//         if (result.signal === 'HOLD') {
//           await BOT.sendMessage(chatId, `⚠️ *${symbol}* अभी कोई सिग्नल नहीं: HOLD`, { parse_mode: 'Markdown' });
//           continue;
//         }

//         activeTrades[chatId][symbol] = {
//           signal: result.signal,
//           entry: result.entry,
//           target: result.target,
//           stoploss: result.stoploss,
//         };

//         const msg = `📈 *${symbol} (${INTERVAL})*\nSignal: *${result.signal}*\n💰 Price: ${price}\n🎯 Target: ${result.target.toFixed(2)}\n🛑 Stoploss: ${result.stoploss.toFixed(2)}\n\nRSI: ${result.rsi.toFixed(2)}\nEMA: ${result.ema.toFixed(2)}\nMACD: ${result.macd?.MACD?.toFixed(2)} / ${result.macd?.signal?.toFixed(2)}\nVolume: ${result.volume.toFixed(0)} / Avg: ${result.volumeSMA.toFixed(0)}`;
//         await BOT.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
//       }
//     }
//   }
// }

// // === TELEGRAM COMMANDS ===
// BOT.onText(/\/start/, msg => {
//   const chatId = msg.chat.id;
//   if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);

//   BOT.sendMessage(chatId, "✅ Bot चालू हो गया है। हर मिनट signal check होगा।", {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: "📊 स्टेटस देखें", callback_data: 'check_status' }]
//       ]
//     }
//   });
// });

// // CALLBACK HANDLER FOR INLINE BUTTON
// BOT.on('callback_query', async query => {
//   const chatId = query.message.chat.id;
//   const data = query.data;

//   if (data === 'check_status') {
//     if (!activeTrades[chatId] || Object.keys(activeTrades[chatId]).length === 0) {
//       return BOT.sendMessage(chatId, "❌ कोई एक्टिव ट्रेड नहीं है।");
//     }

//     let text = "📊 Active Trades:\n\n";
//     for (const [symbol, trade] of Object.entries(activeTrades[chatId])) {
//       const current = await fetchPrice(symbol);
//       text += `🪙 *${symbol}*\nType: ${trade.signal}\nEntry: ${trade.entry.toFixed(2)}\nNow: ${current.toFixed(2)}\n🎯 Target: ${trade.target.toFixed(2)}\n🛑 SL: ${trade.stoploss.toFixed(2)}\n\n`;
//     }

//     BOT.sendMessage(chatId, text, { parse_mode: 'Markdown' });
//   }
// });

// // LOOP
// setInterval(checkSignals, 60 * 1000);
// console.log('✅ Crypto Signal Bot running...');
