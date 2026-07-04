import requests
import random
import time

BASE = "http://localhost:8080"

PLANTS = [
    {"stake_id": "stake-01", "species": "Monstera"},
    {"stake_id": "stake-02", "species": "Snake Plant"},
    {"stake_id": "stake-03", "species": "Pothos"},
    {"stake_id": "stake-04", "species": "Fiddle Leaf Fig"},
]

for plant in PLANTS:
    res = requests.post(f"{BASE}/api/stakes", json=plant)
    print(f"Register {plant} -> {res.status_code} {res.json()}")

url = f"{BASE}/api/data"

for i in range(10):
    plant = random.choice(PLANTS)
    sample_payload = {
        "stake_id": plant["stake_id"],
        "moisture": round(random.uniform(800.0, 3200.0), 0),
        "lux": round(random.uniform(0.0, 2000.0), 2),
        "humidity": round(random.uniform(40.0, 80.0), 2),
        "temperature": round(random.uniform(18.0, 28.0), 2),
    }

    try:
        response = requests.post(url, json=sample_payload)
        try:
            body = response.json()
        except requests.exceptions.JSONDecodeError:
            print(f"Sent: {sample_payload} -> HTTP {response.status_code}: {response.text!r}")
            break
        print(f"Sent: {sample_payload} -> Server Response: {body}")
    except requests.exceptions.ConnectionError:
        print("Error: Make sure your Flask app.py is running first!")
        break

    time.sleep(1)
