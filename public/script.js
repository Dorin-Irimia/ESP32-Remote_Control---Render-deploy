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
const rangeButtons = document.querySelectorAll(".range-btn");
const historyInfo = document.getElementById("historyInfo");
const historyCanvas = document.getElementById("historyChart");

let historyChart = null;
let currentRange = "24h";
let isLoadingHistory = false;
let gradients = null;

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
    loadHistory(currentRange);
  } catch (e) {
    console.error("Command error:", e);
  }
}

function formatHistoryLabel(ts, range) {
  const d = new Date(Number(ts));
  if (range === "24h") {
    return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("ro-RO", { month: "2-digit", day: "2-digit", hour: "2-digit" });
}

function renderHistory(points, range) {
  if (!gradients) {
    const ctx = historyCanvas.getContext("2d");
    const tempGrad = ctx.createLinearGradient(0, 0, 0, historyCanvas.height);
    tempGrad.addColorStop(0, "rgba(25, 118, 210, 0.28)");
    tempGrad.addColorStop(1, "rgba(25, 118, 210, 0.04)");

    const relayGrad = ctx.createLinearGradient(0, 0, 0, historyCanvas.height);
    relayGrad.addColorStop(0, "rgba(67, 160, 71, 0.28)");
    relayGrad.addColorStop(1, "rgba(67, 160, 71, 0.05)");

    gradients = { tempGrad, relayGrad };
  }

  const labels = points.map((p) => formatHistoryLabel(p.ts, range));
  const temps = points.map((p) => Number(p.temp ?? 0));
  const relay = points.map((p) => (p.relay === "on" ? 1 : 0));

  const data = {
    labels,
    datasets: [
      {
        label: "Temperatură (°C)",
        data: temps,
        borderColor: "#1976d2",
        backgroundColor: gradients.tempGrad,
        tension: 0.2,
        yAxisID: "yTemp",
        pointRadius: 0
      },
      {
        label: "Releu ON",
        data: relay,
        borderColor: "#43a047",
        backgroundColor: gradients.relayGrad,
        stepped: "middle",
        yAxisID: "yRelay",
        pointRadius: 0
      }
    ]
  };

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label(ctx) {
            if (ctx.datasetIndex === 1) {
              return ctx.parsed.y === 1 ? "Releu: ON" : "Releu: OFF";
            }
            return `Temp: ${ctx.parsed.y.toFixed(1)} °C`;
          }
        }
      }
    },
    scales: {
      yTemp: {
        type: "linear",
        position: "left",
        title: { display: true, text: "Temperatură" },
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { maxTicksLimit: 6 }
      },
      yRelay: {
        type: "linear",
        position: "right",
        min: -0.1,
        max: 1.1,
        ticks: {
          stepSize: 1,
          callback: (v) => (v === 1 ? "ON" : "OFF")
        },
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Releu" }
      },
      x: {
        display: true,
        ticks: { maxTicksLimit: 8, color: "#333" },
        grid: { color: "rgba(0,0,0,0.03)" }
      }
    }
  };

  if (historyChart) {
    historyChart.data = data;
    historyChart.options = options;
    historyChart.update();
  } else {
    historyChart = new Chart(historyCanvas, {
      type: "line",
      data,
      options
    });
  }
}

async function loadHistory(range = currentRange) {
  if (isLoadingHistory) return;
  isLoadingHistory = true;
  historyInfo.textContent = "Se încarcă date...";

  try {
    const res = await fetch(`${API_BASE}/api/history?token=${TOKEN}&range=${range}`);
    const data = await res.json();
    const points = data.points ?? [];
    currentRange = data.range ?? range;

    renderHistory(points, currentRange);

    if (points.length === 0) {
      historyInfo.textContent = "Nu există date pentru intervalul selectat.";
    } else {
      historyInfo.textContent = `Puncte: ${points.length} • Interval: ${currentRange}`;
    }
  } catch (e) {
    console.error(e);
    historyInfo.textContent = "Eroare la încărcarea istoricului";
  }

  isLoadingHistory = false;
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

rangeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = btn.dataset.range;
    rangeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadHistory(range);
  });
});

// ---------------- AUTO UPDATE ----------------

setInterval(() => updateData(false), 4000); // 🔥 anti-flood
setInterval(() => loadHistory(currentRange), 60000); // refresh rar pentru grafic

updateData(true); // prima încărcare
loadHistory(currentRange);
