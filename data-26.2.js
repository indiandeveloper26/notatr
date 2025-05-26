const technicalIndicators = require('technicalindicators');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = 'YOUR_CHAT_ID';
const bot = new TelegramBot('8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE', { polling: false });

const symbol = 'BTC/USDT';
const intervalEntry = '15m';
const intervalConfirm1h = '1h';
const intervalConfirm4h = '4h';

let inPosition = false;
let trailingStop = null;
let currentTradeSide = null;

async function fetchCandles(symbol, interval, limit = 200) {
  const response = await axios.get`(https://api.binance.com/api/v3/klines?symbol=${symbol.replace('/', '')}&interval=${interval}&limit=${limit})`
  return response.data.map(candle => ({
    openTime: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}

function calculateSMA(data, period = 200) {
  return technicalIndicators.SMA.calculate({ period, values: data });
}

function calculateIchimoku(data) {
  const highs = data.map(c => c.high);
  const lows = data.map(c => c.low);
  return technicalIndicators.IchimokuCloud.calculate({
    high: highs,
    low: lows,
    conversionPeriod: 9,
    basePeriod: 26,
    spanPeriod: 52,
    displacement: 26
  });
}

function calculateATR(data, period = 14) {
  return technicalIndicators.ATR.calculate({
    high: data.map(c => c.high),
    low: data.map(c => c.low),
    close: data.map(c => c.close),
    period
  });
}

function getLast(arr, offset = 0) {
  return arr[arr.length - 1 - offset];
}

async function checkSignal() {
  const candles15m = await fetchCandles(symbol, intervalEntry);
  const candles1h = await fetchCandles(symbol, intervalConfirm1h);
  const candles4h = await fetchCandles(symbol, intervalConfirm4h);

  const close15m = candles15m.map(c => c.close);
  const sma15m = calculateSMA(close15m);
  const ichimoku15m = calculateIchimoku(candles15m);
  const atr15m = calculateATR(candles15m);

  const close1h = candles1h.map(c => c.close);
  const sma1h = calculateSMA(close1h);
  const ichimoku1h = calculateIchimoku(candles1h);

  const close4h = candles4h.map(c => c.close);
  const sma4h = calculateSMA(close4h);
  const ichimoku4h = calculateIchimoku(candles4h);

  const price = getLast(close15m);
  const atr = getLast(atr15m);
  const sma = getLast(sma15m);
  const ichimoku = getLast(ichimoku15m);

  const bullish = price > sma && ichimoku && price > ichimoku.spanA && price > ichimoku.spanB &&
    getLast(close1h) > getLast(sma1h) &&
    getLast(close4h) > getLast(sma4h);

  const bearish = price < sma && ichimoku && price < ichimoku.spanA && price < ichimoku.spanB &&
    getLast(close1h) < getLast(sma1h) &&
    getLast(close4h) < getLast(sma4h);

  if (!inPosition && bullish) {
    inPosition = true;
    currentTradeSide = 'buy';
    trailingStop = price - atr;
    sendSignal('BUY', price, atr);
  } else if (!inPosition && bearish) {
    inPosition = true;
    currentTradeSide = 'sell';
    trailingStop = price + atr;
    sendSignal('SELL', price, atr);
  } else if (inPosition && currentTradeSide === 'buy') {
    if (price - atr > trailingStop) {
      trailingStop = price - atr;
    }
    if (price < trailingStop) {
      inPosition = false;
      sendExit('SELL (TP/SL Hit)', price);
    }
  } else if (inPosition && currentTradeSide === 'sell') {
    if (price + atr < trailingStop) {
      trailingStop = price + atr;
    }
    if (price > trailingStop) {
      inPosition = false;
      sendExit('BUY (TP/SL Hit)', price);
    }
  }
}

function sendSignal(type, price, atr) {
  const msg = `Signal: ${type}\nPrice: ${price}\nATR: ${atr}\nStoploss: ${type === 'BUY' ? price - atr : price + atr}`
  bot.sendMessage(CHAT_ID, msg);
  console.log(msg);
}

function sendExit(reason, price) {
  const msg = `Exit: ${reason}\nExit Price: ${price}`
  bot.sendMessage(CHAT_ID, msg);
  console.log(msg);
}

setInterval(checkSignal, 60 * 1000);