import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Variabile globale
let latestTemp = 0;
let relayState = "off";        // stare dorită de utilizator (browser)
let espRelayState = "off";     // stare raportată de ESP
let lastEspUpdate = null;      // momentul ultimei actualizări de la ESP
let lastBrowserUpdate = null;  // momentul ultimei comenzi din browser

// === 1️⃣ ESP32 trimite temperatura și starea sa curentă ===
app.get("/api/update", (req, res) => {
  const { temp, relay } = req.query;
  if (temp) latestTemp = parseFloat(temp);
  if (relay) espRelayState = relay;
  lastEspUpdate = new Date().toISOString();

  res.json({
    status: "ok",
    temp: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

// === 2️⃣ Interfața web citește informațiile curente ===
app.get("/api/temp", (req, res) => {
  res.json({
    temp: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

// === 3️⃣ Browserul schimbă starea dorită ===
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (state === "on" || state === "off") {
    relayState = state;
    lastBrowserUpdate = new Date().toISOString();
    console.log(`🖥️ Browser a setat releul: ${relayState} la ${lastBrowserUpdate}`);
  }
  res.json({ relaySet: relayState, lastBrowserUpdate });
});

// === 4️⃣ ESP32 citește starea dorită ===
app.get("/api/relay-state", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send(relayState);
});

// === 5️⃣ Endpoint de status pentru debugging ===
app.get("/api/status", (req, res) => {
  res.json({
    temperature: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

app.listen(PORT, () =>
  console.log(`🌐 Server running on port ${PORT}`)
);
