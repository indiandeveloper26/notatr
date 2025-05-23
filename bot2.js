require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const indicators = require('technicalindicators');

const {
  RSI, EMA, MACD, ATR, SMA, BollingerBands, Stochastic, ADX,
  CCI, WilliamsR, OBV, MFI, ROC, TRIX, UltimateOscillator,
  PSAR, IchimokuCloud, KST, ForceIndex, StochasticRSI, FibonacciRetracement
} = indicators;

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const INTERVAL = '1m';
const BOT = new TelegramBot('8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE', { polling: true });
const USER_CHAT_IDS = [];
const MODEL_FILE = 'lstm_model.json';

// Trade status tracker for each symbol
const tradeStatus = {}; // { BTCUSDT: 'ACTIVE BUY' / 'ACTIVE SELL' / 'HOLD' }

if (fs.existsSync(MODEL_FILE)) {
  const data = fs.readFileSync(MODEL_FILE);
  lstmModel.fromJSON(JSON.parse(data));
}

async function fetchKlines(symbol, interval, limit = 100) {
  const url =  `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await axios.get(url);
  return res.data.map(c => ({
    time: c[0], open: +c[1], high: +c[2], low: +c[3],
    close: +c[4], volume: +c[5]
  }));
}

function extractValues(candles) {
  return {
    close: candles.map(c => c.close),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    volume: candles.map(c => c.volume)
  };
}

function calculateIndicators({ close, high, low, volume }) {
  return {
    rsi: RSI.calculate({ values: close, period: 14 }).at(-1),
    ema: EMA.calculate({ values: close, period: 14 }).at(-1),
    macd: MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }).at(-1),
    atr: ATR.calculate({ high, low, close, period: 14 }).at(-1),
    sma: SMA.calculate({ values: close, period: 14 }).at(-1),
    bb: BollingerBands.calculate({ period: 20, stdDev: 2, values: close }).at(-1),
    stochastic: Stochastic.calculate({ high, low, close, period: 14, signalPeriod: 3 }).at(-1),
    adx: ADX.calculate({ high, low, close, period: 14 }).at(-1),
    cci: CCI.calculate({ high, low, close, period: 20 }).at(-1),
    willr: WilliamsR.calculate({ high, low, close, period: 14 }).at(-1),
    obv: OBV.calculate({ close, volume }).at(-1),
    mfi: MFI.calculate({ high, low, close, volume, period: 14 }).at(-1),
    roc: ROC.calculate({ values: close, period: 12 }).at(-1),
    trix: TRIX.calculate({ values: close, period: 15 }).at(-1),
    uo: UltimateOscillator.calculate({ high, low, close, period1: 7, period2: 14, period3: 28 }).at(-1),
    psar: PSAR.calculate({ high, low, step: 0.02, max: 0.2 }).at(-1),
    ichimoku: IchimokuCloud.calculate({ high, low, conversionPeriod: 9, basePeriod: 26, spanPeriod: 52, displacement: 26 }).at(-1),
    kst: KST.calculate({ values: close }).at(-1),
    force: ForceIndex.calculate({ close, volume, period: 13 }).at(-1),
    stochrsi: StochasticRSI.calculate({ values: close, rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 }).at(-1),
    fib: FibonacciRetracement.calculate({ high, low, values: close.slice(-2) })
  };
}

function analyzeLSTM(closes) {
  const normalized = closes.map(p => p / closes[0]);
  const prediction = lstmModel.run(normalized);
  const predicted = prediction * closes[0];
  const last = closes.at(-1);
  if (predicted > last * 1.01) return 'BUY';
  if (predicted < last * 0.99) return 'SELL';
  return 'HOLD';
}

function analyzeCombined(indicators, lstmSignal) {
  const bullish = [];
  const bearish = [];

  if (indicators.rsi < 30) bullish.push('RSI');
  else if (indicators.rsi > 70) bearish.push('RSI');

  if (indicators.macd.histogram > 0) bullish.push('MACD');
  else if (indicators.macd.histogram < 0) bearish.push('MACD');

  if (indicators.stochastic.k > indicators.stochastic.d) bullish.push('STOCH');
  else if (indicators.stochastic.k < indicators.stochastic.d) bearish.push('STOCH');

  const score = bullish.length - bearish.length;

  if (lstmSignal === 'BUY' && score > 1) return 'STRONG BUY';
  if (lstmSignal === 'SELL' && score < -1) return 'STRONG SELL';
  return lstmSignal;
}

function formatSignal(symbol, finalSignal, indicators, status) {
  let text = `*${symbol} Signal*\nSignal: *${finalSignal}*\nStatus: *${status}*`;
  for (const [key, val] of Object.entries(indicators)) {
    if (typeof val === 'object' && val !== null) {
     text += `\n${key.toUpperCase()}: ${JSON.stringify(val)}`;
    } else if (val !== undefined && !isNaN(val)) {
     text += `\n${key.toUpperCase()}: ${val.toFixed(2)}`;
    }
  }
  return text;
}

async function analyzeAndNotify(symbol, chatId) {
  try {
    const candles = await fetchKlines(symbol, INTERVAL);
    const values = extractValues(candles);
    const indicators = calculateIndicators(values);
    const lstmSignal = analyzeLSTM(values.close);
    const finalSignal = analyzeCombined(indicators, lstmSignal);

    // Set status based on signal
    if (finalSignal.includes('BUY')) {
      tradeStatus[symbol] = 'ACTIVE BUY';
    } else if (finalSignal.includes('SELL')) {
      tradeStatus[symbol] = 'ACTIVE SELL';
    } else {
      tradeStatus[symbol] = 'HOLD';
    }

    const status = tradeStatus[symbol];
    const message = formatSignal(symbol, finalSignal, indicators, status);

    // Send message with inline button to check status
    await BOT.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Check Active Trade Status',
              callback_data: `check_status_${symbol}`
            }
          ]
        ]
      }
    });
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error.message);
  }
}

// Listen for button callbacks
BOT.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith('check_status_')) {
    const symbol = data.replace('check_status_', '');
    const status = tradeStatus[symbol] || 'No active trade found.';
    await BOT.answerCallbackQuery(callbackQuery.id, { text: `${symbol} Status: ${status}`, show_alert: true });
  }
});

BOT.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!USER_CHAT_IDS.includes(chatId)) USER_CHAT_IDS.push(chatId);
  BOT.sendMessage(chatId, '✅ Bot started. Signals will be sent every minute.');
});

let currentSymbolIndex = 0;
setInterval(async () => {
  const symbol = SYMBOLS[currentSymbolIndex];
  currentSymbolIndex = (currentSymbolIndex + 1) % SYMBOLS.length;
  for (const chatId of USER_CHAT_IDS) {
    await analyzeAndNotify(symbol, chatId);
  }
}, 60 * 1000);

console.log('✅ Crypto Bot with LSTM + Indicators + Status + Button running.');
