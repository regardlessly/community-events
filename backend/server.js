'use strict';
const express = require('express');
const path    = require('path');
const { db }  = require('./db');

const eventsRouter = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Serve the frontend as static files from the same process.
// API routes are registered first so /api/* is never intercepted by static.
app.use('/api/events', eventsRouter);

app.get('/api/status', (req, res) => {
  res.json({ ok: true, service: 'Community Events API', time: new Date().toISOString() });
});

// Serve frontend (relative to repo root, one level up from backend/)
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));

// SPA fallback — serve index.html for any non-API path
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`[server] Community Events running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[server] Startup failed:', err);
  process.exit(1);
});
