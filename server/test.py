import requests
import random
import time

# Target your local Flask server URL
url = "http://localhost:8080/api/data"

# Generate and send 5 random readings
for i in range(10):
    sample_payload = {
        "stake_id": f"STAKE_TEST_{i:03d}",
        "moisture": round(random.uniform(30.0, 70.0), 2),
        "lux": round(random.uniform(0.0, 2000.0), 2),
        "humidity": round(random.uniform(40.0, 80.0), 2),
        "temperature": round(random.uniform(18.0, 28.0), 2)
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
        
    time.sleep(1) # Wait 1 second between payloads