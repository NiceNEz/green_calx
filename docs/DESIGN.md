# green_calx — Design Document

## 1. Overview

green_calx is a battery-powered plant-monitoring system. One or more ESP32-C3 "stakes"
read soil and environment sensors, POST a JSON reading to a server over WiFi, then deep-sleep
to conserve battery. A Flask server receives readings and persists them to PostgreSQL for later
analysis and display.

```
 ┌────────────────────┐     WiFi/HTTP POST      ┌──────────────────┐      ┌──────────────┐
 │  ESP32-C3 stake    │  ───────────────────▶   │   Flask server   │ ───▶ │  PostgreSQL  │
 │  (firmware/)       │   JSON reading          │   (server/)      │      │  esp32_db    │
 │  sensors + WiFi    │                         │   POST /data     │      │  sensor_data │
 └────────────────────┘                         └──────────────────┘      └──────────────┘
        │  ▲
        └──┘ deep sleep, wake on timer
```

## 2. Components

### 2.1 Firmware — `firmware/` (C++/Arduino, PlatformIO)
- **Board:** `esp32-c3-devkitm-1`, native USB CDC (`ARDUINO_USB_CDC_ON_BOOT=1`).
- **Lifecycle:** all work happens in `setup()`; `loop()` is intentionally empty. The device is
  designed to wake, sense, transmit, and deep-sleep — a wake/transmit/sleep cycle, not a
  continuously-running program.
- **Flow (`src/main.cpp`):**
  1. Init serial, reset WiFi NVS, set STA mode.
  2. Power the moisture sensor (`SENSOR_POWER` pin), read analog moisture (`MOISTURE_PIN`), power down.
  3. Connect to a specific AP by SSID + BSSID + channel (faster, deterministic association).
  4. Build a JSON document and `POST` it to the server.
  5. Configure a timer wake-up and enter deep sleep.
- **Libraries:** ArduinoJson, Adafruit SHT4x (temp/humidity), BH1750 (lux).

### 2.2 Server — `server/` (Python/Flask + SQLAlchemy)
- Single endpoint `POST /data`, requires `Content-Type: application/json`.
- `SensorData` SQLAlchemy model persists each reading.
- `db.create_all()` runs at import → schema is created on first start (no migrations yet).
- Runs the Flask dev server on `0.0.0.0:8080` with `debug=True`.

### 2.3 Database — PostgreSQL
- Database `esp32_db`, table `sensor_data`.
- Connection URI hardcoded in `app.py`.

## 3. Data contract (API)

`POST /data` — request body (`application/json`):

| Field         | Type    | Source                          | Notes                              |
|---------------|---------|---------------------------------|------------------------------------|
| `stake_id`    | string  | firmware constant               | identifies the physical stake      |
| `moisture`    | number  | analog read (raw ADC, 0–4095)   | currently raw counts, not %        |
| `lux`         | number  | BH1750 (placeholder `1200`)     | ambient light                      |
| `temperature` | number  | SHT40 (placeholder `21.5`)      | °C                                 |
| `humidity`    | number  | SHT40 (placeholder `45.0`)      | % RH                               |

Response: `201 Created` with `{"status": "success", "data_saved": {...}}`.
Server stamps `id` and `timestamp` (UTC) on insert.

> **Contract status:** firmware and server now agree on all five fields and the endpoint
> (`http://<server>:8080/data`). This was the original mismatch and is resolved.

## 4. Database schema — `sensor_data`

| Column        | Type      | Constraints              |
|---------------|-----------|--------------------------|
| `id`          | integer   | primary key              |
| `timestamp`   | datetime  | default `utcnow`         |
| `stake_id`    | string    | not null                 |
| `moisture`    | float     | not null                 |
| `lux`         | float     | not null                 |
| `humidity`    | float     | not null                 |
| `temperature` | float     | not null                 |

## 5. Configuration (current state)

All configuration is currently **hardcoded in source** — this is the biggest near-term
debt:
- Firmware: WiFi SSID/password, target BSSID + channel, `serverUrl`, sensor pins, sleep interval.
- Server: PostgreSQL URI, host/port, debug flag.

Target end state: a config/secrets layer (see TODO) so credentials and endpoints are not
committed and can vary per environment/device.

## 6. Known issues / risks (observed)

- **WiFi association is brittle.** The firmware targets one AP by exact BSSID + channel. If that
  AP isn't in range (or roamed to a different BSSID), the device never connects and silently
  fails after ~10 s of retries. Observed during bench testing: Status 6 (Searching) ×20 → fail.
- **Deep sleep is disabled.** `esp_deep_sleep_start()` is commented out in `main.cpp` for
  debugging — battery life is not represented by current behavior.
- **No input validation on the server.** Missing JSON fields raise `KeyError` → HTTP 500 instead
  of a clean 400.
- **No schema migrations.** `db.create_all()` creates missing tables but never alters existing
  ones; schema changes require a manual drop/recreate.
- **Dev server only.** Flask runs with the built-in WSGI server and `debug=True`.
- **Secrets in source / VCS.** WiFi and DB credentials are committed.
- **Sensors are placeholders.** `lux`, `temperature`, `humidity` are hardcoded constants; only
  moisture is actually read (as raw ADC counts).

## 7. Future direction

- Multiple stakes reporting to one server, identified by `stake_id`.
- Read API + dashboard/visualization for stored readings.
- Battery-voltage telemetry and adaptive sleep intervals.
- Per-device provisioning of WiFi + server config without reflashing source.
- Calibration of raw moisture ADC counts to a meaningful moisture metric.

See `docs/TODO.md` for the prioritized backlog.
