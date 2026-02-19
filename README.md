# Community Events Singapore

A web app consolidating senior community events from People's Association (PA), AIC, Neighbourhood Community Centres, and Silver Generation Office across Singapore, grouped by region and displayed in a calendar view.

## Quick Start

### 1. Install backend dependencies
```bash
cd backend
npm install
```

### 2. Start the backend API
```bash
npm start
# API runs at http://localhost:3001
# SQLite database auto-creates at backend/events.db
# 30 seed events inserted automatically on first run
```

### 3. Open the frontend

Open `frontend/index.html` with VS Code Live Server (or any static file server).

The frontend connects to the backend at `http://localhost:3001`.

## Features

- **Calendar view** — Monthly calendar with colour-coded event dots per day
- **Region filter** — Filter by Singapore planning area (Tampines, Jurong East, Woodlands, etc.)
- **Source filter** — Filter by PA, AIC, Community Centre, or Silver Generation Office
- **Category filter** — Health Screening, Exercise, Talk, Workshop, Social, Outing
- **Event detail modal** — Click any event card to see full details and organiser link
- **Keyboard navigation** — Arrow keys to browse months, Escape to close modal
- **Senior-accessible design** — 18px base font, high-contrast badges, large tap targets

## Colour Legend

| Colour | Source |
|--------|--------|
| Blue   | People's Association (PA) |
| Green  | AIC (Agency for Integrated Care) |
| Orange | Community Centres |
| Purple | Silver Generation Office |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (filter via `?region=`, `?source=`, `?category=`, `?month=`, `?year=`) |
| GET | `/api/events/:id` | Get single event |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/meta/regions` | List all regions |
| GET | `/api/events/meta/sources` | List all sources |
| GET | `/api/events/meta/categories` | List all categories |
| GET | `/api/status` | Health check |

## File Structure

```
backend/
  server.js          Express server + CORS
  db.js              SQLite setup, schema, auto-seed (30 events)
  routes/events.js   REST API handlers
  package.json
frontend/
  index.html         Main app page
  css/styles.css     All styles
  js/
    api.js           API communication (change API_BASE for production)
    calendar.js      Calendar rendering engine
    app.js           App controller: filters, modal, init
README.md
```

## Production Deployment

To serve frontend and backend from the same Express process, add to `server.js`:

```js
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));
```

Then set `API_BASE = ''` in `frontend/js/api.js`.
