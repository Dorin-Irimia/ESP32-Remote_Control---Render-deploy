# BrimTech Controller – ESP32 Remote Temperature & Relay Control

## Scopul Proiectului
Necesitatea care a dus la dezvoltarea acestui proiect este data de nevoia utilizatorului de a putea mentine si controla temperatura intr-o incapere. 
In momentul in care afara este frig, bateriile sistemelor fotovoltaice sunt puse la grea incercare, datorita temperaturilor scazute. Pentru a pastra bateriile in siguranta si a avea un control eficient al temperaturii, am dezvoltat un sistem de control de la distanta.

## Descrierea Sistemului De Control
### Componentele Hardware
Sistemul contine 4 componente hardware:
- Placa de dezvoltare esp32-vroom.
- Releu Solid State SSR-40DA.
- Senzor de temperatura si umiditate DHT11.
- LED RGB, pentru vizualizarea statusurilor.

### Componentele Software
- Pentru controlul remote s-a folosit un server si o baza de date gazduite prin: https://dash.cloudflare.com/. Pentru mai multe informatii despre configurarea bazei de date, se poate accesa acest link: https://developers.cloudflare.com/d1/.
- Pentru a programa placa de dezvoltare ESP32 am folosit IDE-ul de la arduino unde am instalat librariile aferente.
- Interfata de control se regaseste in browser si poate fi accesata prin acest link: https://brimtech-controller.brimtech.workers.dev/

<img width="586" height="898" alt="image" src="https://github.com/user-attachments/assets/58b9d0ab-37a9-4a2c-971d-986144cf2589" />

## Pasii Pentru Instalarea Sistemului

### 1. Descarca Proiectul in folderul de lucru.
Asigurate ca ai folderele dupa structura:

- |--> Folder Proiect (folder)
- .......|--> Public (folder)
- ..............|--> index.html
- ..............|--> style.css
- .......|--> package.json
- .......|--> worker.js
- .......|--> wrangler.toml
- .......|--> esp32_brimtech_controller.ino


### 2. Configurare ESP32
Pentru Conectarea componentelor Hardware am descris mai jos pinii aferenti:
- Senzorul DHT11 --> PIN 15
- Releul de Control --> PIN 4
- LED RGB --> PIN 21, 5, 34

Acesti pini se pot modifica in cazul in care nu sunt disponibili sau se doresc utilizarea altor pini. 

Se deschide IDE-ul Arduino si se introduce codul din fisierul "esp32_brimtech_controller.ino".
In partea stanga

cod Arduino IDE

//--------------------------------------------------------------
//  ESP32 – BrimTech Auto Control (Final Version)
//--------------------------------------------------------------

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHT_PIN 15
#define DHT_TYPE DHT11

#define RELAY_PIN 4
#define LED_ON 21
#define LED_OFF 5
#define LED_WIFI 34

DHT dht(DHT_PIN, DHT_TYPE);

const char* ssid = "MERCUSYS_1EDC";
const char* password = "39689597";


//const char* ssid = "Irimia";
//const char* password = "castravetimurati";


//const char* ssid = "TP-Link_F6B8";
//const char* password = "21580260";

String server = "https://brimtech-controller.brimtech.workers.dev";
String token  = "BtC_92fA7xP14_QmZ87Lw3vS4nHk";

WiFiClientSecure client;

String relayState = "off";
float currentTemp = 0.0;

String mode = "manual";
float minTemp = 5.0;
float maxTemp = 18.0;

unsigned long lastSend = 0;
const long intervalMs = 4000;

//-------------------------------------------------------------
//  RELAY CONTROL
//-------------------------------------------------------------
void updateRelay(bool turnOn) {
  if (turnOn) {
    digitalWrite(RELAY_PIN, HIGH);
    digitalWrite(LED_ON, HIGH);
    digitalWrite(LED_OFF, LOW);
    relayState = "on";
//    Serial.println("🔌 Releu PORNIT");
  } else {
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_ON, LOW);
    digitalWrite(LED_OFF, HIGH);
    relayState = "off";
//    Serial.println("🔌 Releu OPRIT");
  }
}

//-------------------------------------------------------------
//  TEMPERATURE SENSOR
//-------------------------------------------------------------
float readTemperature() {
  float t = dht.readTemperature();
  delay(300);
  if (isnan(t) || t < 1 || t > 80) {
//    Serial.println("❌ EROARE senzor!");
    return 101;
  }
  return t;
}

//-------------------------------------------------------------
//  READ MIN/MAX + MODE from server
//-------------------------------------------------------------
bool readServerSettings() {
  HTTPClient https;

  String url = server + "/api/temp?token=" + token;

  https.begin(client, url);
  int code = https.GET();

  if (code != 200) {
//    Serial.println("❌ Nu pot citi setările!");
    https.end();
    return false;
  }

  String json = https.getString();
  https.end();

  // extragere valori
  mode = json.substring(json.indexOf("\"mode\":\"") + 8,
                        json.indexOf("\"", json.indexOf("\"mode\":\"") + 8));

  minTemp = json.substring(json.indexOf("\"minTemp\":") + 10,
                           json.indexOf(",", json.indexOf("\"minTemp\":"))).toFloat();

  maxTemp = json.substring(json.indexOf("\"maxTemp\":") + 10,
                           json.indexOf(",", json.indexOf("\"maxTemp\":"))).toFloat();

//  Serial.println("📡 Mod server: " + mode);
//  Serial.printf("📡 Interval AUTO: %.1f - %.1f\n", minTemp, maxTemp);

  return true;
}

//-------------------------------------------------------------
//  READ DESIRED RELAY (Manual mode)
//-------------------------------------------------------------
String readDesiredRelay() {
  HTTPClient https;
  String url = server + "/api/relay-state?token=" + token;

  https.begin(client, url);
  int code = https.GET();

  if (code != 200) {
//    Serial.println("❌ Nu pot citi relay-state");
    https.end();
    return "off";
  }

  String state = https.getString();
  state.trim();
  https.end();

  return state;  // "on" sau "off"
}

//-------------------------------------------------------------
//  AUTO + MANUAL CONTROL
//-------------------------------------------------------------
void autoControl() {

  if (mode != "auto") {
    Serial.println("ℹ Mod manual");

    String desired = readDesiredRelay();

    if (desired == "on" && relayState != "on") {
      updateRelay(true);
    }
    else if (desired == "off" && relayState != "off") {
      updateRelay(false);
    }

    return;
  }

  // === AUTO MODE ===
  if (currentTemp < minTemp) {
    if (relayState != "on") updateRelay(true);
  }

  if (currentTemp > maxTemp) {
    if (relayState != "off") updateRelay(false);
  }
}

//-------------------------------------------------------------
//  SETUP
//-------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  updateRelay(false);

  pinMode(LED_ON, OUTPUT);
  pinMode(LED_OFF, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);

  client.setInsecure();

  Serial.println("Conectare la WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n✔ WiFi conectat!");
  digitalWrite(LED_WIFI, HIGH);

  dht.begin();
}

//-------------------------------------------------------------
//  LOOP
//-------------------------------------------------------------
void loop() {

  currentTemp = readTemperature();
  Serial.printf("🌡 Temp: %.1f\n", currentTemp);

  // === FAILSAFE 40°C ===
  if (currentTemp >= 40.0) {
    Serial.println("🔥 FAILSAFE: Temp >= 40°C → Releu OFF!");

    updateRelay(false);
    relayState = "off";

//    while (readTemperature() >= 39.0) {
//      Serial.println("🔥 Temperatură mare, mențin releul OFF...");
//      delay(2000);
//    }

//    Serial.println("✔ Temperatură revenită sub 39°C");
  }

  // === WiFi FALLBACK ===
  if (WiFi.status() != WL_CONNECTED) {
//    Serial.println("❌ Internet pierdut → Releu OFF + MANUAL");
    digitalWrite(LED_WIFI, LOW);

    updateRelay(false);
    relayState = "off";
    mode = "manual";

    WiFi.reconnect();
    delay(2000);
    return;
  }

  digitalWrite(LED_WIFI, HIGH);

  // === Control AUTO / MANUAL ===
  autoControl();

  // === SERVER SYNC LA 4 SECUNDE ===
  if (millis() - lastSend > intervalMs) {

    // update ESP → server
    HTTPClient https;
    String url = server +
      "/api/update?token=" + token +
      "&temp=" + String(currentTemp) +
      "&relay=" + relayState;

    https.begin(client, url);
    https.GET();
    https.end();

    // setări server → ESP
    readServerSettings();

    lastSend = millis();
  }

  delay(200);
}
