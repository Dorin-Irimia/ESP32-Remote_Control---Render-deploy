const tempEl = document.getElementById("temperature");
const relaySetEl = document.getElementById("relaySet");
const relayESPEl = document.getElementById("relayESP");
const browserTimeEl = document.getElementById("browserTime");
const espTimeEl = document.getElementById("espTime");
const lastUpdateEl = document.getElementById("lastUpdate");

const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");

const API_BASE = "/api";

async function updateData() {
  try {
    const res = await fetch(`${API_BASE}/temp`);
    const data = await res.json();

    // Temperatură
    tempEl.textContent = `${data.temp.toFixed(1)} °C`;

    // Stare din browser
    relaySetEl.textContent = data.relaySet.toUpperCase();
    relaySetEl.style.color = data.relaySet === "on" ? "#4caf50" : "#f44336";

    // Stare raportată de ESP
    relayESPEl.textContent = data.relayESP.toUpperCase();
    relayESPEl.style.color = data.relayESP === "on" ? "#4caf50" : "#f44336";

    // Timpi
    browserTimeEl.textContent = data.lastBrowserUpdate
      ? new Date(data.lastBrowserUpdate).toLocaleString("ro-RO")
      : "--";

    espTimeEl.textContent = data.lastEspUpdate
      ? new Date(data.lastEspUpdate).toLocaleString("ro-RO")
      : "--";

    lastUpdateEl.textContent = data.lastEspUpdate
      ? "Ultima actualizare generală: " + new Date(data.lastEspUpdate).toLocaleString("ro-RO")
      : "--";
  } catch (err) {
    tempEl.textContent = "-- °C";
    relaySetEl.textContent = "--";
    relayESPEl.textContent = "--";
    browserTimeEl.textContent = "--";
    espTimeEl.textContent = "--";
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
