import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Variabile în memorie (ultimele valori primite de la ESP)
let latestTemp = 0;
let relayState = "off";

// === 1️⃣ ESP32 trimite temperatura și starea curentă ===
app.get("/api/update", (req, res) => {
  const { temp, relay } = req.query;
  if (temp) latestTemp = parseFloat(temp);
  if (relay) relayState = relay;
  res.json({ status: "ok", temp: latestTemp, relay: relayState });
});

// === 2️⃣ Interfața web citește temperatura curentă ===
app.get("/api/temp", (req, res) => {
  res.json({ temp: latestTemp, relay: relayState });
});

// === 3️⃣ Browserul controlează releul ===
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (state === "on" || state === "off") relayState = state;
  res.json({ relay: relayState });
});

// === 4️⃣ ESP32 verifică starea actuală a releului ===
app.get("/api/relay-state", (req, res) => {
  res.send(relayState);
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
