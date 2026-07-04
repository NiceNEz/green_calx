import { useEffect, useState } from 'react'
import { getReadings, getStakes } from './api/client'
import './App.css'

const POLL_INTERVAL_MS = 3000

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function formatValue(value, decimals = 1) {
  if (value == null) return '—'
  return Number(value).toFixed(decimals)
}

function App() {
  const [readings, setReadings] = useState([])
  const [stakes, setStakes] = useState([])
  const [selectedStake, setSelectedStake] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard({ initial = false } = {}) {
      if (initial) {
        setLoading(true)
        setError(null)
      }

      try {
        const [readingsData, stakesData] = await Promise.all([
          getReadings({ stakeId: selectedStake || undefined, limit: 100 }),
          getStakes(),
        ])

        if (cancelled) return

        setReadings(readingsData)
        setStakes(stakesData)
        setLastUpdated(new Date())
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'Failed to load dashboard data')
        if (initial) setReadings([])
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    loadDashboard({ initial: true })
    const intervalId = setInterval(() => loadDashboard(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [selectedStake])

  const latest = readings[0] ?? null

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Green Calx Dashboard</h1>
          <p className="subtitle">
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString()}`
              : 'Loading sensor data…'}
          </p>
        </div>

        <label className="stake-filter">
          <span>Stake</span>
          <select
            value={selectedStake}
            onChange={(e) => setSelectedStake(e.target.value)}
          >
            <option value="">All stakes</option>
            {stakes.map((stake) => (
              <option key={stake} value={stake}>
                {stake}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading && <p className="status status-loading">Loading readings…</p>}
      {error && <p className="status status-error">{error}</p>}
      {!loading && !error && readings.length === 0 && (
        <p className="status status-empty">No readings yet. POST data to the API to get started.</p>
      )}

      {!loading && !error && latest && (
        <section className="metric-cards">
          <article className="metric-card">
            <h2>Moisture</h2>
            <p className="metric-value">{formatValue(latest.moisture, 0)}</p>
            <p className="metric-note">Raw ADC (0–4095)</p>
          </article>
          <article className="metric-card">
            <h2>Temperature</h2>
            <p className="metric-value">{formatValue(latest.temperature)} °C</p>
          </article>
          <article className="metric-card">
            <h2>Humidity</h2>
            <p className="metric-value">{formatValue(latest.humidity)} %</p>
          </article>
          <article className="metric-card">
            <h2>Lux</h2>
            <p className="metric-value">{formatValue(latest.lux, 0)}</p>
          </article>
        </section>
      )}

      {!loading && !error && readings.length > 0 && (
        <section className="readings-table-section">
          <h2>Recent readings</h2>
          <div className="table-wrap">
            <table className="readings-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Stake</th>
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
                    <td>{reading.stake_id}</td>
                    <td>{formatValue(reading.moisture, 0)}</td>
                    <td>{formatValue(reading.temperature)}</td>
                    <td>{formatValue(reading.humidity)}</td>
                    <td>{formatValue(reading.lux, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
