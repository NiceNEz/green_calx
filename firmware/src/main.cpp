#include <ArduinoJson.h>
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "omron";
const char* password = "attblows";

const char* serverUrl = "http://192.168.50.195:8080/api/data";

const int MOISTURE_PIN = 2;
const int SENSOR_POWER = 5;

#define uS_TO_S_FACTOR 10ULL
#define TIME_TO_SLEEP  7200

// Human-readable name for the AP auth/encryption mode reported by a scan.
const char* authModeName(wifi_auth_mode_t m)
{
  switch (m) {
    case WIFI_AUTH_OPEN:            return "OPEN";
    case WIFI_AUTH_WEP:             return "WEP";
    case WIFI_AUTH_WPA_PSK:         return "WPA_PSK";
    case WIFI_AUTH_WPA2_PSK:        return "WPA2_PSK";
    case WIFI_AUTH_WPA_WPA2_PSK:    return "WPA_WPA2_PSK";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2_ENT";
    case WIFI_AUTH_WPA3_PSK:        return "WPA3_PSK";
    case WIFI_AUTH_WPA2_WPA3_PSK:   return "WPA2_WPA3_PSK";
    case WIFI_AUTH_WAPI_PSK:        return "WAPI_PSK";
    default:                        return "?";
  }
}

// Prints the reason code whenever the STA disconnects/fails to associate.
// Common codes: 2 AUTH_EXPIRE, 3 AUTH_LEAVE, 15 4WAY_HANDSHAKE_TIMEOUT (wrong
// password), 200 BEACON_TIMEOUT, 201 NO_AP_FOUND, 202 AUTH_FAIL, 203 ASSOC_FAIL,
// 204 HANDSHAKE_TIMEOUT. Codes 15/202/204 strongly imply a bad password/auth.
void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info)
{
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.printf("  [event] STA disconnected, reason: %u\n",
                  info.wifi_sta_disconnected.reason);
  }
}

void setup()
{
  Serial.begin(115200);
  delay(100); // Give time for Serial to initialize
  while (!Serial && millis() < 4000) {
        delay(10);
    }
  
  Serial.println("\n---ESP32---");

  WiFi.disconnect(true, true); // true = erase stored AP credentials from NVS
  delay(200); 

  WiFi.mode(WIFI_STA);
  delay(200);
  Serial.print("STA MAC: ");
  Serial.println(WiFi.macAddress());  // allowlist this on the router if it uses access control

  pinMode(SENSOR_POWER, OUTPUT);
  digitalWrite(SENSOR_POWER, HIGH);
  delay(50);

  int rawMoisture = analogRead(MOISTURE_PIN);
  digitalWrite(SENSOR_POWER, LOW);
  Serial.print("Raw Moisture Value: ");
  Serial.println(rawMoisture);


  // Diagnostic scan: list every visible 2.4 GHz AP so we can see whether the
  // target SSID is present and on which channel/BSSID/signal. Helps debug
  // association failures without guessing. Remove or guard once stable.
  Serial.println("Scanning for networks...");
  int found = WiFi.scanNetworks();
  if (found <= 0) {
    Serial.println("  (no networks found)");
  } else {
    for (int i = 0; i < found; i++) {
      Serial.printf("  %2d: %-24s  ch%-3d  %4d dBm  %-14s  %s  %s\n",
                    i, WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i),
                    authModeName(WiFi.encryptionType(i)),
                    WiFi.BSSIDstr(i).c_str(),
                    WiFi.SSID(i) == ssid ? "<-- target" : "");
    }
  }
  WiFi.scanDelete();

  // Connect by SSID only: let the chip pick the best matching 2.4 GHz AP on
  // whatever channel it is currently on. More robust than pinning BSSID/channel.
  WiFi.onEvent(onWiFiEvent);
  WiFi.begin(ssid, password);

  int timeoutCounter = 0;
  while (WiFi.status() != WL_CONNECTED && timeoutCounter < 20) {
    delay(500);

    int currentStatus = WiFi.status();
    Serial.print("Status Code: ");
    Serial.print(currentStatus);

    switch(currentStatus) {
      case WL_IDLE_STATUS:    Serial.println(" (Idle - waiting to change)"); break;
      case WL_NO_SSID_AVAIL:  Serial.println(" (SSID not found - check network name)"); break;
      case WL_CONNECT_FAILED: Serial.println(" (Wrong password / Auth failed)"); break;
      case WL_CONNECTION_LOST:Serial.println(" (Connection dropped)"); break;
      case WL_DISCONNECTED:   Serial.println(" (Disconnected / Searching)"); break;
      default:                Serial.println(" (Processing...)"); break;
    }
    timeoutCounter++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected.");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["stake_id"] = "STAKE_C3_001";
    doc["moisture"] = rawMoisture;
    doc["lux"] = 1200;        // Placeholder until you mount the BH1750
    doc["temperature"] = 21.5; // Placeholders until you chain the SHT40
    doc["humidity"] = 45.0;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.print("Response from server: ");
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("\nWiFi connection failed.");
  }

  Serial.println("Entering Deep Sleep mode now...");
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  //esp_deep_sleep_start();
}

void loop()
{

}