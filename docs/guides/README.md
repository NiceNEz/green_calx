# Green Calx — System Guides

Note-taking guides for each part of the plant-monitor stack. Start with [Data flow](./data-flow.md) for the big picture, then drill into the component you care about.

| Guide | What it covers |
|-------|----------------|
| [Data flow](./data-flow.md) | End-to-end path: ESP32 → server → database → dashboard |
| [App.jsx](./app-jsx.md) | React dashboard: state, polling, UI sections |
| [API client](./api-client.md) | How the frontend talks to Flask (`fetch`, env vars) |
| [Server API](./server-api.md) | Flask routes, SQLAlchemy models, PostgreSQL |
| [Firmware](./firmware.md) | ESP32 wake/sense/POST/sleep cycle |

**Related:** [DESIGN.md](../DESIGN.md) (architecture + known issues), [TODO.md](../TODO.md) (backlog).

## Quick stack map

```
firmware/src/main.cpp     POST /api/data
        ↓
server/app.py             Flask + SQLAlchemy → PostgreSQL
        ↓
front_end/src/api/client.js   GET /api/stakes, GET /api/readings
        ↓
front_end/src/App.jsx     Dashboard UI (this is what you see in the browser)
```

**Run locally**

```bash
# Terminal 1 — server (needs PostgreSQL esp32_db)
cd server && source venv/bin/activate && python app.py

# Terminal 2 — frontend
cd front_end && npm run dev   # http://localhost:5173
```
