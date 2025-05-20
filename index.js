
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory user and trade store
let USER_CHAT_IDS = [];
let activeTrades = {};  // { chatId: { symbol: { signal, entry, target, stoploss } } }

// Start bot for a user (you can call this from frontend)
app.post('/start', (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: 'chatId is required' });

  if (!USER_CHAT_IDS.includes(chatId)) {
    USER_CHAT_IDS.push(chatId);
    return res.json({ message: '✅ Subscribed to signals' });
  } else {
    return res.json({ message: 'Already subscribed' });
  }
});

// Get active trades
app.get('/health', (req, res) => {
res.send("this is helth check api")
});

// Example route to manually add a trade (for testing)
app.post('/trade', (req, res) => {
  const { chatId, symbol, signal, entry, target, stoploss } = req.body;
  if (!chatId || !symbol || !signal || !entry || !target || !stoploss) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (!activeTrades[chatId]) activeTrades[chatId] = {};
  activeTrades[chatId][symbol] = { signal, entry, target, stoploss, time: Date.now() };

  return res.json({ message: 'Trade added' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = { USER_CHAT_IDS, activeTrades };
