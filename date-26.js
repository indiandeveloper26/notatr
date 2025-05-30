// require('dotenv').config(); // अगर आप .env फ़ाइल का उपयोग कर रहे हैं तो इस लाइन को अनकमेंट करें
const axios = require('axios');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');
const MLR = require('ml-regression').MultivariateLinearRegression;

// --- कॉन्फ़िगरेशन ---
const INTERVAL = "1h"; // सिंगल इंटरवल

// केवल एक सिंबल को ट्रैक करने के लिए
const SINGLE_SYMBOL_TO_TRACK = 'BTCUSDT'; // <<--- यहाँ उस सिंबल का नाम डालें जिसे आप ट्रैक करना चाहते हैं

const VOLUME_SMA_PERIOD = 20;

const USER_IDS_FILE = './data/user_chat_ids.json'; // उपयोगकर्ता ID संग्रहीत करें
const USER_STATUS_FILE = './data/user_status.json'; // उपयोगकर्ता सक्रियण स्थिति संग्रहीत करें

// Telegram Bot Token - प्रोडक्शन के लिए पर्यावरण चर को प्राथमिकता दें
const botToken = process.env.TELEGRAM_BOT_TOKEN || '8003756443:AAHOP678U2KdAiTuVYQZVQ2DsYnT2Oq4PnE';
const bot = new TelegramBot(botToken, { polling: true });

let USER_CHAT_IDS = []; // सिग्नल भेजने के लिए चैट IDs की सूची
let userStatus = {};    // { chatId: true/false } सक्रिय/निष्क्रिय के लिए
let activeTrades = {};  // { chatId: { symbol: { signal, entry, target, stoploss, atr, status } } }
let lastSignalSent = {};// { chatId: { symbol: 'BUY'/'SELL'/'HOLD' } }

// ML मॉडल स्टोरेज (गतिशील रूप से प्रशिक्षित किया जाएगा)
let mlModels = { targetModel: null, stoplossModel: null };
let mlTrainingData = { atr: [], price: [], targets: [], stoplosses: [] };


// --- डेटा परसिस्टेंस के लिए सहायक फ़ंक्शन ---
function loadUserChatIds() {
    try {
        if (fs.existsSync(USER_IDS_FILE)) {
            USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
            console.log(`लोड किए गए ${USER_CHAT_IDS.length} उपयोगकर्ता चैट ID.`);
        }
    } catch (e) {
        console.error("उपयोगकर्ता चैट ID लोड करने में त्रुटि:", e.message);
    }
}

function saveUserChatIds() {
    try {
        fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS, null, 2));
        console.log("उपयोगकर्ता चैट ID सहेजे गए.");
    } catch (e) {
        console.error("उपयोगकर्ता चैट ID सहेजने में त्रुटि:", e.message);
    }
}

function loadUserStatus() {
    try {
        if (fs.existsSync(USER_STATUS_FILE)) {
            userStatus = JSON.parse(fs.readFileSync(USER_STATUS_FILE));
            console.log("उपयोगकर्ता स्थितियाँ लोड की गईं.");
        }
    } catch (e) {
        console.error("उपयोगकर्ता स्थितियाँ लोड करने में त्रुटि:", e.message);
    }
}

function saveUserStatus() {
    try {
        fs.writeFileSync(USER_STATUS_FILE, JSON.stringify(userStatus, null, 2));
        console.log("उपयोगकर्ता स्थितियाँ सहेजी गईं.");
    } catch (e) {
        console.error("उपयोगकर्ता स्थितियाँ सहेजने में त्रुटि:", e.message);
    }
}

// --- डेटा फ़ेचिंग फ़ंक्शन ---
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
        console.error(`${symbol} के लिए Kline फ़ेच करने में त्रुटि:`, e.message);
        return null;
    }
}

async function fetchCurrentPrice(symbol) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
        const res = await axios.get(url);
        return parseFloat(res.data.price);
    } catch (e) {
        console.error(`${symbol} के लिए मूल्य फ़ेच करने में त्रुटि:`, e.message);
        return null;
    }
}

// --- ML मॉडल प्रशिक्षण और भविष्यवाणी ---
// शुरू करने के लिए डमी प्रशिक्षण डेटा, इसे वास्तविक ऐतिहासिक परिणामों से बदलें।
// एक वास्तविक ML मॉडल के लिए, आपको ऐतिहासिक व्यापार परिणामों (एंट्री, एग्जिट, वास्तविक P/L)
// और एंट्री के समय संबंधित ATR/मूल्य की आवश्यकता होगी।
// यह प्रदर्शन उद्देश्यों के लिए एक प्लेसहोल्डर है।
function initializeMLTrainingData() {
    // उदाहरण: प्रत्येक सिग्नल के लिए, यदि लक्ष्य 1.5xATR पर हिट हुआ और स्टॉपलॉस 1.0xATR पर
    // यह भाग प्रारंभिक प्रशिक्षण के लिए एक निश्चित रणनीति मानता है, जिसे आप
    // वास्तविक ऐतिहासिक व्यापार परिणामों (जहां सिग्नल दिया गया था, और क्या परिणाम था) से बदलेंगे।
    if (mlTrainingData.atr.length < 50) { // ML के लिए कुछ प्रारंभिक डेटा सुनिश्चित करें
        for (let i = 0; i < 50; i++) {
            const randomAtr = Math.random() * 0.5 + 0.1; // 0.1 से 0.6
            const randomPrice = Math.random() * 1000 + 100; // 100 से 1100
            mlTrainingData.atr.push(randomAtr);
            mlTrainingData.price.push(randomPrice);
            // सिमुलेटेड अच्छे ऐतिहासिक परिणाम: लक्ष्य 2x ATR, स्टॉपलॉस 0.8x ATR
            mlTrainingData.targets.push(randomPrice + randomAtr * 2.0);
            mlTrainingData.stoplosses.push(randomPrice - randomAtr * 0.8);
        }
    }
}


function trainMLModel(atrArray, priceArray, targets, stoplosses) {
    console.log("ML मॉडल को प्रशिक्षित किया जा रहा है", atrArray.length, "डेटा बिंदुओं के साथ...");
    // इनपुट विशेषताएँ: सिग्नल के समय ATR और मूल्य
    // आउटपुट: इष्टतम लक्ष्य और स्टॉपलॉस मल्टीप्लायर
    const inputs = atrArray.map((atr, i) => [atr, priceArray[i]]);
    // ऐतिहासिक डेटा से वास्तविक मल्टीप्लायरों की गणना करें
    const historicalTargetMultipliers = targets.map((target, i) => Math.abs(target - priceArray[i]) / atrArray[i]);
    const historicalStoplossMultipliers = stoplosses.map((sl, i) => Math.abs(sl - priceArray[i]) / atrArray[i]);

    try {
        const targetModel = new MLR(inputs, historicalTargetMultipliers);
        const stoplossModel = new MLR(inputs, historicalStoplossMultipliers);
        console.log("ML मॉडल प्रशिक्षण पूरा हुआ.");
        return { targetModel, stoplossModel };
    } catch (e) {
        console.error("ML मॉडल प्रशिक्षित करने में त्रुटि:", e.message);
        return { targetModel: null, stoplossModel: null };
    }
}

function predictMultipliers(atr, price) {
    if (!mlModels.targetModel || !mlModels.stoplossModel) {
        // यदि मॉडल प्रशिक्षित नहीं हैं तो डिफ़ॉल्ट पर वापस जाएं
        return { targetMultiplier: 2.0, stoplossMultiplier: 0.8 }; // डिफ़ॉल्ट अच्छा अनुपात
    }

    const input = [atr, price];
    let targetMultiplier = mlModels.targetModel.predict(input);
    let stoplossMultiplier = mlModels.stoplossModel.predict(input);

    // अत्यधिक भविष्यवाणियों को रोकने के लिए उचित श्रेणियों में क्लैंप करें
    // अच्छे जोखिम-इनाम के लिए लक्ष्य > स्टॉपलॉस मल्टीप्लायर का लक्ष्य रखें
    if (targetMultiplier < 0.8) targetMultiplier = 0.8; // न्यूनतम लक्ष्य मल्टीप्लायर
    if (targetMultiplier > 3.0) targetMultiplier = 3.0; // अधिकतम लक्ष्य मल्टीप्लायर

    if (stoplossMultiplier < 0.3) stoplossMultiplier = 0.3; // न्यूनतम स्टॉपलॉस मल्टीप्लायर (टाइट)
    if (stoplossMultiplier > 1.5) stoplossMultiplier = 1.5; // अधिकतम स्टॉपलॉस मल्टीप्लायर (वाइडर)

    // सुनिश्चित करें कि लक्ष्य मल्टीप्लायर सामान्यतः स्टॉपलॉस मल्टीप्लायर से अधिक हो
    if (targetMultiplier <= stoplossMultiplier) {
        targetMultiplier = stoplossMultiplier * 1.2; // सुनिश्चित करें कि लक्ष्य SL से कम से कम 20% अधिक हो
        if (targetMultiplier > 3.0) targetMultiplier = 3.0;
    }
    
    console.log(`ML अनुमानित: लक्ष्य मल्टीप्लायर=${targetMultiplier.toFixed(2)}, स्टॉपलॉस मल्टीप्लायर=${stoplossMultiplier.toFixed(2)} ATR=${atr.toFixed(2)}, मूल्य=${price.toFixed(2)} के लिए`);

    return { targetMultiplier, stoplossMultiplier };
}

function calculateTargets(signal, price, atr) {
    // ML-अनुमानित मल्टीप्लायरों का उपयोग करें
    const { targetMultiplier, stoplossMultiplier } = predictMultipliers(atr, price);

    let target, stoploss;
    if (signal === 'BUY') {
        target = price + targetMultiplier * atr;
        stoploss = price - stoplossMultiplier * atr;
    } else { // SELL
        target = price - targetMultiplier * atr;
        stoploss = price + stoplossMultiplier * atr;
    }
    return { target, stoploss };
}

// --- सिग्नल विश्लेषण ---
function analyzeData(candles) {
    if (!candles || candles.length < 100) { // संकेतकों के लिए पर्याप्त मोमबत्तियाँ सुनिश्चित करें
        console.warn("विश्लेषण के लिए पर्याप्त मोमबत्तियाँ नहीं हैं.");
        return null;
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // संकेतकों के लिए पर्याप्त डेटा सुनिश्चित करें
    if (closes.length < 26 || highs.length < 26 || lows.length < 26) { // सबसे छोटी अवधि MACD/ATR के लिए है
        console.warn("संकेतक गणना के लिए अपर्याप्त डेटा.");
        return null;
    }

    const rsi = RSI.calculate({ values: closes, period: 14 });
    const ema = EMA.calculate({ values: closes, period: 14 }); // EMA के लिए 14 मान रहे हैं
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

    // सुनिश्चित करें कि सभी संकेतकों के अंतिम मान मान्य हैं
    if (lastClose === undefined || lastEma === undefined || lastMacd === undefined || lastRsi === undefined ||
        lastAtr === undefined || lastVolume === undefined || lastVolumeSMA === undefined ||
        !lastMacd.MACD || !lastMacd.signal) {
        console.warn("एक या अधिक संकेतक मान अपरिभाषित या शून्य हैं. विश्लेषण छोड़ रहे हैं.");
        return null;
    }

    let signal = 'HOLD';
    const volumeOkay = lastVolume > (0.8 * lastVolumeSMA); // वॉल्यूम की पुष्टि

    // सिग्नल लॉजिक
    // BUY: मूल्य > EMA, MACD क्रॉसओवर बुलिश, RSI > 50, अच्छा वॉल्यूम
    if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal && lastRsi > 50) {
        signal = 'BUY';
    }
    // SELL: मूल्य < EMA, MACD क्रॉसओवर बेयरिश, RSI < 50, अच्छा वॉल्यूम
    else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal && lastRsi < 50) {
        signal = 'SELL';
    }

    // ML प्रशिक्षण सेट में वर्तमान डेटा जोड़ें (निरंतर सीखने के लिए)
    // तभी जोड़ें जब कोई सिग्नल उत्पन्न हुआ हो और हमारे पास वैध ATR/मूल्य हो
    if (signal !== 'HOLD' && lastAtr && lastClose) {
        // वास्तविक प्रशिक्षण के लिए, आप इस सिग्नल के परिणाम को ट्रैक करेंगे (यदि लक्ष्य हिट हुआ या स्टॉपलॉस हिट हुआ)
        // और फिर उस वास्तविक परिणाम को mlTrainingData.targets/stoplosses में 'target' और 'stoploss' के रूप में उपयोग करेंगे।
        // अभी के लिए, हम प्रशिक्षण के लिए एक नकली आदर्श परिणाम का उपयोग करेंगे।
        const simulatedTarget = signal === 'BUY' ? lastClose + 2.0 * lastAtr : lastClose - 2.0 * lastAtr;
        const simulatedStoploss = signal === 'BUY' ? lastClose - 0.8 * lastAtr : lastClose + 0.8 * lastAtr;

        mlTrainingData.atr.push(lastAtr);
        mlTrainingData.price.push(lastClose);
        mlTrainingData.targets.push(simulatedTarget);
        mlTrainingData.stoplosses.push(simulatedStoploss);

        // मेमोरी समस्याओं को रोकने और मॉडल को प्रतिक्रियाशील रखने के लिए प्रशिक्षण डेटा आकार सीमित करें
        const MAX_TRAINING_DATA = 500;
        if (mlTrainingData.atr.length > MAX_TRAINING_DATA) {
            mlTrainingData.atr.shift();
            mlTrainingData.price.shift();
            mlTrainingData.targets.shift();
            mlTrainingData.stoplosses.shift();
        }
    }

    // यदि पर्याप्त नया डेटा है तो ML मॉडल को फिर से प्रशिक्षित करें
    if (mlModels.targetModel === null && mlTrainingData.atr.length >= 50) { // 50 डेटा बिंदुओं के बाद प्रारंभिक प्रशिक्षण
        const trainedModels = trainMLModel(mlTrainingData.atr, mlTrainingData.price, mlTrainingData.targets, mlTrainingData.stoplosses);
        mlModels.targetModel = trainedModels.targetModel;
        mlModels.stoplossModel = trainedModels.stoplossModel;
    } else if (mlTrainingData.atr.length % 20 === 0 && mlTrainingData.atr.length > 50) { // हर 20 नए डेटा बिंदुओं पर फिर से प्रशिक्षित करें
        const trainedModels = trainMLModel(mlTrainingData.atr, mlTrainingData.price, mlTrainingData.targets, mlTrainingData.stoplosses);
        mlModels.targetModel = trainedModels.targetModel;
        mlModels.stoplossModel = trainedModels.stoplossModel;
    }


    return { signal, lastClose, lastRsi, lastEma, lastMacd, lastVolume, lastVolumeSMA, lastAtr };
}

// जांचें कि क्या ट्रेड लक्ष्य या स्टॉपलॉस से टकराया है
function checkIfHit(currentPrice, trade) {
    if (!trade || trade.status !== 'active') return false;

    // फ़्लोटिंग पॉइंट तुलनाओं के लिए एक छोटा सा सहिष्णुता का उपयोग करें
    const tolerance = 0.000001;

    if (trade.signal === 'BUY') {
        if (currentPrice >= trade.target - tolerance) return 'target';
        if (currentPrice <= trade.stoploss + tolerance) return 'stoploss';
    } else { // SELL
        if (currentPrice <= trade.target + tolerance) return 'target';
        if (currentPrice >= trade.stoploss - tolerance) return 'stoploss';
    }
    return false;
}

// संकेतों की जांच करने और भेजने के लिए मुख्य लॉजिक
async function checkSymbol(symbol) { // अब एक ही सिंबल स्वीकार करता है
    console.log(`--- ${symbol} की जाँच की जा रही है ---`);
    const candles = await fetchKlines(symbol, INTERVAL);
    const price = await fetchCurrentPrice(symbol);

    if (!candles || !price || candles.length === 0) {
        console.warn(`${symbol}: डेटा पर्याप्त नहीं है या मूल्य फ़ेच विफल हो गया है. छोड़ रहे हैं.`);
        return;
    }

    const analysis = analyzeData(candles);
    if (!analysis) {
        console.warn(`${symbol}: विश्लेषण विफल हो गया. छोड़ रहे हैं.`);
        return;
    }

    // सभी सक्रिय उपयोगकर्ताओं के माध्यम से दोहराएँ
    for (const chatId of USER_CHAT_IDS) {
        // यदि उपयोगकर्ता सक्रिय है तो ही सिग्नल भेजें
        if (userStatus[chatId] !== true) {
            // console.log(`उपयोगकर्ता ${chatId} निष्क्रिय है. ${symbol} के लिए सिग्नल छोड़ रहे हैं.`);
            continue;
        }

        if (!activeTrades[chatId]) activeTrades[chatId] = {};
        if (!lastSignalSent[chatId]) lastSignalSent[chatId] = {};

        const trade = activeTrades[chatId][symbol];

        // --- सक्रिय ट्रेड स्थिति को संभालें ---
        if (trade && trade.status === 'active') {
            const hit = checkIfHit(price, trade);
            if (hit) {
                const pnl = (trade.signal === 'BUY') ? (price - trade.entry) : (trade.entry - price);
                await bot.sendMessage(chatId, `✅ *${symbol} ${trade.signal} ट्रेड बंद हुआ!* ✅
*एंट्री:* ${trade.entry.toFixed(2)} USDT
*एग्जिट:* ${price.toFixed(2)} USDT
*परिणाम:* ${hit.toUpperCase()}
*P&L:* ${pnl.toFixed(2)} USDT`, { parse_mode: 'Markdown' });
                trade.status = 'closed'; // बंद के रूप में चिह्नित करें
                delete activeTrades[chatId][symbol]; // सक्रिय ट्रेडों से हटाएँ
                lastSignalSent[chatId][symbol] = null; // इस सिंबल के लिए अंतिम सिग्नल रीसेट करें
                console.log(`${chatId} के लिए ${symbol} के लिए ट्रेड बंद हुआ. परिणाम: ${hit}`);
            } else {
                // सक्रिय ट्रेड के बारे में उपयोगकर्ता को अपडेट करें
                // आप स्पैम से बचने के लिए इसे कम बार करना चाह सकते हैं
                // console.log(`${chatId} के लिए ${symbol} के लिए ट्रेड अभी भी सक्रिय है. वर्तमान मूल्य: ${price.toFixed(2)}`);
            }
            continue; // अगले उपयोगकर्ता/सिंबल पर जाएँ
        }

        // --- नए सिग्नल जेनरेट करें और भेजें ---
        if (analysis.signal !== 'HOLD' && !activeTrades[chatId][symbol]) {
            // ML मॉडल का उपयोग करके लक्ष्यों की गणना करें
            const { target, stoploss } = calculateTargets(analysis.signal, price, analysis.lastAtr);

            const signalMsg = `📊 *${symbol} नया सिग्नल!* 📊
*प्रकार:* ${analysis.signal}
*एंट्री:* ${price.toFixed(2)} USDT
*🎯 लक्ष्य:* ${target.toFixed(2)} USDT
*🛑 स्टॉपलॉस:* ${stoploss.toFixed(2)} USDT
*R:R अनुपात:* ${(Math.abs(target - price) / Math.abs(stoploss - price)).toFixed(2)}:1

*--- विश्लेषण सारांश ---*
*RSI:* ${analysis.lastRsi.toFixed(2)} (>${analysis.signal === 'BUY' ? '50' : '<50'})
*EMA (14):* ${analysis.lastEma.toFixed(2)} (${analysis.signal === 'BUY' ? 'मूल्य > EMA' : 'मूल्य < EMA'})
*MACD:* ${analysis.lastMacd.MACD.toFixed(2)} (सिग्नल: ${analysis.lastMacd.signal.toFixed(2)})
*वॉल्यूम:* ${analysis.lastVolume.toFixed(0)} (SMA ${analysis.lastVolumeSMA.toFixed(0)})

_यह एक स्वचालित सिग्नल है. हमेशा अपना खुद का शोध करें._`;

            await bot.sendMessage(chatId, signalMsg, { parse_mode: 'Markdown' });

            // सक्रिय ट्रेड स्टोर करें
            activeTrades[chatId][symbol] = {
                signal: analysis.signal,
                entry: price,
                target,
                stoploss,
                atr: analysis.lastAtr,
                status: 'active',
                timestamp: Date.now()
            };
            lastSignalSent[chatId][symbol] = analysis.signal;
            console.log(`${chatId} को ${symbol} के लिए नया ${analysis.signal} सिग्नल भेजा गया.`);

        } else if (analysis.signal === 'HOLD' && lastSignalSent[chatId][symbol] !== 'HOLD') {
            // केवल HOLD भेजें यदि पिछला सिग्नल HOLD नहीं था
            await bot.sendMessage(chatId, `ℹ️ *${symbol}* सिग्नल: *HOLD*`, { parse_mode: 'Markdown' });
            lastSignalSent[chatId][symbol] = 'HOLD';
            console.log(`${chatId} को ${symbol} के लिए HOLD सिग्नल भेजा गया.`);
        }
    }
}


// --- बॉट कमांड हैंडलर ---

// Start कमांड
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!USER_CHAT_IDS.includes(chatId)) {
        USER_CHAT_IDS.push(chatId);
        saveUserChatIds(); // नया उपयोगकर्ता सहेजें
        userStatus[chatId] = true; // नए उपयोगकर्ताओं के लिए डिफ़ॉल्ट रूप से सक्रिय
        saveUserStatus();
        await bot.sendMessage(chatId, "👋 स्वागत है! आपको क्रिप्टो ट्रेडिंग सिग्नल बॉट में जोड़ा गया है. अब आपको चयनित सिंबल के लिए सिग्नल मिलेंगे. अपनी सदस्यता जांचने के लिए /status या कमांड के लिए /help का उपयोग करें.");
        console.log(`नया उपयोगकर्ता जोड़ा गया: ${chatId}`);
    } else {
        await bot.sendMessage(chatId, "आप पहले से ही सब्सक्राइब हैं! अपनी सेटिंग्स जांचने के लिए /status या कमांड के लिए /help का उपयोग करें.");
    }
});

// Help कमांड
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpMsg = `*उपलब्ध कमांड:*
/start - सिग्नल के लिए सब्सक्राइब करें.
/stop - सिग्नल से अनसब्सक्राइब करें.
/status - अपनी वर्तमान सिग्नल सदस्यता स्थिति (सक्रिय/निष्क्रिय) और सक्रिय ट्रेड देखें.
/toggle - अपनी सिग्नल सदस्यता को चालू/बंद करें.
/help - यह हेल्प मैसेज दिखाएँ.

_कृपया याद रखें, ये शैक्षिक उद्देश्यों के लिए स्वचालित सिग्नल हैं. हमेशा अपना खुद का शोध करें और अपने जोखिम का प्रबंधन करें._`;
    await bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// Stop कमांड
bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;
    const index = USER_CHAT_IDS.indexOf(chatId);
    if (index > -1) {
        USER_CHAT_IDS.splice(index, 1);
        delete userStatus[chatId]; // स्थिति भी हटाएँ
        delete activeTrades[chatId]; // सक्रिय ट्रेड साफ़ करें
        delete lastSignalSent[chatId]; // अंतिम भेजे गए सिग्नल साफ़ करें
        saveUserChatIds();
        saveUserStatus();
        await bot.sendMessage(chatId, "😔 आपको अनसब्सक्राइब कर दिया गया है. अब आपको सिग्नल नहीं मिलेंगे. आप /start के साथ कभी भी फिर से सब्सक्राइब कर सकते हैं.");
        console.log(`उपयोगकर्ता अनसब्सक्राइब किया गया: ${chatId}`);
    } else {
        await bot.sendMessage(chatId, "आप वर्तमान में सब्सक्राइब नहीं हैं. सब्सक्राइब करने के लिए /start का उपयोग करें.");
    }
});

// Status कमांड टॉगल बटन के साथ
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const isActive = userStatus[chatId] ?? false; // यदि सेट नहीं है तो डिफ़ॉल्ट रूप से गलत

    let statusMsg = `आपकी सिग्नल सदस्यता स्थिति है: *${isActive ? "🟢 सक्रिय" : "🔴 निष्क्रिय"}*`;

    // यदि कोई सक्रिय ट्रेड है तो प्रदर्शित करें
    if (activeTrades[chatId] && Object.keys(activeTrades[chatId]).length > 0) {
        statusMsg += `\n\n*आपके सक्रिय ट्रेड:*`;
        for (const symbol in activeTrades[chatId]) {
            const trade = activeTrades[chatId][symbol];
            if (trade.status === 'active') {
                statusMsg += `\n- *${symbol}* (${trade.signal}): एंट्री ${trade.entry.toFixed(2)}, लक्ष्य ${trade.target.toFixed(2)}, स्टॉपलॉस ${trade.stoploss.toFixed(2)}`;
            }
        }
    } else {
        statusMsg += `\n\nआपके पास कोई सक्रिय ट्रेड नहीं है.`;
    }

    await bot.sendMessage(chatId, statusMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: isActive ? "सिग्नल निष्क्रिय करें" : "सिग्नल सक्रिय करें", callback_data: 'toggle_status' }]
            ]
        }
    });
});

// कॉलबैक बटन प्रेस (toggle_status के लिए) को संभालें
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data === 'toggle_status') {
        const currentStatus = userStatus[chatId] ?? false;
        userStatus[chatId] = !currentStatus; // स्थिति को टॉगल करें
        saveUserStatus();

        const newStatusText = userStatus[chatId] ? "🟢 सक्रिय" : "🔴 निष्क्रिय";
        await bot.editMessageText(`आपकी सिग्नल सदस्यता स्थिति अब है: *${newStatusText}*`, {
            chat_id: chatId,
            message_id: msg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: userStatus[chatId] ? "सिग्नल निष्क्रिय करें" : "सिग्नल सक्रिय करें", callback_data: 'toggle_status' }]
                ]
            }
        });
        await bot.answerCallbackQuery(callbackQuery.id, { text: `सिग्नल ${userStatus[chatId] ? 'सक्रिय' : 'निष्क्रिय'}.` });
        console.log(`उपयोगकर्ता ${chatId} ने स्थिति को ${userStatus[chatId]} पर टॉगल किया.`);
    } else {
        // लोडिंग स्पिनर को रोकने के लिए किसी भी अन्य कॉलबैक क्वेरी का उत्तर दें
        await bot.answerCallbackQuery(callbackQuery.id);
    }
});


// --- मुख्य लूप ---
async function mainLoop() {
    // सुनिश्चित करें कि डेटा डायरेक्टरी मौजूद है
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }

    loadUserChatIds();
    loadUserStatus();
    initializeMLTrainingData(); // ML मॉडल को शुरू करने के लिए कुछ डमी डेटा के साथ प्रारंभ करें

    // प्रारंभिक प्रशिक्षण यदि initializeMLTrainingData द्वारा पर्याप्त डेटा प्रदान किया गया है
    if (mlTrainingData.atr.length >= 50 && mlModels.targetModel === null) {
        const trainedModels = trainMLModel(mlTrainingData.atr, mlTrainingData.price, mlTrainingData.targets, mlTrainingData.stoplosses);
        mlModels.targetModel = trainedModels.targetModel;
        mlModels.stoplossModel = trainedModels.stoplossModel;
    }


    while (true) {
        console.log(`\n--- नया विश्लेषण चक्र ${new Date().toLocaleString()} पर शुरू हो रहा है ---`);

        // अब केवल SINGLE_SYMBOL_TO_TRACK को चेक करें
        await checkSymbol(SINGLE_SYMBOL_TO_TRACK);

        console.log(`--- ${SINGLE_SYMBOL_TO_TRACK} के लिए चक्र पूरा हुआ. अगले चक्र के लिए ${INTERVAL} प्रतीक्षा कर रहा है ---`);
        // चुने गए इंटरवल की अवधि के लिए प्रतीक्षा करें (उदाहरण के लिए, 1h मोमबत्तियों के लिए 1 घंटा)
        // '1h' जैसे इंटरवल को मिलीसेकंड में बदलें
 const intervalInMs = parseInt(INTERVAL) * 60 * 1000; 
        await new Promise(r => setTimeout(r, intervalInMs));
    }
}

// बॉट शुरू करें
mainLoop();
console.log('क्रिप्टो ट्रेडिंग सिग्नल बॉट शुरू हुआ!');
console.log(`बॉट वर्तमान में ट्रैक कर रहा है: ${SINGLE_SYMBOL_TO_TRACK}`);
console.log('टेलीग्राम पर बॉट को /start भेजकर सदस्यता लें.');