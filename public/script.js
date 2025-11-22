const TOKEN = "BtC_92fA7xP14_QmZ87Lw3vS4nHk";
const API_BASE = ""; // same origin

const tempEl = document.getElementById("temperature");
const relaySetEl = document.getElementById("relaySet");
const relayEspEl = document.getElementById("relayESP");
const browserTimeEl = document.getElementById("browserTime");
const espTimeEl = document.getElementById("espTime");
const lastUpdateEl = document.getElementById("lastUpdate");
const modeLabel = document.getElementById("modeLabel");

const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");
const manualBtn = document.getElementById("manualBtn");
const autoBtn = document.getElementById("autoBtn");
const minInput = document.getElementById("minTempInput");
const maxInput = document.getElementById("maxTempInput");
const saveRangeBtn = document.getElementById("saveRangeBtn");

function formatTime(ts) {
  if (!ts) return "--";
  const n = Number(ts);
  if (Number.isNaN(n)) return "--";
  return new Date(n).toLocaleString("ro-RO");
}

let isUpdating = false;

async function updateData(force = false) {
  // evităm flood
  if (isUpdating && !force) return;
  isUpdating = true;

  try {
    const res = await fetch(`${API_BASE}/api/temp?token=${TOKEN}`);
    const data = await res.json();

    const temp = parseFloat(data.temp ?? "0");
    tempEl.textContent = `${temp.toFixed(1)} °C`;

    modeLabel.textContent = (data.mode ?? "manual").toUpperCase();

    relaySetEl.textContent = (data.relaySet ?? "off").toUpperCase();
    relaySetEl.style.color = data.relaySet === "on" ? "#4caf50" : "#f44336";

    relayEspEl.textContent = (data.relayESP ?? "off").toUpperCase();
    relayEspEl.style.color = data.relayESP === "on" ? "#4caf50" : "#f44336";

    browserTimeEl.textContent = formatTime(data.lastBrowserUpdate);
    espTimeEl.textContent = formatTime(data.lastEspUpdate);
    lastUpdateEl.textContent = "Ultima actualizare ESP: " + formatTime(data.lastEspUpdate);

    if (data.minTemp) minInput.value = data.minTemp;
    if (data.maxTemp) maxInput.value = data.maxTemp;

  } catch (e) {
    console.error(e);
    lastUpdateEl.textContent = "Eroare la citire date";
  }

  isUpdating = false;
}

async function sendCommand(url) {
  try {
    await fetch(url);
    updateData(true); // 🔥 refresh instant după comenzi
  } catch (e) {
    console.error("Command error:", e);
  }
}

// ---------------- BUTTON ACTIONS ----------------

onBtn.addEventListener("click", () =>
  sendCommand(`${API_BASE}/api/relay?token=${TOKEN}&state=on`)
);

offBtn.addEventListener("click", () =>
  sendCommand(`${API_BASE}/api/relay?token=${TOKEN}&state=off`)
);

manualBtn.addEventListener("click", () =>
  sendCommand(`${API_BASE}/api/mode?token=${TOKEN}&value=manual`)
);

autoBtn.addEventListener("click", () =>
  sendCommand(`${API_BASE}/api/mode?token=${TOKEN}&value=auto`)
);

saveRangeBtn.addEventListener("click", () => {
  const min = parseFloat(minInput.value);
  const max = parseFloat(maxInput.value);
  if (!Number.isNaN(min) && !Number.isNaN(max)) {
    sendCommand(`${API_BASE}/api/auto-range?token=${TOKEN}&min=${min}&max=${max}`);
  }
});

// ---------------- AUTO UPDATE ----------------

setInterval(() => updateData(false), 4000); // 🔥 anti-flood
updateData(true); // prima încărcare
