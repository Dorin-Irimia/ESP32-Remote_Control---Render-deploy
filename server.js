import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Variabile în memorie (ultimele valori primite de la ESP)
let latestTemp = 0;
let relayState = "off";
let lastUpdate = null; // momentul ultimei actualizări

// === 1️⃣ ESP32 trimite doar temperatura ===
app.get("/api/update", (req, res) => {
  const { temp } = req.query;
  if (temp) {
    latestTemp = parseFloat(temp);
    lastUpdate = new Date().toISOString();
  }
  res.json({ status: "ok", temp: latestTemp, relay: relayState });
});

// === 2️⃣ Interfața web citește temperatura curentă ===
app.get("/api/temp", (req, res) => {
  res.json({ temp: latestTemp, relay: relayState });
});

// === 3️⃣ Browserul controlează releul ===
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (state === "on" || state === "off") {
    relayState = state;
    console.log(`🖥️ Comandă primită din browser: releu ${relayState}`);
  }
  res.json({ relay: relayState });
});

// === 4️⃣ ESP32 verifică starea actuală a releului ===
app.get("/api/relay-state", (req, res) => {
  res.send(relayState);
});

// === 5️⃣ (opțional) Endpoint de status pentru debugging ===
app.get("/api/status", (req, res) => {
  res.json({
    temperature: latestTemp,
    relay: relayState,
    lastUpdate,
  });
});

app.listen(PORT, () =>
  console.log(`🌐 Server running on port ${PORT}`)
);
