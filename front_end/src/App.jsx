import { useEffect, useState } from 'react'
import { getReadings, getStakes } from './api/client'
import './App.css'

const POLL_INTERVAL_MS = 3000
const DASHBOARD_STORAGE_KEY = 'green_calx_dashboard_stakes'

function loadAddedStakeIds() {
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function saveAddedStakeIds(ids) {
  localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(ids))
}

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatValue(value, decimals = 1) {
  if (value == null) return '—'
  return Number(value).toFixed(decimals)
}

function App() {
  const [discoverableStakes, setDiscoverableStakes] = useState([])
  const [addedStakeIds, setAddedStakeIds] = useState(loadAddedStakeIds)
  const [selectedStake, setSelectedStake] = useState(null)
  const [readings, setReadings] = useState([])
  const [loadingStakes, setLoadingStakes] = useState(true)
  const [loadingReadings, setLoadingReadings] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showAddPanel, setShowAddPanel] = useState(false)

  const dashboardStakes = discoverableStakes.filter((stake) =>
    addedStakeIds.includes(stake.stake_id),
  )
  const addableStakes = discoverableStakes.filter(
    (stake) => !addedStakeIds.includes(stake.stake_id),
  )

  useEffect(() => {
    saveAddedStakeIds(addedStakeIds)
  }, [addedStakeIds])

  useEffect(() => {
    let cancelled = false

    async function loadStakes() {
      setLoadingStakes(true)
      setError(null)
      try {
        const stakesData = await getStakes()
        if (cancelled) return
        setDiscoverableStakes(stakesData)
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'Failed to load plants')
      } finally {
        if (!cancelled) setLoadingStakes(false)
      }
    }

    loadStakes()
    const intervalId = setInterval(loadStakes, POLL_INTERVAL_MS * 4)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!selectedStake) {
      setReadings([])
      return undefined
    }

    let cancelled = false

    async function loadReadings({ initial = false } = {}) {
      if (initial) {
        setLoadingReadings(true)
        setError(null)
      }

      try {
        const readingsData = await getReadings({
          stakeId: selectedStake.stake_id,
          limit: 100,
        })
        if (cancelled) return
        setReadings(readingsData)
        setLastUpdated(new Date())
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'Failed to load readings')
        if (initial) setReadings([])
      } finally {
        if (!cancelled && initial) setLoadingReadings(false)
      }
    }

    loadReadings({ initial: true })
    const intervalId = setInterval(() => loadReadings(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [selectedStake])

  const latest = readings[0] ?? null

  function handleSelectStake(stake) {
    setSelectedStake((current) =>
      current?.stake_id === stake.stake_id ? null : stake,
    )
  }

  function handleAddStake(stake) {
    setAddedStakeIds((current) =>
      current.includes(stake.stake_id) ? current : [...current, stake.stake_id],
    )
  }

  function handleRemoveStake(stake) {
    setAddedStakeIds((current) => current.filter((id) => id !== stake.stake_id))
    setSelectedStake((current) =>
      current?.stake_id === stake.stake_id ? null : current,
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-row">
          <h1>Green Calx</h1>
          <button
            type="button"
            className="icon-button icon-button--add"
            onClick={() => setShowAddPanel(true)}
            aria-label="Add plant"
          >
            +
          </button>
        </div>
        <p className="subtitle">Select a plant to view its sensor readings</p>
      </header>

      {loadingStakes && <p className="status status-loading">Loading plants…</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loadingStakes && !error && dashboardStakes.length === 0 && (
        <p className="status status-empty">
          No plants on your dashboard yet. Tap + to add a discovered plant.
        </p>
      )}

      {!loadingStakes && dashboardStakes.length > 0 && (
        <section className="plant-grid" aria-label="Plants">
          {dashboardStakes.map((stake) => {
            const isSelected = selectedStake?.stake_id === stake.stake_id
            return (
              <div key={stake.stake_id} className="plant-card-wrap">
                <button
                  type="button"
                  className="icon-button icon-button--remove"
                  onClick={() => handleRemoveStake(stake)}
                  aria-label={`Remove ${stake.species}`}
                >
                  −
                </button>
                <button
                  type="button"
                  className={`plant-card${isSelected ? ' plant-card--selected' : ''}`}
                  onClick={() => handleSelectStake(stake)}
                  aria-pressed={isSelected}
                >
                  <span className="plant-icon" aria-hidden="true">🌱</span>
                  <span className="plant-species">{stake.species}</span>
                  <span className="plant-stake-id">{stake.stake_id}</span>
                </button>
              </div>
            )
          })}
        </section>
      )}

      {!selectedStake && !loadingStakes && dashboardStakes.length > 0 && (
        <p className="hint">Tap a plant above to see moisture, temperature, humidity, and light.</p>
      )}

      {showAddPanel && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddPanel(false)}
          role="presentation"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-plant-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-plant-title">Add plant</h2>
              <button
                type="button"
                className="icon-button icon-button--close"
                onClick={() => setShowAddPanel(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {addableStakes.length === 0 ? (
              <p className="modal-empty">
                {discoverableStakes.length === 0
                  ? 'No plants discovered yet. Stakes will appear here once they send data.'
                  : 'All discovered plants are already on your dashboard.'}
              </p>
            ) : (
              <ul className="add-list">
                {addableStakes.map((stake) => (
                  <li key={stake.stake_id}>
                    <button
                      type="button"
                      className="add-list-item"
                      onClick={() => {
                        handleAddStake(stake)
                        setShowAddPanel(false)
                      }}
                    >
                      <span className="add-list-species">{stake.species}</span>
                      <span className="add-list-id">{stake.stake_id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedStake && (
        <section className="telemetry" aria-label={`Telemetry for ${selectedStake.species}`}>
          <div className="telemetry-header">
            <div>
              <h2>{selectedStake.species}</h2>
              <p className="telemetry-stake">{selectedStake.stake_id}</p>
            </div>
            {lastUpdated && (
              <p className="telemetry-updated">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          {loadingReadings && (
            <p className="status status-loading">Loading readings…</p>
          )}

          {!loadingReadings && readings.length === 0 && (
            <p className="status status-empty">No readings for this plant yet.</p>
          )}

          {!loadingReadings && latest && (
            <div className="metric-cards">
              <article className="metric-card">
                <h3>Moisture</h3>
                <p className="metric-value">{formatValue(latest.moisture, 0)}</p>
                <p className="metric-note">Raw ADC (0–4095)</p>
              </article>
              <article className="metric-card">
                <h3>Temperature</h3>
                <p className="metric-value">{formatValue(latest.temperature)} °C</p>
              </article>
              <article className="metric-card">
                <h3>Humidity</h3>
                <p className="metric-value">{formatValue(latest.humidity)} %</p>
              </article>
              <article className="metric-card">
                <h3>Lux</h3>
                <p className="metric-value">{formatValue(latest.lux, 0)}</p>
              </article>
            </div>
          )}

          {!loadingReadings && readings.length > 0 && (
            <div className="readings-table-section">
              <h3>Recent readings</h3>
              <div className="table-wrap">
                <table className="readings-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Moisture</th>
                      <th>Temp (°C)</th>
                      <th>Humidity (%)</th>
                      <th>Lux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((reading) => (
                      <tr key={reading.id}>
                        <td>{formatTimestamp(reading.timestamp)}</td>
                        <td>{formatValue(reading.moisture, 0)}</td>
                        <td>{formatValue(reading.temperature)}</td>
                        <td>{formatValue(reading.humidity)}</td>
                        <td>{formatValue(reading.lux, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
