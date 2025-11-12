import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Variabile globale
let latestTemp = 0;
let relayState = "off";           // stare dorită de utilizator (din browser)
let espRelayState = "off";        // stare raportată de ESP
let lastUpdate = null;            // momentul ultimei citiri de la ESP

// === 1️⃣ ESP32 trimite temperatura și starea sa curentă ===
app.get("/api/update", (req, res) => {
  const { temp, relay } = req.query;
  if (temp) latestTemp = parseFloat(temp);
  if (relay) espRelayState = relay;
  lastUpdate = new Date().toISOString();

  res.json({
    status: "ok",
    temp: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastUpdate
  });
});

// === 2️⃣ Interfața web citește informațiile curente ===
app.get("/api/temp", (req, res) => {
  res.json({
    temp: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastUpdate
  });
});

// === 3️⃣ Browserul schimbă starea dorită ===
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (state === "on" || state === "off") {
    relayState = state;
    console.log(`🖥️ Comandă nouă: releu ${relayState}`);
  }
  res.json({ relaySet: relayState });
});

// === 4️⃣ ESP32 citește starea dorită ===
app.get("/api/relay-state", (req, res) => {
  res.send(relayState);
});

// === 5️⃣ Endpoint de status pentru debugging ===
app.get("/api/status", (req, res) => {
  res.json({
    temperature: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastUpdate
  });
});

app.listen(PORT, () =>
  console.log(`🌐 Server running on port ${PORT}`)
);
