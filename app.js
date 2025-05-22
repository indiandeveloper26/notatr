const express = require('express');
const app = express();
const PORT = 4000;

app.get('/', (req, res) => {
  res.send('Hello from Node.js server!');
});

// localhost ki jagah 0.0.0.0 par listen karo taaki bahar se bhi access ho sake
app.listen(PORT, 4000, () => {
  console.log(`✅ Server running on http://4000:${PORT}`);
});
