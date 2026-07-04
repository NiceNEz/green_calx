# App.jsx — Frontend dashboard

**File:** `front_end/src/App.jsx`  
**Role:** Single-page React dashboard. Lists registered plants (stakes), lets you pick one, and shows live + historical sensor readings.

---

## One-sentence summary

`App.jsx` loads the list of plants from the API, lets the user toggle-select one plant, then polls that plant's readings every 3 seconds and renders summary cards plus a history table.

---

## File structure (top to bottom)

| Lines (approx) | Section | Purpose |
|----------------|---------|---------|
| 1–3 | Imports | React hooks, API functions, CSS |
| 5 | Constant | `POLL_INTERVAL_MS = 3000` — base poll rate for readings |
| 7–15 | Helpers | `formatTimestamp`, `formatValue` — display formatting |
| 17–24 | State | All React `useState` hooks |
| 26–51 | Effect #1 | Load + refresh plant list |
| 53–92 | Effect #2 | Load + refresh readings when a plant is selected |
| 94 | Derived | `latest = readings[0]` — most recent reading |
| 96–100 | Handler | `handleSelectStake` — toggle plant selection |
| 102–218 | JSX | Page layout and conditional UI |
| 221 | Export | Default export for `main.jsx` |

---

## Helper functions

### `formatTimestamp(iso)`

- Input: ISO 8601 string from the server (e.g. `"2026-07-04T22:01:00Z"`).
- Output: locale-formatted date/time string, or `"—"` if missing.

### `formatValue(value, decimals = 1)`

- Input: numeric sensor value.
- Output: fixed-decimal string, or `"—"` if `null`/`undefined`.
- Moisture and lux use `0` decimals; temperature/humidity use default `1`.

---

## State variables

| State | Initial | Set by | Used for |
|-------|---------|--------|----------|
| `stakes` | `[]` | Effect #1 | Plant grid buttons |
| `selectedStake` | `null` | User click | Which plant's readings to fetch |
| `readings` | `[]` | Effect #2 | Metric cards + table |
| `loadingStakes` | `true` | Effect #1 | "Loading plants…" message |
| `loadingReadings` | `false` | Effect #2 | "Loading readings…" on first fetch |
| `error` | `null` | Both effects | Red error banner (shared) |
| `lastUpdated` | `null` | Effect #2 | "Updated HH:MM:SS" in telemetry header |

**Note:** `error` is shared between stake loading and reading loading. A readings error can overwrite a resolved stakes state (and vice versa).

---

## Effect #1 — Load plants (runs once on mount)

```text
mount → loadStakes() immediately
      → setInterval(loadStakes, 12_000)
unmount → cancelled = true, clearInterval
```

Inside `loadStakes`:

1. `setLoadingStakes(true)`, clear error.
2. `await getStakes()` → array of `{ stake_id, species }`.
3. On success: `setStakes(stakesData)`.
4. On failure: `setError(message)`.
5. Always (if not cancelled): `setLoadingStakes(false)`.

**Cancellation pattern:** `cancelled` flag prevents state updates after unmount or before a newer run finishes (standard React async cleanup).

---

## Effect #2 — Load readings (runs when `selectedStake` changes)

**Dependency:** `[selectedStake]`

When `selectedStake` is `null`:

- Clears `readings` to `[]`.
- Returns early (no interval, no fetch).

When a plant is selected:

```text
select plant → loadReadings({ initial: true })  // shows loading spinner
             → setInterval(loadReadings, 3_000) // silent background refresh
change plant / deselect → cleanup previous interval
```

Inside `loadReadings`:

1. If `initial`: show loading, clear error.
2. `await getReadings({ stakeId, limit: 100 })`.
3. On success: update `readings`, `lastUpdated`, clear error.
4. On failure: set error; if `initial`, clear readings.
5. If `initial`: hide loading.

**Why `initial` flag?** First load shows "Loading readings…"; subsequent polls update data quietly without flashing the loading state.

---

## Derived data

```js
const latest = readings[0] ?? null
```

The API returns readings sorted **newest first**, so index `0` is the current snapshot shown in the four metric cards.

---

## User interaction — `handleSelectStake`

Clicking a plant card **toggles** selection:

- Not selected → becomes selected (triggers Effect #2).
- Already selected → deselects (`selectedStake = null`, readings cleared).

This is a toggle, not "always pick exactly one."

---

## UI sections (render tree)

```text
.dashboard
├── header ("Green Calx" + subtitle)
├── status messages (loading / error / empty — mutually conditional)
├── .plant-grid (only if stakes loaded and non-empty)
│   └── button.plant-card × N  (species + stake_id)
├── hint (stakes exist but none selected)
└── .telemetry (only if selectedStake)
    ├── header (species, stake_id, lastUpdated)
    ├── loading / empty states
    ├── .metric-cards (latest reading: moisture, temp, humidity, lux)
    └── .readings-table (up to 100 rows, all columns)
```

### Conditional rendering rules

| Condition | What shows |
|-----------|------------|
| `loadingStakes` | "Loading plants…" |
| `error` | Error text (any phase) |
| `!loadingStakes && stakes.length === 0` | "No plants registered yet…" |
| `stakes.length > 0` | Plant grid |
| `!selectedStake && stakes.length > 0` | Hint to tap a plant |
| `selectedStake` | Full telemetry section |

### Accessibility

- Plant grid: `aria-label="Plants"`.
- Each card: `aria-pressed={isSelected}` on a `<button>`.
- Telemetry section: dynamic `aria-label` with species name.

---

## Styling

Visual layout lives in `front_end/src/App.css` (grid, cards, table, status colors). `App.jsx` only applies BEM-like class names (`plant-card--selected`, `status-error`, etc.).

---

## What App.jsx does *not* do

- No routing (single view only).
- No charts/graphs (table + snapshot cards only).
- No POST/create plant UI (stakes come from API/device uploads).
- No use of `getHealth()` (defined in client but unused here).
- No global state library — all state is local to this component.

---

## Mental model for notes

Think of `App.jsx` as **two independent polling loops** tied together by user selection:

1. **Plant catalog loop** — "What devices/plants exist?"
2. **Telemetry loop** — "What did this plant's sensors report recently?" (only when selected)

Everything else is formatting and conditional UI around those two data streams.
