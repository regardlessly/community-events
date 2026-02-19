'use strict';
const express = require('express');
const router  = express.Router();
const { db, USE_PG } = require('../db');

// ── Dynamic list query builder ────────────────────────────────────────────────
function listSQL(filters) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (filters.region)   { conditions.push(`region = $${i++}`);   params.push(filters.region); }
  if (filters.source)   { conditions.push(`source = $${i++}`);   params.push(filters.source); }
  if (filters.category) { conditions.push(`category = $${i++}`); params.push(filters.category); }

  if (filters.month) {
    conditions.push(
      USE_PG
        ? `EXTRACT(MONTH FROM date::date) = $${i++}`
        : `CAST(strftime('%m', date) AS INTEGER) = $${i++}`
    );
    params.push(parseInt(filters.month, 10));
  }

  if (filters.year) {
    conditions.push(
      USE_PG
        ? `EXTRACT(YEAR FROM date::date) = $${i++}`
        : `strftime('%Y', date) = $${i++}`
    );
    params.push(USE_PG ? parseInt(filters.year, 10) : String(filters.year));
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return { sql: `SELECT * FROM events ${where} ORDER BY date ASC, time ASC`, params };
}

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { sql, params } = listSQL(req.query);
    const events = await db.all(sql, params);
    res.json({ ok: true, count: events.length, events });
  } catch (err) {
    console.error('[events] list:', err.message);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// Metadata routes — registered BEFORE /:id to prevent wildcard shadowing
router.get('/meta/regions', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT region FROM events ORDER BY region ASC');
    res.json({ ok: true, regions: rows.map(r => r.region) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

router.get('/meta/sources', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT source FROM events ORDER BY source ASC');
    res.json({ ok: true, sources: rows.map(r => r.source) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

router.get('/meta/categories', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT DISTINCT category FROM events WHERE category IS NOT NULL ORDER BY category ASC'
    );
    res.json({ ok: true, categories: rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event) return res.status(404).json({ ok: false, error: 'Event not found' });
    res.json({ ok: true, event });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// POST /api/events
router.post('/', async (req, res) => {
  const { title, date, region, source, description, time, end_time,
          location, source_url, category, organizer, image_url } = req.body;
  if (!title || !date || !region || !source) {
    return res.status(400).json({ ok: false, error: 'title, date, region, source are required' });
  }
  try {
    const { lastInsertRowid } = await db.run(
      `INSERT INTO events
         (title,description,date,time,end_time,location,region,source,source_url,category,organizer,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [title, description, date, time, end_time, location, region, source, source_url, category, organizer, image_url]
    );
    const event = await db.get('SELECT * FROM events WHERE id = $1', [lastInsertRowid]);
    res.status(201).json({ ok: true, event });
  } catch (err) {
    console.error('[events] insert:', err.message);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  const { title, date, region, source, description, time, end_time,
          location, source_url, category, organizer, image_url } = req.body;
  try {
    const existing = await db.get('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Event not found' });
    await db.all(
      `UPDATE events SET
         title=$1,description=$2,date=$3,time=$4,end_time=$5,
         location=$6,region=$7,source=$8,source_url=$9,category=$10,organizer=$11,image_url=$12
       WHERE id=$13`,
      [title, description, date, time, end_time, location, region,
       source, source_url, category, organizer, image_url, req.params.id]
    );
    const event = await db.get('SELECT * FROM events WHERE id = $1', [req.params.id]);
    res.json({ ok: true, event });
  } catch (err) {
    console.error('[events] update:', err.message);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM events WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Event not found' });
    await db.all('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ ok: true, deleted: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

module.exports = router;
