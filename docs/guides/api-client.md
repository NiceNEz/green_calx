# API client — `front_end/src/api/client.js`

Thin wrapper around `fetch` for the Flask backend. All HTTP details live here so `App.jsx` stays focused on UI state.

---

## Configuration

```js
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
```

| Source | Value |
|--------|-------|
| `.env` / `.env.local` | `VITE_API_BASE_URL=https://your-server:8080` |
| Default (dev) | `http://localhost:8080` |

Vite only exposes env vars prefixed with `VITE_` to browser code.

---

## Functions

### `getStakes()`

```http
GET {BASE}/api/stakes
```

**Returns:** `data.stakes` — array of `{ stake_id, species }`.

**Used by:** `App.jsx` Effect #1 (plant grid).

---

### `getReadings({ stakeId, limit = 100 })`

```http
GET {BASE}/api/readings?limit=100&stake_id={stakeId}
```

| Param | Required | Notes |
|-------|----------|-------|
| `stakeId` | Yes (for dashboard) | Server returns 400 without it |
| `limit` | No | Default 100; server caps at 1000 |

**Returns:** `data.readings` — array newest-first.

**Used by:** `App.jsx` Effect #2 (metric cards + table).

---

### `getHealth()`

```http
GET {BASE}/api/health
```

**Returns:** full JSON body (`{ status, message }`).

**Used by:** Nothing in the current UI — available for a future status indicator or startup check.

---

## Error handling pattern

Every function follows the same contract:

1. `fetch(url)`
2. If `!res.ok` → throw `Error(\`API error: ${status}\`)`
3. Parse JSON
4. If `data.status === "error"` → throw `Error(data.error)`
5. Otherwise return the useful payload slice

Callers (`App.jsx`) catch these and put `err.message` into the shared `error` state.

---

## Why a separate file?

- **Single place** to change base URL, headers, or auth later.
- **Testable** — you can mock these three functions without mounting React.
- **Reusable** — new components (charts, admin page) import the same client.

---

## Server endpoints (reference)

| Method | Path | Client function |
|--------|------|-----------------|
| GET | `/api/stakes` | `getStakes()` |
| GET | `/api/readings` | `getReadings()` |
| GET | `/api/health` | `getHealth()` |
| POST | `/api/data` | *(firmware only, not in client)* |
| POST | `/api/stakes` | *(not in client — register via curl/Postman)* |

See [server-api.md](./server-api.md) for request/response details.
