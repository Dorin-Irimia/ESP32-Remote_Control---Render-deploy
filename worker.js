// BrimTech Controller – Cloudflare Workers + D1

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1️⃣ Static files din /public (via [assets])
    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // 2️⃣ TOKEN SECURITY
    const token = url.searchParams.get("token");
    if (token !== env.TOKEN) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 3️⃣ API ROUTES (folosesc D1, nu KV)
    if (path === "/api/update")       return updateFromESP(url, env);
    if (path === "/api/temp")         return readStatus(env);
    if (path === "/api/relay")        return browserSetRelay(url, env);
    if (path === "/api/relay-state")  return espGetRelay(env);
    if (path === "/api/mode")         return browserSetMode(url, env);
    if (path === "/api/auto-range")   return browserSetAutoRange(url, env);
    if (path === "/api/history")      return historyData(url, env);

    return new Response("Not found", { status: 404 });
  }
};

// === Helpers pentru D1 ===

async function loadState(env) {
  // un singur rând cu id = 1
  const row = await env.DB.prepare(
    "SELECT * FROM state WHERE id = 1"
  ).first();

  if (!row) {
    // fallback dacă nu există încă
    return {
      temp: 0,
      relay_set: "off",
      relay_esp: "off",
      mode: "manual",
      min_temp: 5,
      max_temp: 18,
      last_esp_update: null,
      last_browser_update: null
    };
  }
  return row;
}

async function saveFromESP(env, temp, relayEsp) {
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE state
       SET temp = ?, relay_esp = ?, last_esp_update = ?
     WHERE id = 1`
  ).bind(temp, relayEsp, now).run();
}

async function saveHistory(env, temp, relayEsp) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO history (ts, temp, relay)
       VALUES (?, ?, ?)`
  ).bind(now, temp, relayEsp).run();

  // păstrăm doar ultimele 30 de zile ca să nu crească fără limită
  const retentionMs = 30 * 24 * 60 * 60 * 1000;
  await env.DB.prepare(
    `DELETE FROM history WHERE ts < ?`
  ).bind(now - retentionMs).run();
}

async function saveRelaySet(env, state) {
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE state
       SET relay_set = ?, last_browser_update = ?
     WHERE id = 1`
  ).bind(state, now).run();
}

async function saveMode(env, mode) {
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE state
       SET mode = ?, last_browser_update = ?
     WHERE id = 1`
  ).bind(mode, now).run();
}

async function saveRange(env, minTemp, maxTemp) {
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE state
       SET min_temp = ?, max_temp = ?, last_browser_update = ?
     WHERE id = 1`
  ).bind(minTemp, maxTemp, now).run();
}

// === API handlers ===

// ESP trimite temp + starea lui de releu
async function updateFromESP(url, env) {
  const temp  = parseFloat(url.searchParams.get("temp") ?? "0");
  const relay = url.searchParams.get("relay") ?? "off";

  await saveFromESP(env, temp, relay);
  await saveHistory(env, temp, relay);
  return json({ status: "ok" });
}

// Browser citește tot statusul
async function readStatus(env) {
  const s = await loadState(env);

  return json({
    temp: s.temp ?? 0,
    relaySet: s.relay_set ?? "off",
    relayESP: s.relay_esp ?? "off",
    mode: s.mode ?? "manual",
    minTemp: s.min_temp ?? 5,
    maxTemp: s.max_temp ?? 18,
    lastEspUpdate: s.last_esp_update,
    lastBrowserUpdate: s.last_browser_update
  });
}

// Browser schimbă releul (setpoint)
async function browserSetRelay(url, env) {
  const state = url.searchParams.get("state");
  if (state !== "on" && state !== "off") {
    return json({ error: "Invalid state" }, 400);
  }

  await saveRelaySet(env, state);
  return json({ relaySet: state });
}

// ESP citește ce a decis browserul
async function espGetRelay(env) {
  const s = await loadState(env);
  const desired = s.relay_set || "off";
  return new Response(desired, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}

// Browser schimbă mod: manual / auto
async function browserSetMode(url, env) {
  const mode = url.searchParams.get("value");
  if (mode !== "manual" && mode !== "auto") {
    return json({ error: "Invalid mode" }, 400);
  }

  await saveMode(env, mode);
  return json({ mode });
}

// Browser setează intervalul de temperatură pentru auto
async function browserSetAutoRange(url, env) {
  const minTemp = parseFloat(url.searchParams.get("min") ?? "5");
  const maxTemp = parseFloat(url.searchParams.get("max") ?? "18");

  if (Number.isNaN(minTemp) || Number.isNaN(maxTemp)) {
    return json({ error: "Missing or invalid min/max" }, 400);
  }

  await saveRange(env, minTemp, maxTemp);

  return json({ minTemp, maxTemp });
}

// Istoric pentru grafice
async function historyData(url, env) {
  const range = url.searchParams.get("range") ?? "24h";
  const ranges = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  const windowMs = ranges[range] ?? ranges["24h"];
  const since = Date.now() - windowMs;
  const limit = 2000;

  const res = await env.DB.prepare(
    `SELECT ts, temp, relay
       FROM history
      WHERE ts >= ?
      ORDER BY ts ASC
      LIMIT ?`
  ).bind(since, limit).all();

  const points = res?.results ?? [];
  return json({ range: ranges[range] ? range : "24h", points });
}

// helper JSON
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
