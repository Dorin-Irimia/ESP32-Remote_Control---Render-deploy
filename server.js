import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Variabile globale
let latestTemp = 0;
let relayState = "off";        // stare dorită (browser)
let espRelayState = "off";     // stare raportată de ESP
let mode = "manual";           // "manual" sau "auto"
let minTemp = 20;
let maxTemp = 23;
let lastEspUpdate = null;
let lastBrowserUpdate = null;

// === 1️⃣ ESP trimite temperatura și starea ===
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
    mode,
    minTemp,
    maxTemp,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

// === 2️⃣ Browser citește datele curente ===
app.get("/api/temp", (req, res) => {
  res.json({
    temp: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    mode,
    minTemp,
    maxTemp,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

// === 3️⃣ Browser schimbă starea dorită (mod manual) ===
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (mode === "manual" && (state === "on" || state === "off")) {
    relayState = state;
    lastBrowserUpdate = new Date().toISOString();
    console.log(`🖥️ Browser manual: releu ${relayState} la ${lastBrowserUpdate}`);
  }
  res.json({ relaySet: relayState, lastBrowserUpdate });
});

// === 4️⃣ ESP citește starea dorită / modul curent ===
app.get("/api/relay-state", (req, res) => {
  res.json({
    relaySet: relayState,
    mode,
    minTemp,
    maxTemp,
  });
});

// === 5️⃣ Browser setează modul (manual / auto) ===
app.get("/api/mode", (req, res) => {
  const { value } = req.query;
  if (value === "manual" || value === "auto") {
    mode = value;
    lastBrowserUpdate = new Date().toISOString();
    console.log(`🖥️ Mod schimbat: ${mode}`);
  }
  res.json({ mode, lastBrowserUpdate });
});

// === 6️⃣ Browser setează intervalul automat ===
app.get("/api/auto-range", (req, res) => {
  const { min, max } = req.query;
  if (!isNaN(min) && !isNaN(max)) {
    minTemp = parseFloat(min);
    maxTemp = parseFloat(max);
    lastBrowserUpdate = new Date().toISOString();
    console.log(`🌡️ Interval auto setat: ${minTemp}–${maxTemp} °C`);
  }
  res.json({ minTemp, maxTemp });
});

// === 7️⃣ Debug complet ===
app.get("/api/status", (req, res) => {
  res.json({
    temperature: latestTemp,
    relaySet: relayState,
    relayESP: espRelayState,
    mode,
    minTemp,
    maxTemp,
    lastEspUpdate,
    lastBrowserUpdate,
  });
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
