// const axios = require('axios');
// const { SMA, ATR } = require('technicalindicators');

// // --- Configuration ---
// const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']; // Symbols to trade
// const TIMEFRAME = '5m'; // Timeframe for calculating indicators and signals (e.g., '1m', '5m', '15m', '1h', '4h')
// const SMA_PERIOD = 200;
// const ATR_PERIOD = 14;          // ATR calculation period
// const ATR_MULTIPLIER_SL = 2;    // Initial Stop Loss = entryPrice -/+ ATR * ATR_MULTIPLIER_SL
// const ATR_MULTIPLIER_TRAIL = 1.5; // Trailing Stop moves by ATR * ATR_MULTIPLIER_TRAIL

// const POLLING_INTERVAL_MS = 2 * 60 * 1000; // How often to check for signals (e.g., 2 minutes)
// const CANDLE_LIMIT = SMA_PERIOD + ATR_PERIOD + 5; // Ensure enough data for indicators + buffer

// // --- State ---
// let positions = {}; // To track open positions: { SYMBOL: { side, entryPrice, initialSl, trailingSl, highestPriceSinceEntry, lowestPriceSinceEntry, entryAtr } }

// // --- Helper Functions ---
// async function fetchCandles(symbol, interval, limit) {
//     try {
//         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//         const response = await axios.get(url);
//         return response.data.map(c => ({
//             timestamp: parseInt(c[0]),
//             open: parseFloat(c[1]),
//             high: parseFloat(c[2]),
//             low: parseFloat(c[3]),
//             close: parseFloat(c[4]),
//             volume: parseFloat(c[5])
//         }));
//     } catch (error) {
//         console.error(`Error fetching candles for ${symbol} on ${interval}:`, error.message);
//         return [];
//     }
// }

// function calculateIndicators(candles) {
//     if (!candles || candles.length < Math.max(SMA_PERIOD, ATR_PERIOD)) {
//         // console.warn("Not enough candle data to calculate indicators.");
//         return null;
//     }

//     const closes = candles.map(c => c.close);
//     const highs = candles.map(c => c.high);
//     const lows = candles.map(c => c.low);

//     const smaValues = SMA.calculate({ period: SMA_PERIOD, values: closes });
//     const atrValues = ATR.calculate({ period: ATR_PERIOD, high: highs, low: lows, close: closes });

//     if (smaValues.length === 0 || atrValues.length === 0) {
//         // console.warn("Indicator calculation resulted in empty arrays.");
//         return null;
//     }

//     return {
//         currentSma: smaValues[smaValues.length - 1],
//         prevSma: smaValues[smaValues.length - 2],
//         currentAtr: atrValues[atrValues.length - 1],
//         // We need close prices for crossover logic
//         currentClose: closes[closes.length - 1],
//         prevClose: closes[closes.length - 2],
//         // Also need the latest full candle for ATR based SL on entry
//         latestFullCandleHigh: highs[highs.length - 2], // High of the candle that just closed
//         latestFullCandleLow: lows[lows.length - 2],   // Low of the candle that just closed
//     };
// }

// // --- Bot Logic ---
// async function checkSymbol(symbol) {
//     console.log(`\n[${new Date().toLocaleTimeString()}] Checking ${symbol} on ${TIMEFRAME}...`);
//     const candles = await fetchCandles(symbol, TIMEFRAME, CANDLE_LIMIT);

//     if (candles.length < 2) { // Need at least 2 candles for prev/current comparison
//         console.log(`Not enough candles for ${symbol} to proceed.`);
//         return;
//     }

//     const indicators = calculateIndicators(candles);
//     if (!indicators) {
//         console.log(`Could not calculate indicators for ${symbol}.`);
//         return;
//     }

//     const { currentSma, prevSma, currentAtr, currentClose, prevClose } = indicators;

//     if (currentSma === undefined || prevSma === undefined || currentAtr === undefined || currentClose === undefined || prevClose === undefined) {
//         console.log(`Indicator values incomplete for ${symbol}. SMA: ${currentSma}, PrevSMA: ${prevSma}, ATR: ${currentAtr}`);
//         return;
//     }

//     const activePosition = positions[symbol];

//     // --- Manage Existing Position ---
//     if (activePosition) {
//         let newTrailingSl = activePosition.trailingSl;
//         if (activePosition.side === 'BUY') {
//             // Update highest price seen since entry
//             activePosition.highestPriceSinceEntry = Math.max(activePosition.highestPriceSinceEntry, currentClose);
//             // Update trailing SL if price moves favorably
//             const potentialNewSl = activePosition.highestPriceSinceEntry - (activePosition.entryAtr * ATR_MULTIPLIER_TRAIL);
//             if (potentialNewSl > newTrailingSl) {
//                 newTrailingSl = potentialNewSl;
//                 console.log(`[TRAIL UPDATE][BUY] ${symbol}: Trailing SL moved to ${newTrailingSl.toFixed(4)} (was ${activePosition.trailingSl.toFixed(4)})`);
//                 activePosition.trailingSl = newTrailingSl;
//             }
//             // Check if trailing SL hit
//             if (currentClose < activePosition.trailingSl) {
//                 const pnl = currentClose - activePosition.entryPrice;
//                 const pnlPercent = (pnl / activePosition.entryPrice) * 100;
//                 console.log(`[SL HIT][BUY EXIT] ${symbol}: Closed at ${currentClose.toFixed(4)}. Entry: ${activePosition.entryPrice.toFixed(4)}. P&L: ${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)`);
//                 delete positions[symbol];
//             }
//         } else if (activePosition.side === 'SELL') {
//             // Update lowest price seen since entry
//             activePosition.lowestPriceSinceEntry = Math.min(activePosition.lowestPriceSinceEntry, currentClose);
//             // Update trailing SL if price moves favorably
//             const potentialNewSl = activePosition.lowestPriceSinceEntry + (activePosition.entryAtr * ATR_MULTIPLIER_TRAIL);
//             if (potentialNewSl < newTrailingSl) {
//                 newTrailingSl = potentialNewSl;
//                 console.log(`[TRAIL UPDATE][SELL] ${symbol}: Trailing SL moved to ${newTrailingSl.toFixed(4)} (was ${activePosition.trailingSl.toFixed(4)})`);
//                 activePosition.trailingSl = newTrailingSl;
//  }
//   // Check if trailing SL hit
//             if (currentClose > activePosition.trailingSl) {
//                 const pnl = activePosition.entryPrice - currentClose;
//                 const pnlPercent = (pnl / activePosition.entryPrice) * 100;
//                 console.log(`[SL HIT][SELL EXIT] ${symbol}: Closed at ${currentClose.toFixed(4)}. Entry: ${activePosition.entryPrice.toFixed(4)}. P&L: ${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)`);
//                 delete positions[symbol];
//             }
//         }
//     }
//     // --- Check for New Signals (if no active position) ---
//     else {
//         // Buy Signal: Previous close was below or at previous SMA, AND current close is above current SMA
//         const isBuySignal = prevClose <= prevSma && currentClose > currentSma;
//         // Sell Signal: Previous close was above or at previous SMA, AND current close is below current SMA
//         const isSellSignal = prevClose >= prevSma && currentClose < currentSma;

//         const entryPrice = currentClose; // Signal is on candle close
//         const initialSlDistance = currentAtr * ATR_MULTIPLIER_SL;

//         if (isBuySignal) {
//             const initialSl = entryPrice - initialSlDistance;
//             positions[symbol] = {
//                 side: 'BUY',
//                 entryPrice: entryPrice,
//                 initialSl: initialSl,
//                 trailingSl: initialSl, // Start trailing SL at initial SL
//                 entryAtr: currentAtr,
//                 highestPriceSinceEntry: entryPrice, // For trailing stop calculation
//                 timestamp: Date.now()
//             };
//             console.log(`---`);
//             console.log(`[NEW SIGNAL][BUY] ${symbol} on ${TIMEFRAME}`);
//             console.log(`  Entry Price: ${entryPrice.toFixed(4)}`);
//             console.log(`  SMA(${SMA_PERIOD}): ${currentSma.toFixed(4)} (Prev Close: ${prevClose.toFixed(4)} vs Prev SMA: ${prevSma.toFixed(4)})`);
//             console.log(`  ATR(${ATR_PERIOD}): ${currentAtr.toFixed(4)}`);
//             console.log(`  Initial Stop Loss: ${initialSl.toFixed(4)}`);
//             console.log(`  Trailing Stop Loss: ${positions[symbol].trailingSl.toFixed(4)}`);
//             console.log(`---`);
//         } else if (isSellSignal) {
//             const initialSl = entryPrice + initialSlDistance;
//             positions[symbol] = {
//                 side: 'SELL',
//                 entryPrice: entryPrice,
//                 initialSl: initialSl,
//                 trailingSl: initialSl, // Start trailing SL at initial SL
//                 entryAtr: currentAtr,
//                 lowestPriceSinceEntry: entryPrice, // For trailing stop calculation
//                 timestamp: Date.now()
//             };
//             console.log(`---`);
//             console.log(`[NEW SIGNAL][SELL] ${symbol} on ${TIMEFRAME}`);
//             console.log(`  Entry Price: ${entryPrice.toFixed(4)}`);
//             console.log(`  SMA(${SMA_PERIOD}): ${currentSma.toFixed(4)} (Prev Close: ${prevClose.toFixed(4)} vs Prev SMA: ${prevSma.toFixed(4)})`);
//             console.log(`  ATR(${ATR_PERIOD}): ${currentAtr.toFixed(4)}`);
//             console.log(`  Initial Stop Loss: ${initialSl.toFixed(4)}`);
//             console.log(`  Trailing Stop Loss: ${positions[symbol].trailingSl.toFixed(4)}`);
//             console.log(`---`);
//         }
//     }
// }

// async function runBot() {
//     console.log(`\n=============================================`);
//     console.log(`[${new Date().toLocaleString()}] Bot cycle started...`);
//     console.log(`=============================================`);
//     for (const symbol of SYMBOLS) {
//         try {
//             await checkSymbol(symbol);
//         } catch (err) {
//             console.error(`Critical error processing ${symbol}:`, err.message, err.stack);
//         }
//         // Optional: Add a small delay between symbol checks to avoid API rate limits if checking many symbols rapidly
//         // await new Promise(resolve => setTimeout(resolve, 500)); 
//     }
//     console.log(`\n[${new Date().toLocaleString()}] Bot cycle finished. Current open positions: ${Object.keys(positions).length}`);
//     Object.entries(positions).forEach(([symbol, pos]) => {
//         console.log(`  - ${symbol} (${pos.side}): Entry @ ${pos.entryPrice.toFixed(4)}, TrailSL @ ${pos.trailingSl.toFixed(4)}`);
//     });
//     console.log(`=============================================`);
// }

// // --- Main Execution ---
// console.log("Starting Trading Bot...");
// console.log("Configuration:");
// console.log(`  Symbols: ${SYMBOLS.join(', ')}`);
// console.log(`  Timeframe for signals: ${TIMEFRAME}`);
// console.log(`  SMA Period: ${SMA_PERIOD}`);
// console.log(`  ATR Period: ${ATR_PERIOD}`);
// console.log(`  ATR Multiplier for Initial SL: ${ATR_MULTIPLIER_SL}`);
// console.log(`  ATR Multiplier for Trailing SL: ${ATR_MULTIPLIER_TRAIL}`);
// console.log(`  Polling Interval: ${POLLING_INTERVAL_MS / 1000 / 60} minutes`);
// console.log(`  Candle fetch limit: ${CANDLE_LIMIT}`);
// console.log(`---`);

// runBot(); // Run immediately on start
// setInterval(runBot, POLLING_INTERVAL_MS);


































const axios = require('axios');
const { SMA, ATR } = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID'; // Replace with your chat ID
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const TIMEFRAME = '5m';
const SMA_PERIOD = 200;
const ATR_PERIOD = 14;
const ATR_MULTIPLIER_SL = 2;
const ATR_MULTIPLIER_TRAIL = 1.5;
const POLLING_INTERVAL_MS = 2 * 60 * 1000;
const CANDLE_LIMIT = SMA_PERIOD + ATR_PERIOD + 5;

let positions = {};

async function fetchCandles(symbol, interval, limit) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await axios.get(url);
    return response.data.map(c => ({
      timestamp: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error.message);
    return [];
  }
}

function calculateIndicators(candles) {
  if (!candles || candles.length < Math.max(SMA_PERIOD, ATR_PERIOD)) return null;

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const smaValues = SMA.calculate({ period: SMA_PERIOD, values: closes });
  const atrValues = ATR.calculate({ period: ATR_PERIOD, high: highs, low: lows, close: closes });

  if (smaValues.length === 0 || atrValues.length === 0) return null;

  return {
    currentSma: smaValues[smaValues.length - 1],
    prevSma: smaValues[smaValues.length - 2],
    currentAtr: atrValues[atrValues.length - 1],
    currentClose: closes[closes.length - 1],
    prevClose: closes[closes.length - 2],
    latestFullCandleHigh: highs[highs.length - 2],
    latestFullCandleLow: lows[lows.length - 2]
  };
}

function sendTelegramMessage(text) {
  bot.sendMessage(TELEGRAM_CHAT_ID, text).catch(console.error);
}

async function checkSymbol(symbol) {
  console.log(`\n[${new Date().toLocaleTimeString()}] Checking ${symbol}...`);
  const candles = await fetchCandles(symbol, TIMEFRAME, CANDLE_LIMIT);
  if (candles.length < 2) return;

  const indicators = calculateIndicators(candles);
  if (!indicators) return;

  const { currentSma, prevSma, currentAtr, currentClose, prevClose } = indicators;
  const activePosition = positions[symbol];

  if (activePosition) {
    let newTrailingSl = activePosition.trailingSl;
    if (activePosition.side === 'BUY') {
      activePosition.highestPriceSinceEntry = Math.max(activePosition.highestPriceSinceEntry, currentClose);
      const potentialNewSl = activePosition.highestPriceSinceEntry - (activePosition.entryAtr * ATR_MULTIPLIER_TRAIL);
      if (potentialNewSl > newTrailingSl) {
        newTrailingSl = potentialNewSl;
        activePosition.trailingSl = newTrailingSl;
        sendTelegramMessage(`[TRAIL UPDATE][BUY] ${symbol}: Trailing SL moved to ${newTrailingSl.toFixed(4)}`);
      }
      if (currentClose < activePosition.trailingSl) {
        const pnl = currentClose - activePosition.entryPrice;
        const pnlPercent = (pnl / activePosition.entryPrice) * 100;
        sendTelegramMessage(`[SL HIT][BUY EXIT] ${symbol}: Closed at ${currentClose.toFixed(4)}. Entry: ${activePosition.entryPrice.toFixed(4)}. P&L: ${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)`);
        delete positions[symbol];
      }
    } else if (activePosition.side === 'SELL') {
      activePosition.lowestPriceSinceEntry = Math.min(activePosition.lowestPriceSinceEntry, currentClose);
      const potentialNewSl = activePosition.lowestPriceSinceEntry + (activePosition.entryAtr * ATR_MULTIPLIER_TRAIL);
      if (potentialNewSl < newTrailingSl) {
        newTrailingSl = potentialNewSl;
        activePosition.trailingSl = newTrailingSl;
        sendTelegramMessage(`[TRAIL UPDATE][SELL] ${symbol}: Trailing SL moved to ${newTrailingSl.toFixed(4)}`);
      }
      if (currentClose > activePosition.trailingSl) {
        const pnl = activePosition.entryPrice - currentClose;
        const pnlPercent = (pnl / activePosition.entryPrice) * 100;
        sendTelegramMessage(`[SL HIT][SELL EXIT] ${symbol}: Closed at ${currentClose.toFixed(4)}. Entry: ${activePosition.entryPrice.toFixed(4)}. P&L: ${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)`);
        delete positions[symbol];
      }
    }
  } else {
    const isBuySignal = prevClose <= prevSma && currentClose > currentSma;
    const isSellSignal = prevClose >= prevSma && currentClose < currentSma;
    const entryPrice = currentClose;
    const initialSlDistance = currentAtr * ATR_MULTIPLIER_SL;

    if (isBuySignal) {
      const initialSl = entryPrice - initialSlDistance;
      positions[symbol] = {
        side: 'BUY', entryPrice, initialSl, trailingSl: initialSl,
        entryAtr: currentAtr, highestPriceSinceEntry: entryPrice, timestamp: Date.now()
      };
      sendTelegramMessage(`\n[NEW SIGNAL][BUY] ${symbol} on ${TIMEFRAME}\nEntry: ${entryPrice.toFixed(4)}\nSMA: ${currentSma.toFixed(4)}\nATR: ${currentAtr.toFixed(4)}\nSL: ${initialSl.toFixed(4)}`);
    } else if (isSellSignal) {
      const initialSl = entryPrice + initialSlDistance;
      positions[symbol] = {
        side: 'SELL', entryPrice, initialSl, trailingSl: initialSl,
        entryAtr: currentAtr, lowestPriceSinceEntry: entryPrice, timestamp: Date.now()
      };
      sendTelegramMessage(`\n[NEW SIGNAL][SELL] ${symbol} on ${TIMEFRAME}\nEntry: ${entryPrice.toFixed(4)}\nSMA: ${currentSma.toFixed(4)}\nATR: ${currentAtr.toFixed(4)}\nSL: ${initialSl.toFixed(4)}`);
    }
  }
}

async function runBot() {
  for (const symbol of SYMBOLS) {
    await checkSymbol(symbol);
  }
}

setInterval(runBot, POLLING_INTERVAL_MS);
runBot();
