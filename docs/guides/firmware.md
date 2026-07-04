# Firmware — ESP32 stake

**Location:** `firmware/src/main.cpp`  
**Board:** ESP32-C3 (`esp32-c3-devkitm-1`) via PlatformIO

Battery-powered sensor stake: wake up, read sensors, POST JSON to server, deep sleep.

---

## Design principle

**All work happens in `setup()`.** `loop()` is empty.

The device is not a long-running program — it is a **wake → sense → transmit → sleep** cycle triggered by a timer (intended: every 2 hours).

---

## Pin map (current)

| Pin | Role |
|-----|------|
| `MOISTURE_PIN` (2) | Analog moisture sensor input |
| `SENSOR_POWER` (5) | Powers sensor only during read (saves battery) |

---

## Lifecycle (setup)

```text
1. Serial init
2. WiFi reset (clear stored credentials)
3. STA mode, print MAC
4. Power on sensor → analogRead moisture → power off
5. WiFi scan (diagnostic — lists visible APs)
6. WiFi.begin(ssid, password) — up to ~10 s retry
7. If connected:
     Build JSON → POST to serverUrl
8. Configure timer wake → deep sleep (currently commented out for debug)
```

---

## WiFi

- SSID/password hardcoded in source.
- Connects by SSID (not pinned BSSID) so the chip picks the best AP on 2.4 GHz.
- Event handler logs disconnect reason codes for debugging.

---

## HTTP upload

**URL:** `http://192.168.50.195:8080/api/data` (hardcoded — change for your network)

**JSON payload:**

```json
{
  "stake_id": "STAKE_C3_001",
  "moisture": <raw ADC>,
  "lux": 1200,
  "temperature": 21.5,
  "humidity": 45.0
}
```

| Field | Source today |
|-------|--------------|
| `moisture` | Real analog read |
| `lux`, `temperature`, `humidity` | Placeholder constants until BH1750 / SHT40 wired up |

---

## Deep sleep

- `TIME_TO_SLEEP = 7200` seconds (2 hours).
- `esp_deep_sleep_start()` is **commented out** — device stays awake for bench debugging.

---

## Build & flash

```bash
cd firmware
pio run                  # build
pio run --target upload  # flash USB
pio device monitor       # serial @ 115200
```

---

## How firmware connects to the dashboard

1. Firmware POSTs → server inserts `SensorData`.
2. `ensure_stake` creates stake if needed (`species: Unknown`).
3. Optionally POST `/api/stakes` with a real species name, or include `species` in future firmware JSON.
4. Dashboard polls `GET /api/stakes` and `GET /api/readings` — no direct link to the device.

The ESP32 never talks to the React app; PostgreSQL is the handoff point.
