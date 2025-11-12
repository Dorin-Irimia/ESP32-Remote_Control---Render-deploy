
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public"));

const ESP_IP = process.env.ESP_IP || "100.100.100.50"; // IP Tailscale al ESP32
const PORT = process.env.PORT || 3000;

// endpoint pentru temperatura
app.get("/api/temp", async (req, res) => {
  try {
    const response = await fetch(`http://${ESP_IP}/temp`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "ESP32 not reachable" });
  }
});

// endpoint pentru control releu
app.get("/api/relay", async (req, res) => {
  const state = req.query.state;
  try {
    await fetch(`http://${ESP_IP}/releu?state=${state}`);
    res.json({ status: state });
  } catch (error) {
    res.status(500).json({ error: "ESP32 not reachable" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


let latestTemp = 0;
let relayState = "off";

// ESP trimite update cu temperatura și starea curentă
app.get("/api/update", (req, res) => {
  const { temp, relay } = req.query;
  if (temp) latestTemp = parseFloat(temp);
  if (relay) relayState = relay;
  res.json({ status: "ok", temp: latestTemp, relay: relayState });
});

// browserul citește temperatura (API pentru interfață web)
app.get("/api/temp", (req, res) => {
  res.json({ temp: latestTemp, relay: relayState });
});

// browserul sau ESP32 verifică starea releului (pentru sincronizare)
app.get("/api/relay-state", (req, res) => {
  res.send(relayState);
});

// browserul controlează releul
app.get("/api/relay", (req, res) => {
  const { state } = req.query;
  if (state === "on" || state === "off") relayState = state;
  res.json({ relay: relayState });
});
