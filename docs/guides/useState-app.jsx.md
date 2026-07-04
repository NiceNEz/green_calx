# useState in App.jsx

**File:** `front_end/src/App.jsx`  
**Related:** [App.jsx guide](./app-jsx.md) (full dashboard walkthrough)

---

## What `useState` is

`useState` is a React hook that gives a component **memory between renders**. Each call returns a pair:

1. **Current value** — what the UI should show right now.
2. **Setter function** — updates that value and triggers a re-render.

Without state, `App` would render once with empty defaults and never change when the API responds or the user clicks a plant.

At the top of `App`, seven pieces of state are declared:

```jsx
const [stakes, setStakes] = useState([])
const [selectedStake, setSelectedStake] = useState(null)
const [readings, setReadings] = useState([])
const [loadingStakes, setLoadingStakes] = useState(true)
const [loadingReadings, setLoadingReadings] = useState(false)
const [error, setError] = useState(null)
const [lastUpdated, setLastUpdated] = useState(null)
```

Each line is independent: updating `stakes` does not touch `selectedStake`, and so on.

---

## The seven state variables at a glance

| State | Starts as | Role |
|-------|-----------|------|
| `stakes` | `[]` | List of plants from the API |
| `selectedStake` | `null` | Which plant the user picked (or none) |
| `readings` | `[]` | Sensor history for the selected plant |
| `loadingStakes` | `true` | Show "Loading plants…" on first fetch |
| `loadingReadings` | `false` | Show "Loading readings…" on first fetch for a plant |
| `error` | `null` | Shared error message for either fetch |
| `lastUpdated` | `null` | When readings were last refreshed |

Together they cover **data** (`stakes`, `readings`), **UI flags** (`loadingStakes`, `loadingReadings`, `error`), **user choice** (`selectedStake`), and **freshness** (`lastUpdated`).

---

## Deep dive: `selectedStake`

This is the clearest example of what `useState` buys you: the dashboard reacts to a user click and coordinates other logic (fetching readings) without reloading the page.

### Declaration

```jsx
const [selectedStake, setSelectedStake] = useState(null)
```

- **`selectedStake`** — either `null` (no plant chosen) or an object like `{ stake_id: "abc", species: "Basil" }` from the API.
- **`setSelectedStake`** — the only supported way to change that value. Assigning to `selectedStake` directly would not re-render.

Starting at `null` matches the initial UI: show the plant grid and a hint ("Tap a plant above…"), but hide the telemetry panel.

### How it gets updated

When the user clicks a plant card, `handleSelectStake` runs:

```jsx
function handleSelectStake(stake) {
  setSelectedStake((current) =>
    current?.stake_id === stake.stake_id ? null : stake,
  )
}
```

This uses the **functional updater** form of `setState`: React passes the previous value as `current`, and the return value becomes the new state.

Behavior:

- Click an unselected plant → `setSelectedStake(stake)` — that plant becomes selected.
- Click the same plant again → `setSelectedStake(null)` — toggle off, back to "no selection."

The toggle pattern avoids needing a separate "deselect" control.

### What re-renders when it changes

After `setSelectedStake`, React re-runs the whole `App` function. JSX reads the new `selectedStake` and shows or hides sections:

| `selectedStake` | UI effect |
|-----------------|-----------|
| `null` | Hint visible; telemetry section not rendered |
| `{ stake_id, species, … }` | Telemetry section visible with that plant's name and ID |

Plant cards also compare against it for styling:

```jsx
const isSelected = selectedStake?.stake_id === stake.stake_id
// ...
className={`plant-card${isSelected ? ' plant-card--selected' : ''}`}
aria-pressed={isSelected}
```

So `useState` here is not just storing an object — it drives **conditional rendering** and **visual feedback** on every render.

### Side effect: the readings `useEffect`

`selectedStake` is listed in a `useEffect` dependency array:

```jsx
useEffect(() => {
  if (!selectedStake) {
    setReadings([])
    return undefined
  }
  // fetch readings for selectedStake.stake_id, poll every 3s
}, [selectedStake])
```

When `setSelectedStake` changes the value:

1. React re-renders with the new selection.
2. The effect from the previous render cleans up (clears its interval).
3. The effect runs again with the new `selectedStake`.

If the user deselects (`null`), the effect clears `readings` and stops polling. If they pick a plant, it starts loading and polling that plant's data.

So one `useState` call is the **hub** between user input, visible UI, and async data loading — that is the typical React pattern.

### Timeline (one user click)

```text
User clicks "Basil" card
    → handleSelectStake(basilStake)
    → setSelectedStake(basilStake)
    → React re-renders App
        → telemetry section appears
        → Basil card gets plant-card--selected
    → useEffect([selectedStake]) runs
        → setLoadingReadings(true) on first load
        → getReadings({ stakeId: basilStake.stake_id })
        → setReadings(data), setLastUpdated(...), setLoadingReadings(false)
    → React re-renders again with readings on screen
```

Multiple re-renders are normal: each setter (`setSelectedStake`, then `setReadings`, etc.) can cause another render. React batches many updates in event handlers, but async callbacks (after `await getReadings`) usually cause a separate render when they complete.

---

## How the other state hooks fit the same model

The same `[value, setValue] = useState(initial)` pattern appears everywhere else in `App`:

- **`stakes` / `setStakes`** — filled by the mount effect when `getStakes()` resolves; the plant grid maps over `stakes`.
- **`readings` / `setReadings`** — filled by the effect that depends on `selectedStake`; powers metric cards and the table.
- **`loadingStakes` / `loadingReadings`** — boolean flags so the UI can show spinners without guessing from empty arrays.
- **`error` / `setError`** — one string shared by both fetch paths; any failure surfaces in the same banner.
- **`lastUpdated` / `setLastUpdated`** — set when a readings poll succeeds; purely for display ("Updated 3:45:12 PM").

None of this state lives in the DOM or in global variables. It lives in React's store for this component instance and flows **down into JSX** as plain JavaScript values.

---

## Mental model

Treat each `useState` line as a **labeled box**:

- Read the label in render (`selectedStake`, `readings`, …).
- Write to the box only through its setter (`setSelectedStake`, …).
- When a box changes, React redraws the component tree that depends on it.

In `App.jsx`, user interaction mainly writes to `selectedStake`; network callbacks write to `stakes`, `readings`, loading flags, and `error`. That split keeps "what the user chose" separate from "what the server returned," which keeps the component easier to reason about than a single giant state object.

For the full dashboard flow (effects, polling, UI sections), see [App.jsx](./app-jsx.md).
