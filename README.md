# green_calx

A working repository for a plant monitor project called green-calx.

A battery-powered ESP32-C3 stake reads soil/environment sensors, POSTs a JSON reading over WiFi,
then deep-sleeps; a Flask server receives readings and persists them to PostgreSQL.

- `firmware/` — ESP32-C3 firmware (C++/Arduino, PlatformIO). The battery-powered sensor client.
- `server/` — Flask HTTP server + database (Python). Receives readings and stores them.

See [`docs/DESIGN.md`](docs/DESIGN.md) for architecture and [`docs/TODO.md`](docs/TODO.md) for the roadmap.

## Build & run

green_calx is two independent projects: the **firmware** (compiled/flashed) and the **server**
(Python — no compile step, just set up and run).

### Firmware (`firmware/`)

Uses PlatformIO. If `pio` isn't on your PATH, it's under PlatformIO's venv —
use `~/.platformio/penv/bin/pio` (or add that dir to your PATH).

```bash
cd firmware
pio run                                                  # build for esp32-c3-devkitm-1
pio run --target upload --upload-port /dev/cu.usbmodem2101   # flash over USB
pio device monitor --port /dev/cu.usbmodem2101              # serial monitor @ 115200
```

The first `pio run` auto-downloads the toolchain and libraries declared in `platformio.ini`
(ArduinoJson, Adafruit SHT4x, BH1750) — slow once, fast afterwards. The upload port may differ;
list candidates with `pio device list`.

### Server (`server/`)

Requires a running PostgreSQL with a database named `esp32_db`. The schema is created automatically
on first start (`db.create_all()`).

```bash
cd server
source venv/bin/activate           # deps: flask, flask_sqlalchemy, requests
python app.py                      # serves on 0.0.0.0:8080, debug=True
python test.py                     # (another shell) POSTs 5 random readings to localhost:8080/data
```

First-time setup, if the venv or database don't exist yet:

```bash
python3 -m venv venv && source venv/bin/activate
pip install flask flask_sqlalchemy requests
createdb esp32_db                  # requires postgres running
```
