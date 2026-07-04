# Server API — `server/app.py`

Flask HTTP server that receives sensor uploads from ESP32 stakes, stores them in PostgreSQL, and serves read APIs for the React dashboard.

---

## Stack

| Piece | Technology |
|-------|------------|
| Web framework | Flask |
| ORM | Flask-SQLAlchemy |
| Database | PostgreSQL (`esp32_db`) |
| CORS | `flask-cors` — allows `http://localhost:5173` |

Runs on `0.0.0.0:8080` with `debug=True` when started via `python app.py`.

---

## Database models

### `Stake`

Represents a physical plant monitor ("stake").

| Column | Type | Notes |
|--------|------|-------|
| `stake_id` | string | Primary key (e.g. `STAKE_C3_001`) |
| `species` | string | Display name (e.g. `Basil`) |

### `SensorData`

One row per sensor reading.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer | Auto primary key |
| `timestamp` | datetime | UTC, set on insert |
| `stake_id` | string | FK → `Stake.stake_id` |
| `moisture` | float | Raw ADC 0–4095 from firmware |
| `lux` | float | Light level |
| `humidity` | float | % RH |
| `temperature` | float | °C |

Both models implement `to_dict()` for JSON responses.

---

## Startup behavior

On import:

1. `db.create_all()` — creates tables if missing (no migrations).
2. **Orphan repair** — if readings exist for a `stake_id` with no `Stake` row, auto-creates `Stake(stake_id, species='Unknown')`.

This lets firmware POST readings before anyone registers a plant name.

---

## Helper — `ensure_stake(stake_id, species=None)`

Called on every `POST /api/data`:

- Creates stake if missing (`species` defaults to `'Unknown'`).
- If stake exists with `'Unknown'` and POST includes `species`, upgrades the name.

---

## Routes

### `POST /api/data` — ingest reading (firmware)

**Headers:** `Content-Type: application/json`

**Body fields:** `stake_id`, `moisture`, `lux`, `humidity`, `temperature` (all required for insert; missing keys → 500 today).

**Flow:**

1. Validate content type.
2. `ensure_stake(...)` 
3. Insert `SensorData` row.
4. Return `201` with `{ status, data_saved }`.

---

### `GET /api/readings` — dashboard history

**Query params:**

| Param | Required | Default |
|-------|----------|---------|
| `stake_id` | Yes | — |
| `limit` | No | 100 (max 1000) |

**Returns:** Readings for that stake, **newest first**.

---

### `GET /api/stakes` — dashboard plant list

**Returns:** All stakes ordered by `stake_id`.

---

### `POST /api/stakes` — register/update plant name

**Body:** `{ stake_id, species }` (both required).

- Creates new stake → `201`
- Updates existing species → `200`

Not exposed in the React UI yet; useful for manual setup.

---

### `GET /api/health` — liveness check

Returns `{ status: "success", message: "API is running" }`.

---

## Relationship to frontend

```text
App.jsx  →  client.js  →  GET /api/stakes
                       →  GET /api/readings

main.cpp →  HTTP POST  →  POST /api/data
```

The dashboard never writes data; it only reads. All writes come from devices (or manual POST).

---

## Configuration debt

- PostgreSQL URI is hardcoded: `postgresql://localhost:5432/esp32_db`
- No env-based config layer yet
- No request validation library — malformed JSON bodies can 500

See [DESIGN.md](../DESIGN.md) §5–6 for known risks.
