require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db/connection');
const apiRouter = require('./routes/api');
const chatRouter = require('./routes/chat');
const playerRouter = require('./routes/player');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);
app.use('/api/chat', chatRouter);
app.use('/api/player', playerRouter);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  // Verify db connection
  getDb();
  console.log(`Server running on http://localhost:${PORT}`);
});
