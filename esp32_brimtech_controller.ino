// Cod ESP32 BrimTechControler - Cloudflare Workers + TOKEN
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 4
#define RELAY_PIN 13

const char* ssid = "TP-Link_F6B8";
const char* password = "21580260";

String server = "https://brimtech-controller.workers.dev";
String token = "BtC_92fA7xP14_QmZ87Lw3vS4nHk";

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

String relayState = "off";
float currentTemp = 0.0;

unsigned long lastSend = 0;
const long intervalMs = 5000;

void setup() {
  Serial.begin(115200);
  sensors.begin();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.println("Conectare WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectat");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  sensors.requestTemperatures();
  currentTemp = sensors.getTempCByIndex(0);

  // Failsafe termic
  if (currentTemp > 25.0 && relayState != "off") {
    digitalWrite(RELAY_PIN, LOW);
    relayState = "off";
    Serial.println("🔥 >25°C, releu OPRIT (failsafe)");
  }

  if (millis() - lastSend > intervalMs) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;

      // 1️⃣ Trimite temperatura și starea actuală
      String url = server + "/api/update?token=" + token +
                   "&temp=" + String(currentTemp) +
                   "&relay=" + relayState;
      Serial.println("➡️ " + url);
      http.begin(url);
      int code = http.GET();
      if (code > 0) {
        String payload = http.getString();
        Serial.println("📨 Răspuns: " + payload);
      }
      http.end();

      // 2️⃣ Citește starea dorită de la server
      url = server + "/api/relay-state?token=" + token;
      http.begin(url);
      code = http.GET();
      if (code == 200) {
        String desired = http.getString();
        desired.trim();

        if (currentTemp <= 25.0) {
          if (desired == "on" && relayState != "on") {
            digitalWrite(RELAY_PIN, HIGH);
            relayState = "on";
            Serial.println("💡 Releu PORNIT (server)");
          } else if (desired == "off" && relayState != "off") {
            digitalWrite(RELAY_PIN, LOW);
            relayState = "off";
            Serial.println("💤 Releu OPRIT (server)");
          }
        } else {
          Serial.println("⚠️ Temp >25, ignor comanda ON");
        }
      } else {
        Serial.println("⚠️ Eroare citire relay-state");
      }
      http.end();

    } else {
      Serial.println("📡 WiFi pierdut, încerc reconectare...");
      WiFi.reconnect();
      digitalWrite(RELAY_PIN, LOW);
      relayState = "off";
    }

    lastSend = millis();
  }
}
