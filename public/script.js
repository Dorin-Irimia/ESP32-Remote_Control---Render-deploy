const tempEl = document.getElementById("temperature");
const relaySetEl = document.getElementById("relaySet");
const relayESPEl = document.getElementById("relayESP");
const browserTimeEl = document.getElementById("browserTime");
const espTimeEl = document.getElementById("espTime");
const lastUpdateEl = document.getElementById("lastUpdate");

const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");
const manualBtn = document.getElementById("manualBtn");
const autoBtn = document.getElementById("autoBtn");
const modeLabel = document.getElementById("modeLabel");
const minInput = document.getElementById("minTempInput");
const maxInput = document.getElementById("maxTempInput");
const saveRangeBtn = document.getElementById("saveRangeBtn");

const API_BASE = "/api";

async function updateData() {
  try {
    const res = await fetch(`${API_BASE}/temp`);
    const data = await res.json();

    // Temperatură
    tempEl.textContent = `${data.temp.toFixed(1)} °C`;

    // Mod operare
    modeLabel.textContent = data.mode.toUpperCase();

    // Releu browser
    relaySetEl.textContent = data.relaySet.toUpperCase();
    relaySetEl.style.color = data.relaySet === "on" ? "#4caf50" : "#f44336";

    // Releu ESP
    relayESPEl.textContent = data.relayESP.toUpperCase();
    relayESPEl.style.color = data.relayESP === "on" ? "#4caf50" : "#f44336";

    // Timp actualizări
    browserTimeEl.textContent = data.lastBrowserUpdate
      ? new Date(data.lastBrowserUpdate).toLocaleString("ro-RO")
      : "--";

    espTimeEl.textContent = data.lastEspUpdate
      ? new Date(data.lastEspUpdate).toLocaleString("ro-RO")
      : "--";

    lastUpdateEl.textContent = data.lastEspUpdate
      ? "Ultima actualizare: " + new Date(data.lastEspUpdate).toLocaleString("ro-RO")
      : "--";

    // Setări automate
    minInput.value = data.minTemp ?? 20;
    maxInput.value = data.maxTemp ?? 23;
  } catch (err) {
    console.error("❌ Eroare update:", err);
    tempEl.textContent = "-- °C";
    lastUpdateEl.textContent = "Conexiune pierdută";
  }
}

// --- Control manual ---
async function setRelay(state) {
  await fetch(`${API_BASE}/relay?state=${state}`);
  updateData();
}

// --- Comută mod ---
manualBtn.onclick = async () => {
  await fetch(`${API_BASE}/mode?value=manual`);
  updateData();
};

autoBtn.onclick = async () => {
  await fetch(`${API_BASE}/mode?value=auto`);
  updateData();
};

// --- Salvare interval automat ---
saveRangeBtn.onclick = async () => {
  const min = parseFloat(minInput.value);
  const max = parseFloat(maxInput.value);
  await fetch(`${API_BASE}/auto-range?min=${min}&max=${max}`);
  updateData();
};

// --- Butoane manual ---
onBtn.addEventListener("click", () => setRelay("on"));
offBtn.addEventListener("click", () => setRelay("off"));

// --- Actualizare periodică ---
setInterval(updateData, 5000);
updateData();
