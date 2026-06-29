# green_calx — To-Do / Roadmap

Prioritized backlog. Status: `[ ]` open · `[~]` in progress · `[x]` done.
See `docs/DESIGN.md` for architecture context.

## P0 — Get the framework fully working end-to-end

- [x] Align firmware ↔ server JSON contract (`stake_id`, `moisture`, `lux`, `temperature`, `humidity`).
- [x] Fix firmware `serverUrl` to hit `:8080/data` (was POSTing to root on port 80).
- [x] **Make WiFi association robust.** Switched to SSID-only connect (was pinned to BSSID +
      channel 8, but the omron mesh is on channel 7). Added boot diagnostics: network scan
      (SSID/channel/RSSI/auth-mode/BSSID), STA MAC print, and a disconnect-reason handler.
- [ ] **Resolve router-side auth rejection (BLOCKER).** With SSID-only connect the device now
      finds omron fine (WPA2_PSK, strong signal) but the AP rejects it at the 802.11 auth phase:
      reason `2` (`AUTH_EXPIRE`), repeating on every retry across multiple mesh BSSIDs. This
      occurs *before* the password is checked, and the password is confirmed correct — so the
      cause is router-side, most likely MAC access-control / new-device approval or a per-AP
      client cap. **Action:** allowlist/approve the ESP32-C3 STA MAC `14:63:93:C6:60:14` in the
      omron router admin (or run a phone-hotspot test to confirm firmware is good).
      *(Blocks runtime verification of the URL fix and the full pipeline.)*
- [ ] **Verify the URL fix end-to-end** once WiFi connects: confirm a real device POST lands in
      `sensor_data` with the firmware's payload (`stake_id=STAKE_C3_001`, raw moisture, etc.).
- [ ] Guard the boot-time WiFi diagnostics (scan / MAC / reason logging) behind a `DEBUG` flag so
      production boots stay quiet and fast.
- [ ] **Re-enable deep sleep** (`esp_deep_sleep_start()` in `main.cpp`) and confirm the
      wake → sense → POST → sleep cycle. Verify `TIME_TO_SLEEP` / `uS_TO_S_FACTOR` produce the
      intended interval.

## P1 — Configuration & secrets

- [ ] Firmware: move WiFi creds, BSSID/channel, `serverUrl`, pins, and sleep interval into a
      non-committed config header (e.g. `secrets.h` / `config.h`, git-ignored, with a sample).
- [ ] Server: load PostgreSQL URI, host/port, and debug flag from environment / config file
      instead of hardcoding in `app.py`.
- [ ] Ensure no real credentials remain in tracked source; add a `.env.example` / `secrets.h.example`.

## P1 — Server robustness

- [ ] Validate incoming JSON; return `400` with a clear message on missing/invalid fields
      (currently `KeyError` → `500`).
- [ ] Adopt schema migrations (Flask-Migrate / Alembic) so model changes don't require a manual
      table drop.
- [ ] Run behind a production WSGI server (e.g. gunicorn) for non-dev deployments; disable
      `debug=True` in production.
- [ ] Add structured logging for received readings and errors.

## P2 — Sensors & data quality

- [ ] Integrate the BH1750 to report real `lux` (replace placeholder `1200`).
- [ ] Integrate the SHT40 to report real `temperature` / `humidity` (replace placeholders).
- [ ] Calibrate raw moisture ADC counts (0–4095) to a meaningful, documented metric.
- [ ] Add battery-voltage reading to the payload + schema for power monitoring.

## P2 — Reliability

- [ ] Firmware: handle POST failure (non-2xx / no connection) — retry with backoff and/or buffer
      the reading for the next wake cycle.
- [ ] Decide behavior when WiFi is unavailable (skip-and-sleep vs. retry budget) to protect battery.

## P3 — Read path & visualization

- [ ] Add a read API (e.g. `GET /data`, filter by `stake_id` / time range).
- [ ] Build a simple dashboard / charts for stored readings.
- [ ] Support multiple stakes cleanly (per-`stake_id` views).

## P3 — Project hygiene

- [ ] Reconcile `firmware/test/` (currently a near-duplicate PlatformIO project, not a test suite)
      — either make it a real test env or remove it.
- [ ] Add automated tests for the server endpoint (valid + invalid payloads).
- [ ] Document local dev setup end-to-end in the README (DB creation, venv, running both halves).
