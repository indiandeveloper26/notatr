// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');
// const TelegramBot = require('node-telegram-bot-api');

// // ===== CONFIGURATION =====
// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['5m', '15m', '30m'];
// const SMA_PERIOD = 200;
// const TRAILING_STOP_PERCENT = 0.005; // 0.5%
// const TELEGRAM_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE'
// const CHAT_ID = 5918728195// Replace with your own Telegram chat/user ID

// const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
// let positions = {}; // Open trades

// // ====== FUNCTIONS ======
// async function sendMessage(msg) {
//   await bot.sendMessage(CHAT_ID, msg);
// }

// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// function allTimeframesBullish(price, smaMap) {
//   return INTERVALS.every(interval => price > smaMap[interval]);
// }

// function allTimeframesBearish(price, smaMap) {
//   return INTERVALS.every(interval => price < smaMap[interval]);
// }

// async function checkSymbol(symbol) {
//   const candlesMap = {};
//   const smaMap = {};

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);
//     candlesMap[interval] = candles;
//     smaMap[interval] = sma[sma.length - 1];
//   }
//   await sendMessage(`🤖 Crypto Signal Bot Started\nMonitoring ${SYMBOLS.length} symbols every 1 minute.`);


//   const latestPrice = candlesMap['5m'].slice(-1)[0].close;

//   // BUY
//   if (!positions[symbol] && allTimeframesBullish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 - TRAILING_STOP_PERCENT),
//       side: 'BUY'
//     };
//     await sendMessage(`[BUY] ${symbol} @ ${latestPrice.toFixed(2)}`);
//   }

//   // SELL
//   else if (!positions[symbol] && allTimeframesBearish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 + TRAILING_STOP_PERCENT),
//       side: 'SELL'
//     };
//     await sendMessage(`[SELL] ${symbol} @ ${latestPrice.toFixed(2)}`);
//   }

//   // Manage BUY
//   else if (positions[symbol]?.side === 'BUY') {
//     if (latestPrice > positions[symbol].entry) {
//       const newStop = latestPrice * (1 - TRAILING_STOP_PERCENT);
//       if (newStop > positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice < positions[symbol].trailingStop) {
//       await sendMessage(`[EXIT BUY] ${symbol} @ ${latestPrice.toFixed(2)}`);
//       delete positions[symbol];
//     }
//   }

//   // Manage SELL
//   else if (positions[symbol]?.side === 'SELL') {
//     if (latestPrice < positions[symbol].entry) {
//       const newStop = latestPrice * (1 + TRAILING_STOP_PERCENT);
//       if (newStop < positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice > positions[symbol].trailingStop) {
//       await sendMessage(`[EXIT SELL] ${symbol} @ ${latestPrice.toFixed(2)}`);
//       delete positions[symbol];
//     }
//   }
// }

// async function runBot() {
//   const now = new Date().toLocaleString();
//   console.log(`[${now}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbol(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//       await sendMessage(`❌ Error with ${symbol}: ${err.message}`);
//     }
//   }
//   console.log('---');
// }

// // Run every 5 minutes
// setInterval(runBot,  60 * 1000);














// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');
// const TelegramBot = require('node-telegram-bot-api');

// // ===== CONFIGURATION =====
// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['5m', '15m', '30m'];
// const SMA_PERIOD = 200;
// const TRAILING_STOP_PERCENT = 0.005; // 0.5%
// const TELEGRAM_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
// const CHAT_ID = 5918728195;

// const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
// let positions = {}; // Open trades

// // ====== FUNCTIONS ======
// async function sendMessage(msg) {
//   await bot.sendMessage(CHAT_ID, msg);
// }

// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// function allTimeframesBullish(price, smaMap) {
//   return INTERVALS.every(interval => price > smaMap[interval]);
// }

// function allTimeframesBearish(price, smaMap) {
//   return INTERVALS.every(interval => price < smaMap[interval]);
// }

// async function checkSymbol(symbol) {
//   const candlesMap = {};
//   const smaMap = {};

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);
//     candlesMap[interval] = candles;
//     smaMap[interval] = sma[sma.length - 1];
//   }

//   const latestPrice = candlesMap['5m'].slice(-1)[0].close;

//   // BUY
//   if (!positions[symbol] && allTimeframesBullish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 - TRAILING_STOP_PERCENT),
//       side: 'BUY'
//     };
//     await sendMessage(`[BUY] ${symbol} @ ${latestPrice.toFixed(2)}`);
//   }

//   // SELL
//   else if (!positions[symbol] && allTimeframesBearish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 + TRAILING_STOP_PERCENT),
//       side: 'SELL'
//     };
//     await sendMessage(`[SELL] ${symbol} @ ${latestPrice.toFixed(2)}`);
//   }

//   // Manage BUY
//   else if (positions[symbol]?.side === 'BUY') {
//     if (latestPrice > positions[symbol].entry) {
//       const newStop = latestPrice * (1 - TRAILING_STOP_PERCENT);
//       if (newStop > positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice < positions[symbol].trailingStop) {
//       await sendMessage(`[EXIT BUY] ${symbol} @ ${latestPrice.toFixed(2)}`);
//       delete positions[symbol];
//     }
//   }

//   // Manage SELL
//   else if (positions[symbol]?.side === 'SELL') {
//     if (latestPrice < positions[symbol].entry) {
//       const newStop = latestPrice * (1 + TRAILING_STOP_PERCENT);
//       if (newStop < positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice > positions[symbol].trailingStop) {
//       await sendMessage(`[EXIT SELL] ${symbol} @ ${latestPrice.toFixed(2)}`);
//       delete positions[symbol];
//     }
//   }
// }

// async function runBot() {
//   const now = new Date().toLocaleString();
//   console.log(`[${now}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbol(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//       await sendMessage(`❌ Error with ${symbol}: ${err.message}`);
//     }
//   }
//   console.log('---');
// }

// // ===== STARTUP & INTERVAL LOGIC =====
// (async () => {
//   await sendMessage(`🤖 Crypto Signal Bot Started\nMonitoring ${SYMBOLS.length} symbols every 1 minute.`);
//   await runBot(); // Run immediately on start
//   setInterval(runBot, 60 * 1000); // Run every 1 minute
// })();


// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h'];

// const SMA_PERIOD = 200;
// const TRAILING_STOP_PERCENT = 0.005; // 0.5%
// const TARGET_PERCENT = 0.01;         // 1% target
// const STOPLOSS_PERCENT = 0.005;      // 0.5% stoploss

// // Telegram bot config - अपनी details यहाँ भरो
// const TELEGRAM_BOT_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE'
// const TELEGRAM_CHAT_ID = 5918728195

// let positions = {};

// async function sendTelegramMessage(message) {
//   const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
//   try {
//     await axios.post(url, {
//       chat_id: TELEGRAM_CHAT_ID,
//       text: message,
//       parse_mode: 'Markdown'
//     });
//   } catch (error) {
//     console.error('Telegram Error:', error.message);
//   }
// }

// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// function allTimeframesBullish(price, smaMap) {
//   return INTERVALS.every(interval => price > smaMap[interval]);
// }

// function allTimeframesBearish(price, smaMap) {
//   return INTERVALS.every(interval => price < smaMap[interval]);
// }

// async function checkSymbol(symbol) {
//   const candlesMap = {};
//   const smaMap = {};

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);
//     if (!sma.length) return; // अगर candles कम हैं तो skip करो
//     candlesMap[interval] = candles;
//     smaMap[interval] = sma[sma.length - 1];
//   }

//   const latestPrice = candlesMap['1m'].slice(-1)[0].close;

//   // BUY condition
//   if (!positions[symbol] && allTimeframesBullish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       target: latestPrice * (1 + TARGET_PERCENT),
//       stoploss: latestPrice * (1 - STOPLOSS_PERCENT),
//       trailingStop: latestPrice * (1 - TRAILING_STOP_PERCENT),
//       side: 'BUY'
//     };
//     const msg = `*${symbol} Signal: BUY*\n💰 Entry: ${latestPrice.toFixed(2)}\n🎯 Target: ${positions[symbol].target.toFixed(2)}\n🛑 Stoploss: ${positions[symbol].stoploss.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//   }

//   // SELL condition
//   else if (!positions[symbol] && allTimeframesBearish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       target: latestPrice * (1 - TARGET_PERCENT),
//       stoploss: latestPrice * (1 + STOPLOSS_PERCENT),
//       trailingStop: latestPrice * (1 + TRAILING_STOP_PERCENT),
//       side: 'SELL'
//     };
//     const msg = `*${symbol} Signal: SELL*\n💰 Entry: ${latestPrice.toFixed(2)}\n🎯 Target: ${positions[symbol].target.toFixed(2)}\n🛑 Stoploss: ${positions[symbol].stoploss.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//   }

//   // Manage open BUY position
//   else if (positions[symbol]?.side === 'BUY') {
//     if (latestPrice > positions[symbol].entry) {
//       const newStop = latestPrice * (1 - TRAILING_STOP_PERCENT);
//       if (newStop > positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice < positions[symbol].trailingStop) {
//       const msg = `*${symbol} Exit BUY*\n🚪 Exit Price: ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await sendTelegramMessage(msg);
//       delete positions[symbol];
//     }
//   }

//   // Manage open SELL position
//   else if (positions[symbol]?.side === 'SELL') {
//     if (latestPrice < positions[symbol].entry) {
//       const newStop = latestPrice * (1 + TRAILING_STOP_PERCENT);
//       if (newStop < positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice > positions[symbol].trailingStop) {
//       const msg = `*${symbol} Exit SELL*\n🚪 Exit Price: ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await sendTelegramMessage(msg);
//       delete positions[symbol];
//     }
//   }
// }

// async function runBot() {
//   console.log(`[${new Date().toLocaleTimeString()}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbol(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//     }
//   }
//   console.log('---');
// }

// // हर 5 मिनट में bot चलाओ
// setInterval(runBot,  60 * 1000);

// // टेस्ट के लिए तुरंत भी चला सकते हो
// runBot();












// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVAL = '1m'; // सिर्फ 1m interval पर SMA 200 cross देखेंगे

// const SMA_PERIOD = 200;

// // Telegram bot config - अपनी details यहाँ भरो
// const TELEGRAM_BOT_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
// const TELEGRAM_CHAT_ID = 5918728195;

// let positions = {}; // current open positions (BUY/SELL)

// // Telegram message भेजने वाला function
// async function sendTelegramMessage(message) {
//   const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
//   try {
//     await axios.post(url, {
//       chat_id: TELEGRAM_CHAT_ID,
//       text: message,
//       parse_mode: 'Markdown'
//     });
//   } catch (error) {
//     console.error('Telegram Error:', error.message);
//   }
// }

// // Binance से candle data fetch करने वाला function
// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// // SMA 200 calculate करने वाला function
// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// // SMA 200 cross detection और signal logic
// async function checkSymbol(symbol) {
//   const candles = await fetchCandles(symbol, INTERVAL);
//   const closes = candles.map(c => c.close);
//   const sma = calculateSMA200(closes);

//   if (sma.length < 2) {
//     console.log(`${symbol}: Not enough data to calculate SMA200`);
//     return;
//   }

//   const lastIndex = candles.length - 1;
//   const prevClose = closes[lastIndex - 1];
//   const prevSMA = sma[sma.length - 2];
//   const latestClose = closes[lastIndex];
//   const latestSMA = sma[sma.length - 1];

//   // Upward crossover (Price crosses above SMA)
//   if (prevClose < prevSMA && latestClose > latestSMA && !positions[symbol]) {
//     positions[symbol] = {
//       entry: latestClose,
//       side: 'BUY',
//     };
//     const msg = `*${symbol} Signal: BUY*\nPrice crossed above SMA 200\nEntry: ${latestClose.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//     return;
//   }

//   // Downward crossover (Price crosses below SMA)
//   if (prevClose > prevSMA && latestClose < latestSMA && !positions[symbol]) {
//     positions[symbol] = {
//       entry: latestClose,
//       side: 'SELL',
//     };
//     const msg = `*${symbol} Signal: SELL*\nPrice crossed below SMA 200\nEntry: ${latestClose.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//     return;
//   }

//   // आप चाहें तो यहाँ से exit logic भी add कर सकते हैं (optional)
// }

// // Bot चलाने वाला main function
// async function runBot() {
//   console.log(`[${new Date().toLocaleTimeString()}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbol(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//     }
//   }
//   console.log('---');
// }

// // हर 1 मिनट में bot चलाओ
// setInterval(runBot, 60 * 1000);

// // अभी तुरंत भी bot चलाओ
// runBot();
















// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h']; // "60m" => "1h"
//  // MTF timeframes
// const SMA_PERIOD = 200;

// const TELEGRAM_BOT_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
// const TELEGRAM_CHAT_ID = 5918728195;

// let positions = {}; // open positions store करने के लिए

// // Telegram message भेजने वाला function
// async function sendTelegramMessage(message) {
//   const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
//   try {
//     await axios.post(url, {
//       chat_id: TELEGRAM_CHAT_ID,
//       text: message,
//       parse_mode: 'Markdown',
//     });
//   } catch (error) {
//     console.error('Telegram Error:', error.message);
//   }
// }

// // Binance से candle data fetch करने वाला function
// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// // SMA 200 calculate करने वाला function
// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// // Multi-Timeframe SMA200 crossover check करने वाला function
// async function checkSymbolMTF(symbol) {
//   let signals = [];

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);

//     if (sma.length < 2) {
//       console.log(`${symbol} ${interval}: Not enough data for SMA`);
//       signals.push({ interval, signal: 'NONE' });
//       continue;
//     }

//     const lastIndex = candles.length - 1;
//     const prevClose = closes[lastIndex - 1];
//     const prevSMA = sma[sma.length - 2];
//     const latestClose = closes[lastIndex];
//     const latestSMA = sma[sma.length - 1];

//     if (prevClose < prevSMA && latestClose > latestSMA) {
//       signals.push({ interval, signal: 'BUY' });
//     } else if (prevClose > prevSMA && latestClose < latestSMA) {
//       signals.push({ interval, signal: 'SELL' });
//     } else {
//       signals.push({ interval, signal: 'NONE' });
//     }
//   }

//   const buyCount = signals.filter(s => s.signal === 'BUY').length;
//   const sellCount = signals.filter(s => s.signal === 'SELL').length;

//   // Buy signal अगर कम से कम 2 टाइमफ्रेम में हो और position open ना हो
//   if (buyCount >= 2 && !positions[symbol]) {
//     const candles1m = await fetchCandles(symbol, '1m');
//     const latestClose = candles1m[candles1m.length - 1].close;

//     positions[symbol] = {
//       entry: latestClose,
//       side: 'BUY',
//     };

//     const msg = `*${symbol} Signal: BUY*\nConfirmed on multiple timeframes\nEntry: ${latestClose.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//     return;
//   }

//   // Sell signal अगर कम से कम 2 टाइमफ्रेम में हो और position open ना हो
//   if (sellCount >= 2 && !positions[symbol]) {
//     const candles1m = await fetchCandles(symbol, '1m');
//     const latestClose = candles1m[candles1m.length - 1].close;

//     positions[symbol] = {
//       entry: latestClose,
//       side: 'SELL',
//     };

//     const msg = `*${symbol} Signal: SELL*\nConfirmed on multiple timeframes\nEntry: ${latestClose.toFixed(2)}`;
//     console.log(msg);
//     await sendTelegramMessage(msg);
//     return;
//   }

//   console.log(`${symbol}: No clear multi-timeframe signal`);
// }

// // Bot चलाने वाला main function
// async function runBot() {
//   console.log(`[${new Date().toLocaleTimeString()}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbolMTF(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//     }
//   }
//   console.log('---');
// }

// // हर 1 मिनट में bot चलाओ
// setInterval(runBot, 60 * 1000);

// // अभी तुरंत भी bot चलाओ
// runBot();





// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');
// const TelegramBot = require('node-telegram-bot-api');

// const TELEGRAM_BOT_TOKEN =  '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
// const CHAT_ID = 5918728195; // Apne Telegram user ID ya group ID yahan daalein

// const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['5m', '15m', '30m'];
// const SMA_PERIOD = 200;
// const TRAILING_STOP_PERCENT = 0.005; // 0.5%

// let positions = {}; // Open positions tracking
// let currentIndex = 0;  // Track current symbol index for checking

// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// function allTimeframesBullish(price, smaMap) {
//   return INTERVALS.every(interval => price > smaMap[interval]);
// }

// function allTimeframesBearish(price, smaMap) {
//   return INTERVALS.every(interval => price < smaMap[interval]);
// }

// async function checkSymbol(symbol) {
//   const candlesMap = {};
//   const smaMap = {};

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);
//     candlesMap[interval] = candles;
//     smaMap[interval] = sma[sma.length - 1];
//   }

//   const latestPrice = candlesMap['5m'].slice(-1)[0].close;

//   // Buy condition
//   if (!positions[symbol] && allTimeframesBullish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 - TRAILING_STOP_PERCENT),
//       side: 'BUY'
//     };
//     const msg = `🚀 [BUY] ${symbol} @ ${latestPrice.toFixed(2)}`;
//     console.log(msg);
//     await bot.sendMessage(CHAT_ID, msg);
//   }

//   // Sell condition
//   else if (!positions[symbol] && allTimeframesBearish(latestPrice, smaMap)) {
//     positions[symbol] = {
//       entry: latestPrice,
//       trailingStop: latestPrice * (1 + TRAILING_STOP_PERCENT),
//       side: 'SELL'
//     };
//     const msg = `🔻 [SELL] ${symbol} @ ${latestPrice.toFixed(2)}`;
//     console.log(msg);
//     await bot.sendMessage(CHAT_ID, msg);
//   }

//   // Manage open BUY position with trailing stop
//   else if (positions[symbol]?.side === 'BUY') {
//     if (latestPrice > positions[symbol].entry) {
//       const newStop = latestPrice * (1 - TRAILING_STOP_PERCENT);
//       if (newStop > positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice < positions[symbol].trailingStop) {
//       const msg = `⚠️ [EXIT BUY] ${symbol} @ ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await bot.sendMessage(CHAT_ID, msg);
//       delete positions[symbol];
//     }
//   }

//   // Manage open SELL position with trailing stop
//   else if (positions[symbol]?.side === 'SELL') {
//     if (latestPrice < positions[symbol].entry) {
//       const newStop = latestPrice * (1 + TRAILING_STOP_PERCENT);
//       if (newStop < positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice > positions[symbol].trailingStop) {
//       const msg = `⚠️ [EXIT SELL] ${symbol} @ ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await bot.sendMessage(CHAT_ID, msg);
//       delete positions[symbol];
//     }
//   }
// }

// async function runBot() {
//   console.log(`[${new Date().toLocaleTimeString()}] Checking symbol...`);

//   const symbol = SYMBOLS[currentIndex];
//   try {
//     await checkSymbol(symbol);
//   } catch (err) {
//     console.error(`Error with ${symbol}:`, err.message);
//     await bot.sendMessage(CHAT_ID, `❗ Error with ${symbol}: ${err.message}`);
//   }

//   currentIndex = (currentIndex + 1) % SYMBOLS.length;  // next symbol index (circular)
//   console.log('---');
// }

// runBot();
// setInterval(runBot, 60 * 1000);  // 1 minute interval



















// const axios = require('axios');
// const technicalIndicators = require('technicalindicators');
// const TelegramBot = require('node-telegram-bot-api');

// const TELEGRAM_BOT_TOKEN = '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
// const CHAT_ID = 5918728195; // Apne Telegram user ID ya group ID yahan daalein

// const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
// const INTERVALS = ['5m', '15m', '30m'];
// const SMA_PERIOD = 200;
// const TRAILING_STOP_PERCENT = 0.005; // 0.5%

// let positions = {}; // Open positions tracking

// async function fetchCandles(symbol, interval, limit = 250) {
//   const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//   const res = await axios.get(url);
//   return res.data.map(c => ({
//     time: c[0],
//     open: parseFloat(c[1]),
//     high: parseFloat(c[2]),
//     low: parseFloat(c[3]),
//     close: parseFloat(c[4]),
//   }));
// }

// function calculateSMA200(closes) {
//   return technicalIndicators.SMA.calculate({ period: SMA_PERIOD, values: closes });
// }

// function allTimeframesBullish(price, smaMap) {
//   return INTERVALS.every(interval => price > smaMap[interval]);
// }

// function allTimeframesBearish(price, smaMap) {
//   return INTERVALS.every(interval => price < smaMap[interval]);
// }

// async function checkSymbol(symbol) {
//   const candlesMap = {};
//   const smaMap = {};

//   for (const interval of INTERVALS) {
//     const candles = await fetchCandles(symbol, interval);
//     const closes = candles.map(c => c.close);
//     const sma = calculateSMA200(closes);
//     candlesMap[interval] = candles;
//     smaMap[interval] = sma[sma.length - 1];
//   }

//   const latestPrice = candlesMap['5m'].slice(-1)[0].close;

//   // Buy condition
//   if (!positions[symbol] && allTimeframesBullish(latestPrice, smaMap)) {
//     const entry = latestPrice;
//     const target = entry * 0.994;     // 0.6% niche target
//     const stoploss = entry * 1.005;   // 0.5% upar stoploss
//     positions[symbol] = {
//       entry,
//       trailingStop: entry * (1 - TRAILING_STOP_PERCENT),
//       side: 'BUY',
//       target,
//       stoploss
//     };
//     const msg = `🚀 [BUY] ${symbol}\nEntry: ${entry.toFixed(2)}\n🎯 Target: ${target.toFixed(2)}\n🛑 Stoploss: ${stoploss.toFixed(2)}`;
//     console.log(msg);
//     await bot.sendMessage(CHAT_ID, msg);
//   }

//   // Sell condition
//   else if (!positions[symbol] && allTimeframesBearish(latestPrice, smaMap)) {
//     const entry = latestPrice;
//     const target = entry * 1.006;     // 0.6% upar target
//     const stoploss = entry * 0.995;   // 0.5% niche stoploss
//     positions[symbol] = {
//       entry,
//       trailingStop: entry * (1 + TRAILING_STOP_PERCENT),
//       side: 'SELL',
//       target,
//       stoploss
//     };
//     const msg = `🔻 [SELL] ${symbol}\nEntry: ${entry.toFixed(2)}\n🎯 Target: ${target.toFixed(2)}\n🛑 Stoploss: ${stoploss.toFixed(2)}`;
//     console.log(msg);
//     await bot.sendMessage(CHAT_ID, msg);
//   }

//   // Manage open BUY position with trailing stop
//   else if (positions[symbol]?.side === 'BUY') {
//     if (latestPrice > positions[symbol].entry) {
//       const newStop = latestPrice * (1 - TRAILING_STOP_PERCENT);
//       if (newStop > positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice < positions[symbol].trailingStop) {
//       const msg = `⚠️ [EXIT BUY] ${symbol} @ ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await bot.sendMessage(CHAT_ID, msg);
//       delete positions[symbol];
//     }
//   }

//   // Manage open SELL position with trailing stop
//   else if (positions[symbol]?.side === 'SELL') {
//     if (latestPrice < positions[symbol].entry) {
//       const newStop = latestPrice * (1 + TRAILING_STOP_PERCENT);
//       if (newStop < positions[symbol].trailingStop) {
//         positions[symbol].trailingStop = newStop;
//       }
//     }
//     if (latestPrice > positions[symbol].trailingStop) {
//       const msg = `⚠️ [EXIT SELL] ${symbol} @ ${latestPrice.toFixed(2)}`;
//       console.log(msg);
//       await bot.sendMessage(CHAT_ID, msg);
//       delete positions[symbol];
//     }
//   }
// }

// async function runBot() {
//   console.log(`[${new Date().toLocaleTimeString()}] Checking symbols...`);
//   for (const symbol of SYMBOLS) {
//     try {
//       await checkSymbol(symbol);
//     } catch (err) {
//       console.error(`Error with ${symbol}:`, err.message);
//       await bot.sendMessage(CHAT_ID, `❗ Error with ${symbol}: ${err.message}`);
//     }
//   }
//   console.log('---');
// }

// runBot();
// setInterval(runBot, 60 * 1000); // 1 minute interval









const axios = require('axios');
const technicalIndicators = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // <<=== APNA TOKEN YAHAN DAALEIN
const CHAT_ID = 'YOUR_CHAT_ID'; // <<=== APNA CHAT ID YAHAN DAALEIN (number, not string for single user)

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const INTERVALS_FOR_MTF_CONFIRMATION = ['5m', '15m', '30m']; // Timeframes for overall trend confirmation
const PRIMARY_SIGNAL_INTERVAL = '5m'; // Timeframe for EMA/SMA crossover signal
const MA_PERIOD = 200; // Period for both SMA and EMA
const TRAILING_STOP_PERCENT = 0.005; // 0.5%
const TARGET_PERCENT_BUY = 0.006; // 0.6% target for buy
const STOPLOSS_PERCENT_BUY = 0.005; // 0.5% stoploss for buy
const TARGET_PERCENT_SELL = 0.006; // 0.6% target for sell
const STOPLOSS_PERCENT_SELL = 0.005; // 0.5% stoploss for sell

let positions = {}; // Open positions tracking

async function fetchCandles(symbol, interval, limit = MA_PERIOD + 50) { // Need MA_PERIOD + 1 candles for 1 MA value, +1 for prev MA, + buffer
  const url =`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  console.log`(Fetching ${limit} candles for ${symbol} on ${interval})`
  const res = await axios.get(url);
  return res.data.map(c => ({
    time: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
  }));
}

function calculateMA(indicatorType, closes, period) {
  if (closes.length < period) {
    return []; // Not enough data
  }
  if (indicatorType === 'SMA') {
    return technicalIndicators.SMA.calculate({ period: period, values: closes });
  } else if (indicatorType === 'EMA') {
    return technicalIndicators.EMA.calculate({ period: period, values: closes });
  }
  return [];
}

// For MTF Confirmation
function allTimeframesBullish(price, smaMap) {
  if (Object.keys(smaMap).length !== INTERVALS_FOR_MTF_CONFIRMATION.length) return false; // Ensure all data is present
  return INTERVALS_FOR_MTF_CONFIRMATION.every(interval => smaMap[interval] && price > smaMap[interval]);
}

function allTimeframesBearish(price, smaMap) {
  if (Object.keys(smaMap).length !== INTERVALS_FOR_MTF_CONFIRMATION.length) return false; // Ensure all data is present
  return INTERVALS_FOR_MTF_CONFIRMATION.every(interval => smaMap[interval] && price < smaMap[interval]);
}

async function checkSymbol(symbol) {
  console.log`(\n[${new Date().toLocaleTimeString()}] Checking symbol: ${symbol})`
  const mtfSmaMap = {}; // For MTF confirmation

  // 1. Calculate SMAs for MTF confirmation
  for (const interval of INTERVALS_FOR_MTF_CONFIRMATION) {
    try {
      const candles = await fetchCandles(symbol, interval);
      if (candles.length > MA_PERIOD) {
        const closes = candles.map(c => c.close);
        const smaSeries = calculateMA('SMA', closes, MA_PERIOD);
        if (smaSeries.length > 0) {
          mtfSmaMap[interval] = smaSeries[smaSeries.length - 1];
        } else {
            console.log`([${symbol}-${interval}] Not enough SMA data for MTF.)`
        }
      } else {
        console.log`([${symbol}-${interval}] Not enough candle data for MTF SMA.)`
      }
    } catch (err) {
      console.error`(Error fetching/calculating MTF SMA for ${symbol} on ${interval}:, err.message)`
      // Optionally send Telegram error for this specific interval
      // await bot.sendMessage(CHAT_ID, ❗️ Error with ${symbol} (${interval}) MTF: ${err.message.substring(0,100)});
      return; // Skip this symbol if critical data is missing
    }
  }

  // 2. Calculate EMA & SMA for Primary Signal Interval for Crossover

let primaryCandles, primaryCloses, currentPrice;
  try {
    primaryCandles = await fetchCandles(symbol, PRIMARY_SIGNAL_INTERVAL);
    if (primaryCandles.length <= MA_PERIOD + 1) { // Need at least MA_PERIOD + 2 candles for current and previous MA
      console.log`([${symbol}-${PRIMARY_SIGNAL_INTERVAL}] Not enough candle data for crossover check.)`
      return;
    }
    primaryCloses = primaryCandles.map(c => c.close);
    currentPrice = primaryCloses[primaryCloses.length - 1];
  } catch (err) {
      console.error`(Error fetching primary candles for ${symbol} on ${PRIMARY_SIGNAL_INTERVAL}:, err.message)`
      await bot.sendMessage`(CHAT_ID, ❗️ Error with ${symbol} (${PRIMARY_SIGNAL_INTERVAL}) primary data: ${err.message.substring(0,100)})`
      return;
  }

  const smaSeriesPrimary = calculateMA('SMA', primaryCloses, MA_PERIOD);
  const emaSeriesPrimary = calculateMA('EMA', primaryCloses, MA_PERIOD);

  if (smaSeriesPrimary.length < 2 || emaSeriesPrimary.length < 2) {
    console.log`([${symbol}-${PRIMARY_SIGNAL_INTERVAL}] Not enough MA values for crossover check (SMA length: ${smaSeriesPrimary.length}, EMA length: ${emaSeriesPrimary.length}).)`
    return;
  }

  const currentSMA = smaSeriesPrimary[smaSeriesPrimary.length - 1];
  const prevSMA = smaSeriesPrimary[smaSeriesPrimary.length - 2];
  const currentEMA = emaSeriesPrimary[emaSeriesPrimary.length - 1];
  const prevEMA = emaSeriesPrimary[emaSeriesPrimary.length - 2];

  console.log`([${symbol}-${PRIMARY_SIGNAL_INTERVAL}] Price: ${currentPrice.toFixed(4)}, EMA: ${currentEMA.toFixed(4)} (Prev: ${prevEMA.toFixed(4)}), SMA: ${currentSMA.toFixed(4)} (Prev: ${prevSMA.toFixed(4)}))`

  // Crossover Logic
  // Buy Crossover: EMA was below SMA, now EMA is above SMA (White crosses above Yellow)
  const bullishCrossover = prevEMA < prevSMA && currentEMA > currentSMA;
  // Sell Crossover: EMA was above SMA, now EMA is below SMA (Yellow crosses above White)
  const bearishCrossover = prevEMA > prevSMA && currentEMA < currentSMA;

  const isMtfBullish = allTimeframesBullish(currentPrice, mtfSmaMap);
  const isMtfBearish = allTimeframesBearish(currentPrice, mtfSmaMap);

  console.log`([${symbol}] Bullish Crossover: ${bullishCrossover}, MTF Bullish: ${isMtfBullish})`
  console.log`([${symbol}] Bearish Crossover: ${bearishCrossover}, MTF Bearish: ${isMtfBearish})`


  // Buy condition: Bullish Crossover AND MTF Confirmation
  if (!positions[symbol] && bullishCrossover && isMtfBullish) {
    const entry = currentPrice;
    const target = entry * (1 + TARGET_PERCENT_BUY);
    const stoploss = entry * (1 - STOPLOSS_PERCENT_BUY);
    positions[symbol] = {
      entry,
      trailingStop: entry * (1 - TRAILING_STOP_PERCENT), // Initial trailing stop for buy
      side: 'BUY',
      target,
      stoploss
    };
    const msg = `🚀 [BUY] ${symbol} @ ${PRIMARY_SIGNAL_INTERVAL}\nEntry: ${entry.toFixed(4)}\n🎯 Target: ${target.toFixed(4)}\n🛑 Stoploss: ${stoploss.toFixed(4)}\n(EMA ${currentEMA.toFixed(4)} > SMA ${currentSMA.toFixed(4)})`
    console.log(msg);
    await bot.sendMessage(CHAT_ID, msg);
  }
  // Sell condition: Bearish Crossover AND MTF Confirmation
  else if (!positions[symbol] && bearishCrossover && isMtfBearish) {
    const entry = currentPrice;
    const target = entry * (1 - TARGET_PERCENT_SELL);
    const stoploss = entry * (1 + STOPLOSS_PERCENT_SELL);
    positions[symbol] = {
      entry,
      trailingStop: entry * (1 + TRAILING_STOP_PERCENT), // Initial trailing stop for sell
      side: 'SELL',
      target,
      stoploss
    };
    const msg = `🔻 [SELL] ${symbol} @ ${PRIMARY_SIGNAL_INTERVAL}\nEntry: ${entry.toFixed(4)}\n🎯 Target: ${target.toFixed(4)}\n🛑 Stoploss: ${stoploss.toFixed(4)}\n(EMA ${currentEMA.toFixed(4)} < SMA ${currentSMA.toFixed(4)})`
    console.log(msg);


await bot.sendMessage(CHAT_ID, msg);
  }
  // Manage open BUY position
  else if (positions[symbol]?.side === 'BUY') {
    const position = positions[symbol];
    // Trailing Stop Logic
    if (currentPrice > position.entry) { // Only trail if in profit
      const newPotentialStop = currentPrice * (1 - TRAILING_STOP_PERCENT);
      if (newPotentialStop > position.trailingStop) {
        position.trailingStop = newPotentialStop;
        console.log`([${symbol}] BUY Trailing Stop moved to ${position.trailingStop.toFixed(4)})`
      }
    }
    // Check SL or Trailing Stop
    if (currentPrice < position.trailingStop) {
      const exitPrice = currentPrice;
      const pnl = ((exitPrice - position.entry) / position.entry) * 100;
      const msg = `⚠️ [EXIT BUY TSL] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Trailing Stop Hit)`
      console.log(msg);
      await bot.sendMessage(CHAT_ID, msg);
      delete positions[symbol];
    } else if (currentPrice < position.stoploss) { // Check hard stoploss
        const exitPrice = currentPrice;
        const pnl = ((exitPrice - position.entry) / position.entry) * 100;
        const msg = `🛑 [EXIT BUY SL] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Stoploss Hit)`
        console.log(msg);
        await bot.sendMessage(CHAT_ID, msg);
        delete positions[symbol];
    } else if (currentPrice >= position.target) { // Check target
        const exitPrice = currentPrice;
        const pnl = ((exitPrice - position.entry) / position.entry) * 100;
        const msg = `✅ [EXIT BUY TP] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Target Hit)`
        console.log(msg);
        await bot.sendMessage(CHAT_ID, msg);
        delete positions[symbol];
    }
  }
  // Manage open SELL position
  else if (positions[symbol]?.side === 'SELL') {
    const position = positions[symbol];
    // Trailing Stop Logic
    if (currentPrice < position.entry) { // Only trail if in profit
      const newPotentialStop = currentPrice * (1 + TRAILING_STOP_PERCENT);
      if (newPotentialStop < position.trailingStop) {
        position.trailingStop = newPotentialStop;
        console.log`([${symbol}] SELL Trailing Stop moved to ${position.trailingStop.toFixed(4)})`
      }
    }
    // Check SL or Trailing Stop
    if (currentPrice > position.trailingStop) {
      const exitPrice = currentPrice;
      const pnl = ((position.entry - exitPrice) / position.entry) * 100;
      const msg = `⚠️ [EXIT SELL TSL] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Trailing Stop Hit)`
      console.log(msg);
      await bot.sendMessage(CHAT_ID, msg);
      delete positions[symbol];
    } else if (currentPrice > position.stoploss) { // Check hard stoploss
        const exitPrice = currentPrice;
        const pnl = ((position.entry - exitPrice) / position.entry) * 100;
        const msg = `🛑 [EXIT SELL SL] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Stoploss Hit)`
        console.log(msg);
        await bot.sendMessage(CHAT_ID, msg);
        delete positions[symbol];
    } else if (currentPrice <= position.target) { // Check target
        const exitPrice = currentPrice;
        const pnl = ((position.entry - exitPrice) / position.entry) * 100;
        const msg = `✅ [EXIT SELL TP] ${symbol}\nEntry: ${position.entry.toFixed(4)}\nExit: ${exitPrice.toFixed(4)}\nPnL: ${pnl.toFixed(2)}%\n(Target Hit)`
        console.log(msg);
        await bot.sendMessage(CHAT_ID, msg);
        delete positions[symbol];
    }
  }
}

async function runBot() {


console.log`(\n\n[${new Date().toLocaleString()}] Starting new check cycle...)`
  for (const symbol of SYMBOLS) {
    try {
      await checkSymbol(symbol);
    } catch (err) {
      console.error`(Unhandled error with ${symbol}:, err.message, err.stack)`
      // Send a generic error message to Telegram for this symbol
      try {
        await bot.sendMessage`(CHAT_ID, ❗️ Critical Error with ${symbol}: ${err.message.substring(0,150)})`
      } catch (tgErr) {
        console.error("Failed to send error message to Telegram:", tgErr.message);
      }
    }
  }
  console.log('--- Cycle finished ---');
}

// Initial run
runBot();
// Run every 1 minute
setInterval(runBot, 60 * 1000);

console.log("Bot started. Waiting for the first check cycle...");
// To prevent bot from exiting if polling is false and there are no active timers
// This is not strictly necessary if setInterval is running, but good for clarity
// process.stdin.resume(); // This line can sometimes cause issues in some environments if not needed.

// Graceful shutdown
process.on('SIGINT', () => {
  console.log("Bot shutting down...");
  // Add any cleanup logic here if needed
  process.exit();
});
process.on('SIGTERM', () => {
  console.log("Bot shutting down...");
  // Add any cleanup logic here if needed
  process.exit();
});