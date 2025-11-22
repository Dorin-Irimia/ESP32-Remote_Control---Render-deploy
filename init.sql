CREATE TABLE IF NOT EXISTS state (
  id INTEGER PRIMARY KEY,
  temp REAL,
  relay_set TEXT,
  relay_esp TEXT,
  mode TEXT,
  min_temp REAL,
  max_temp REAL,
  last_esp_update INTEGER,
  last_browser_update INTEGER
);

INSERT OR IGNORE INTO state (id, temp, relay_set, relay_esp, mode, min_temp, max_temp)
VALUES (1, 0, 'off', 'off', 'manual', 5, 18);
