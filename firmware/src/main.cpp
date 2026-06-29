#include <ArduinoJson.h>
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "omron";
const char* password = "attblows";
uint8_t target_bssid[] = {0x24, 0x4B, 0xFE, 0xC7, 0x13, 0xB1};
int target_channel = 8;

const char* serverUrl = "http://192.168.50.195:8080/data";

const int MOISTURE_PIN = 2;
const int SENSOR_POWER = 5;

#define uS_TO_S_FACTOR 10ULL
#define TIME_TO_SLEEP  7200

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

  pinMode(SENSOR_POWER, OUTPUT);
  digitalWrite(SENSOR_POWER, HIGH);
  delay(50);

  int rawMoisture = analogRead(MOISTURE_PIN);
  digitalWrite(SENSOR_POWER, LOW);
  Serial.print("Raw Moisture Value: ");
  Serial.println(rawMoisture);


  WiFi.begin(ssid, password, target_channel, target_bssid);

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