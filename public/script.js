const tempEl = document.getElementById("temperature");
const relaySetEl = document.getElementById("relaySet");
const relayESPEl = document.getElementById("relayESP");
const lastUpdateEl = document.getElementById("lastUpdate");

const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");

const API_BASE = "/api";

async function updateData() {
  try {
    const res = await fetch(`${API_BASE}/temp`);
    const data = await res.json();

    tempEl.textContent = `${data.temp.toFixed(1)} °C`;
    relaySetEl.textContent = data.relaySet.toUpperCase();
    relayESPEl.textContent = data.relayESP.toUpperCase();
    lastUpdateEl.textContent = data.lastUpdate
      ? new Date(data.lastUpdate).toLocaleString("ro-RO")
      : "--";

    // colorăm în funcție de stare
    relaySetEl.style.color = data.relaySet === "on" ? "#4caf50" : "#f44336";
    relayESPEl.style.color = data.relayESP === "on" ? "#4caf50" : "#f44336";
  } catch (err) {
    tempEl.textContent = "-- °C";
    lastUpdateEl.textContent = "Conexiune pierdută";
  }
}

async function setRelay(state) {
  await fetch(`${API_BASE}/relay?state=${state}`);
  updateData();
}

onBtn.addEventListener("click", () => setRelay("on"));
offBtn.addEventListener("click", () => setRelay("off"));

setInterval(updateData, 5000);
updateData();
