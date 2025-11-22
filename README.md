# BrimTech Controller – ESP32 Remote Temperature & Relay Control

Ghid complet pentru configurarea serverului (Cloudflare Workers + D1), a paginii web, a firmware‑ului ESP32 si a conexiunilor hardware.

## Arhitectura pe scurt
- Cloudflare Worker (`worker.js`) serveste pagina web din `public/` si API-ul `/api/*`.
- Baza de date D1 (schema in `init.sql`) pastreaza starea: temperatura, modul, releu setat/raportat, intervale auto si timpii ultimelor actualizari.
- Pagina web (`public/index.html`, `public/script.js`) trimite comenzi si citeste starea prin API.
- ESP32 (cod in `esp32_brimtech_controller.ino`) citeste temperatura DHT11, comanda releul, sincronizeaza starea cu serverul la ~4 s si aplica logica auto/manual.

## Cerinte preliminare
- Cont Cloudflare cu acces la Workers si D1.
- Node.js + npm (pentru Wrangler CLI si dependente).
- IDE Arduino (sau Arduino CLI) cu suport pentru placa ESP32.
- Conexiune Wi-Fi 2.4 GHz pentru ESP32.

## Instalare server + pagina web (Cloudflare Worker)
1) Instaleaza Wrangler:
```bash
npm install -g wrangler
```
2) Autentifica-te:
```bash
wrangler login
```
3) Instaleaza dependente locale (pentru handlerul de asset-uri):
```bash
npm install
```
4) Creeaza baza de date D1 si leaga-o la proiect:
```bash
wrangler d1 create brimtech_controller
```
Copieaza `database_id` rezultat si pune-l in `wrangler.toml` la `database_id` (sectiunea `[[d1_databases]]`).
5) Initializeaza schema in D1:
```bash
wrangler d1 execute brimtech_controller --file=init.sql
```
6) Seteaza token-ul de acces (string arbitrar, doar tu il stii):
```bash
wrangler secret put TOKEN
# introduce manual token-ul, ex: BtC_<random>
```
Actualizeaza acelasi token in `public/script.js` (const `TOKEN`) si in `esp32_brimtech_controller.ino` (variabila `token`).
7) Ruleaza local in cloud (cu D1 remote):
```bash
wrangler dev --remote
```
Pagina va fi servita pe URL-ul local oferit de Wrangler; API-ul raspunde pe `/api/*`.
8) Deploy in productie:
```bash
wrangler publish
```
URL-ul final este de forma `https://<name>.<subdomeniu>.workers.dev` (definit de `name` din `wrangler.toml`).

## Endpoints API (pentru sincronizare)
- `GET /api/temp?token=...` – citire status complet (browser/ESP).
- `GET /api/update?token=...&temp=..&relay=on|off` – trimis de ESP (raporteaza temperatura si starea releului).
- `GET /api/relay?token=...&state=on|off` – setare manuala din browser.
- `GET /api/relay-state?token=...` – ESP citeste starea dorita cand este in modul manual.
- `GET /api/mode?token=...&value=manual|auto` – comutare mod.
- `GET /api/auto-range?token=...&min=..&max=..` – setare interval auto.

## Configurare pagina web
- Fisierele din `public/` sunt servite automat de Worker prin configuratia `[assets]` din `wrangler.toml`; nu ai nevoie de hosting separat.
- Daca modifici `public/script.js`, asigura-te ca `TOKEN` si `API_BASE` sunt corecte:
  - `TOKEN` trebuie sa fie acelasi cu secretul pus in Wrangler si in firmware.
  - `API_BASE` gol inseamna aceeasi origine cu Worker-ul; seteaza URL complet doar daca servesti pagina din alt domeniu.
- Pentru a testa local, ruleaza `wrangler dev --remote` si deschide URL-ul local generat.

## Configurare firmware ESP32 (Arduino IDE)
1) Instaleaza suportul pentru placa ESP32 in Arduino IDE (Board Manager, URL corespunzatoare Espressif).
2) Librarii necesare:
   - `WiFi` (vine cu pachetul ESP32)
   - `WiFiClientSecure` (inclus in pachetul ESP32)
   - `HTTPClient` (inclus in pachetul ESP32)
   - `DHT sensor library` (Adafruit) + `Adafruit Unified Sensor`
3) Deschide `esp32_brimtech_controller.ino` in Arduino IDE.
4) Completeaza Wi-Fi SSID/PASS (const `ssid`/`password`), adauga `server` cu URL-ul Worker-ului tau si `token` identic cu cel din Wrangler si pagina web.
5) Selecteaza placa `ESP32 Dev Module` (sau modelul tau), portul serial, apoi `Upload`.

## Conexiuni hardware (pinii impliciti din cod)
- DHT11: semnal pe GPIO 15 (`DHT_PIN`).
- Releu SSR: control pe GPIO 4 (`RELAY_PIN`).
- LED status:
  - GPIO 21 (`LED_ON`) – releu ON.
  - GPIO 5 (`LED_OFF`) – releu OFF.
  - GPIO 34 (`LED_WIFI`) – Wi-Fi OK.
Pinii pot fi modificati in sketch prin redefinirea constantelor `DHT_PIN`, `RELAY_PIN`, `LED_ON`, `LED_OFF`, `LED_WIFI`.

## Moduri de functionare si sincronizare
- **Manual**: Browserul seteaza releul prin `/api/relay`; ESP citeste dorinta la fiecare ciclu prin `/api/relay-state` si aplica starea.
- **Auto**: ESP citeste intervalul min/max si modul prin `/api/temp`. Daca `temp < min` pornesc releul, daca `temp > max` il opreste.
- **Failsafe temperaturi**: daca ESP citeste >= 40°C, forteaza releul OFF.
- **Pierdere Wi-Fi**: ESP stinge LED-ul Wi-Fi, trece in manual si opreste releul pana revine conexiunea.
- **Frecventa sincronizare**: ~4 s intre update-uri ESP ↔ server.

## Limitari cunoscute
- Autentificarea se bazeaza doar pe token static stocat in firmware si in frontend; nu exista rotatie automata sau criptare suplimentara (certificatul TLS nu este verificat – `setInsecure()`).
- O singura intrare in baza de date (`id = 1`); nu exista multi-dispozitiv sau multi-utilizator.
- Nu exista OTA pentru firmware; modificarile de token sau pinii cer reflash.
- DHT11 are precizie si stabilitate reduse; pentru valori critice este recomandat un senzor mai precis (ex. DHT22/SHT).
- Nu sunt incluse teste automate sau monitorizare; worker-ul nu limiteaza rata de acces.

## Checklist rapid de sincronizare
- Token-ul este acelasi in: `wrangler secret TOKEN`, `public/script.js`, `esp32_brimtech_controller.ino`.
- `wrangler.toml` foloseste `database_id` corect si numele bazei create.
- `init.sql` a fost rulat in D1 (exista randul `id=1`).
- URL-ul `server` din firmware corespunde Worker-ului public.

## Troubleshooting scurt
- Pagina nu se incarca: verifica `wrangler dev --remote` sau `wrangler publish` si log-urile Worker (`wrangler tail`).
- API 401 Unauthorized: token diferit intre browser/ESP si Worker.
- ESP nu se conecteaza: verifica SSID/PASS si alimentarea; GPIO pentru LED Wi-Fi ar trebui sa se aprinda cand conexiunea este stabila.
- Temperatura nu se actualizeaza: confirma cablarea DHT11 pe GPIO 15 si alimentarea, verifica libraria DHT instalata.
