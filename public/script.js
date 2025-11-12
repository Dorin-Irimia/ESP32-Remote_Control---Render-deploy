async function getTemp() {
  const res = await fetch("/api/temp");
  const data = await res.json();
  document.getElementById("temp").textContent = data.temp || "--";
}

async function toggleRelay(state) {
  await fetch(`/api/relay?state=${state}`);
  getTemp();
}

setInterval(getTemp, 5000);
getTemp();
