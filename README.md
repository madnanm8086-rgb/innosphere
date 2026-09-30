# CampusWay – Campus Navigation Map

Interactive campus map and multi-floor indoor navigation system for College of Engineering Vadakara (CEV), powered by the Google Maps JavaScript API.

---

## Local Development Setup

To run CampusWay locally with the proper HTTP origin required by the Google Maps JavaScript API:

1. Open your terminal and navigate to the project directory:
   ```bash
   cd "/Users/adnan/Desktop/BIT BURST/CampusWay"
   ```

2. Start the local HTTP server on port 5500:
   ```bash
   python3 -m http.server 5500
   ```
   *(Alternatively, you can run `node server.js` which also defaults to port 5500).*

3. Open the application in your browser:
   ```
   http://localhost:5500/
   ```

---

## Google Cloud Console API Key Configuration

### Why `file:///` Failed:
When opening `index.html` directly as `file:///Users/adnan/...`, the browser sends no referrer (or a `file://` null origin). If the Google Maps API key has website restrictions enabled, Google Maps rejects requests with `RefererNotAllowedMapError`.

### Required Google Cloud Settings:
To allow the Google Maps JavaScript API to load when running locally at `http://localhost:5500/`:

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis/credentials).
2. Click on the API key used by the project (specified in `config.js`).
3. Under **Set application restrictions**, ensure **Websites** (HTTP referrers) is selected.
4. Under **Website restrictions**, click **ADD** and include:
   - `http://localhost:5500/*`
   - `http://127.0.0.1:5500/*` (optional, for 127.0.0.1 access)
5. Under **API restrictions**, ensure **Maps JavaScript API** is allowed (or "Don't restrict key").
6. Click **Save**.

> **Note:** Changes made in Google Cloud Console may take **3 to 5 minutes** to propagate. Once saved, refresh `http://localhost:5500/` in your browser.

---

## Project Structure

- `index.html` – Primary user interface, header controls, sidebar, map viewport, and modals.
- `styles.css` – Night-mode responsive stylesheet with custom neon accents.
- `config.js` – Campus configuration, center coordinates, building metadata, and Google Maps API key.
- `app.js` – Google Maps initialization (`initMap`), markers, Dijkstra shortest-path navigation, search, and category filters.
- `indoor.js` – Multi-floor indoor navigation engine (`IndoorSystem`) for Main Block floor plans.
- `server.js` – Standalone zero-dependency Node.js HTTP server configured for port 5500.
