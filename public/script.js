const tempEl = document.getElementById("temperature");
const relayEl = document.getElementById("relayState");
const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");

const API_BASE = "/api";

async function updateTemp() {
  try {
    const res = await fetch(`${API_BASE}/temp`);
    const data = await res.json();
    tempEl.textContent = `${data.temp.toFixed(1)} °C`;
    relayEl.textContent = data.relay.toUpperCase();
    relayEl.style.color = data.relay === "on" ? "#4caf50" : "#f44336";
  } catch (err) {
    tempEl.textContent = "-- °C";
  }
}

async function setRelay(state) {
  await fetch(`${API_BASE}/relay?state=${state}`);
  updateTemp();
}

onBtn.addEventListener("click", () => setRelay("on"));
offBtn.addEventListener("click", () => setRelay("off"));

setInterval(updateTemp, 5000);
updateTemp();
