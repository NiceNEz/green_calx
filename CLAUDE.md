# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

green_calx is a plant-monitor system. A battery-powered ESP32-C3 stake reads soil/environment
sensors, POSTs a JSON reading over WiFi, then deep-sleeps; a Flask server receives readings and
persists them to PostgreSQL.

## Repository layout

- `server/` — the **Flask HTTP server + database** (Python). Receives readings and persists them.
- `firmware/` — the **ESP32-C3 firmware** (C++/Arduino, PlatformIO). The battery-powered device
  that reads sensors and acts as the HTTP *client*.

## Commands

### Server (`server/`)
```bash
cd server
source venv/bin/activate          # venv is committed-ignored; deps: flask, flask_sqlalchemy, requests
python app.py                     # runs on 0.0.0.0:8080, debug=True
python test.py                    # sends 5 random readings to localhost:8080/data
```
Requires a running PostgreSQL with a database named `esp32_db` (URI hardcoded in `app.py:7`).
`db.create_all()` runs at import, so the schema is created on first start.

### Firmware (`firmware/`)
```bash
cd firmware
pio run                           # build for esp32-c3-devkitm-1
pio run --target upload           # flash over USB
pio device monitor                # serial monitor @ 115200
pio test                          # runs the test environment in back_end/test/
```
`firmware/test/` is a near-duplicate PlatformIO project of the firmware, not a unit-test suite.

## Architecture & data flow

1. ESP32 (`firmware/src/main.cpp`) does everything in `setup()` — connects to a specific AP by
   BSSID + channel, powers the moisture sensor, reads the analog pin, builds a JSON doc, POSTs it,
   then configures deep sleep. `loop()` is empty by design (deep-sleep wake cycle).
2. Server (`server/app.py`) exposes a single endpoint `POST /data`, enforces
   `Content-Type: application/json`, and writes a `SensorData` row.

### Known contract mismatch (likely the active work)
The firmware and server JSON payloads do **not** currently agree:
- Firmware sends: `stake_id`, `moisture`, `lux`, `temperature`, `humidity`.
- Server `SensorData` model expects: `moisture`, `humidity`, `temperature` (no `stake_id`/`lux`).
- Firmware POSTs to `serverUrl` root (`http://192.168.50.195`, port 80) but the server serves
  `POST /data` on port 8080.

When changing the data schema, update both `firmware/src/main.cpp` (the `JsonDocument` fields +
`serverUrl`) and the `SensorData` model / `upload_data` handler in `server/app.py` together.

## Notes

- WiFi credentials, target BSSID, and server IP are hardcoded in the firmware source.
- The database URI is hardcoded in `app.py`; there is no config/env layer yet.
- `esp_deep_sleep_start()` is currently commented out (`main.cpp:105`) for debugging.
