import requests
import random
import time

# Target your local Flask server URL
url = "http://localhost:8080/data"

# Generate and send 5 random readings
for i in range(5):
    sample_payload = {
        "moisture": round(random.uniform(30.0, 70.0), 2),
        "humidity": round(random.uniform(40.0, 80.0), 2),
        "temperature": round(random.uniform(18.0, 28.0), 2)
    }
    
    try:
        response = requests.post(url, json=sample_payload)
        print(f"Sent: {sample_payload} -> Server Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Error: Make sure your Flask app.py is running first!")
        break
        
    time.sleep(1) # Wait 1 second between payloads