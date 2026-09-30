/* ============================================================
   CAMPUS MAP – JAVASCRIPT
   Google Maps JavaScript API integration
   ============================================================ */

"use strict";

// ── Globals ─────────────────────────────────────────────────
let map;
let markers = {};          // id → google.maps.Marker
let infoWindows = {};          // id → google.maps.InfoWindow
let activeMarkerId = null;
let activeFilters = new Set();   // empty = show all

// ── Category → accent colour mapping ────────────────────────
const CATEGORY_COLORS = {
  academic: "#00e5ff",
  library: "#a855f7",
  admin: "#f59e0b",
  sports: "#22c55e",
  food: "#f97316",
  hostel: "#ec4899",
  other: "#94a3b8",
};

// ── Night-mode map style ─────────────────────────────────────
const NIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#30363d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1c2128" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#30363d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1f2d" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6fa5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f2318" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2d5a3d" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#30363d" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
];

// ── Google Maps Authentication Failure Callback ──────────────
window.gm_authFailure = function () {
  const isFileProto = window.location.protocol === "file:";
  const toastMsg = isFileProto
    ? "Cannot load Google Maps via file://. Please open http://localhost:5500/ instead."
    : "Google Maps: RefererNotAllowedMapError. Check console for Google Cloud settings.";

  console.error(
    "[CampusWay] Google Maps JavaScript API error: RefererNotAllowedMapError.\n" +
    (isFileProto
      ? "\n⚠️ YOU ARE OPENING THE PAGE AS file://\n" +
        "Google Maps API rejects file:// origins by security design.\n" +
        "Please open http://localhost:5500/ in your browser address bar.\n"
      : "\nTo resolve this in Google Cloud Console:\n" +
        "  1. Go to Google Cloud Console: https://console.cloud.google.com/google/maps-apis/credentials\n" +
        "  2. Select your Maps API Key.\n" +
        "  3. Under \x27Application restrictions\x27, select \x27Websites\x27 (HTTP referrers).\n" +
        "  4. Add the allowed referrers:\n" +
        "       http://localhost:5500/*\n" +
        "       http://127.0.0.1:5500/*\n" +
        "  5. Click Save. Wait up to 5 minutes for Google changes to propagate.\n" +
        "  6. Refresh http://localhost:5500/ in your browser.\n")
  );
  showToast(toastMsg);
};

// ── Initialise map (called by the Maps API callback) ─────────
function initMap() {
  if (typeof CONFIG === "undefined") {
    console.error("[CampusWay] CONFIG is not loaded. Ensure config.js is loaded before initMap().");
    return;
  }

  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("[CampusWay] Map container #map not found.");
    return;
  }

  // Inject college name from config
  const collegeNameEl = document.getElementById("college-name");
  if (collegeNameEl && CONFIG.COLLEGE_NAME) {
    collegeNameEl.textContent = CONFIG.COLLEGE_NAME;
  }
  if (CONFIG.COLLEGE_NAME) {
    document.title = CONFIG.COLLEGE_NAME + " – Campus Map";
  }

  // Create map
  map = new google.maps.Map(mapElement, {
    center: CONFIG.CAMPUS_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    styles: NIGHT_STYLE,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false,   // we add our own
    gestureHandling: "greedy",
  });

  // Build everything
  buildCategoryFilters();
  buildMarkers();
  buildBuildingList(CONFIG.BUILDINGS);
  updateStats();

  // Close info panel when clicking on the map and log coordinates to console for calibration
  map.addListener("click", (e) => {
    closeInfoPanel();
    if (e && e.latLng) {
      console.log(`[Calibration] lat: ${e.latLng.lat().toFixed(6)}, lng: ${e.latLng.lng().toFixed(6)}`);
    }
  });

  // Update stats on zoom
  map.addListener("zoom_changed", updateStats);
}

// Make initMap globally available for Google Maps API callback
window.initMap = initMap;

// ── Create a custom SVG pin for each category ─────────────────
function createMarkerIcon(color, isSelected = false) {
  const size = isSelected ? 44 : 36;
  const ring = isSelected ? 6 : 4;
  const glow = isSelected ? `<circle cx="18" cy="18" r="18" fill="${color}" opacity="0.25"/>` : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
      ${glow}
      <circle cx="18" cy="18" r="${16 - ring}" fill="#161b22" stroke="${color}" stroke-width="${ring}"/>
      <circle cx="18" cy="18" r="5" fill="${color}"/>
    </svg>`;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

// ── Place all markers on the map ──────────────────────────────
function buildMarkers() {
  CONFIG.BUILDINGS.forEach((b) => {
    const color = CATEGORY_COLORS[b.category] || CATEGORY_COLORS.other;
    const marker = new google.maps.Marker({
      position: { lat: b.lat, lng: b.lng },
      map,
      title: b.name,
      icon: createMarkerIcon(color),
      animation: google.maps.Animation.DROP,
    });

    marker.addListener("click", () => selectBuilding(b.id));
    markers[b.id] = marker;
  });
}

// ── Select a building (marker + card + info panel) ────────────
function selectBuilding(id) {
  const building = CONFIG.BUILDINGS.find((b) => b.id === id);
  if (!building) return;

  // Deselect previous
  if (activeMarkerId !== null && activeMarkerId !== id) {
    const prev = CONFIG.BUILDINGS.find((b) => b.id === activeMarkerId);
    if (prev && markers[activeMarkerId]) {
      const pColor = CATEGORY_COLORS[prev.category] || CATEGORY_COLORS.other;
      markers[activeMarkerId].setIcon(createMarkerIcon(pColor, false));
      markers[activeMarkerId].setAnimation(null);
    }
  }

  // Highlight new marker
  const color = CATEGORY_COLORS[building.category] || CATEGORY_COLORS.other;
  if (markers[id]) {
    markers[id].setIcon(createMarkerIcon(color, true));
    if (typeof google !== "undefined" && google.maps && google.maps.Animation) {
      markers[id].setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => markers[id] && markers[id].setAnimation(null), 1400);
    }
  }

  activeMarkerId = id;

  // Pan map to marker
  if (map) {
    map.panTo({ lat: building.lat, lng: building.lng });
  }

  // Highlight card in sidebar
  document.querySelectorAll(".building-card").forEach((c) => c.classList.remove("selected"));
  const card = document.querySelector(`.building-card[data-id="${id}"]`);
  if (card) {
    card.classList.add("selected");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // If navigation panel is currently active, set this building as destination
  const navPanel = document.getElementById("nav-panel");
  if (navPanel && navPanel.classList.contains("visible")) {
    const destSelect = document.getElementById("nav-dest-select");
    if (destSelect) {
      destSelect.value = "B" + id;
      calculateAndShowRoute();
    }
    return;
  }

  // Show info panel
  showInfoPanel(building, color);

  // When user clicks Main Block on the campus map, open the floor selection interface
  if (building.hasIndoorMap && typeof IndoorSystem !== "undefined") {
    IndoorSystem.openFloorModal(building.indoorBuildingId || "main-block");
  }
}

// ── Info panel ────────────────────────────────────────────────
function showInfoPanel(building, color) {
  const panel = document.getElementById("info-panel");
  panel.style.setProperty("--panel-accent", color);

  document.getElementById("info-title").textContent = building.name;
  document.getElementById("info-description").textContent = building.description;
  document.getElementById("info-floors").textContent = building.floors;

  // Category badge
  const badge = document.getElementById("info-category");
  badge.textContent = building.category;
  badge.style.background = color;
  badge.style.color = "#000";

  // Facilities
  const ul = document.getElementById("facilities-list");
  ul.innerHTML = (building.facilities || [])
    .map((f) => `<li>${f}</li>`)
    .join("");

  // Indoor navigation button if building has indoor floor plans
  const indoorBtn = document.getElementById("view-indoor-btn");
  if (indoorBtn) {
    if (building.hasIndoorMap) {
      indoorBtn.style.display = "flex";
      indoorBtn.onclick = () => {
        if (typeof IndoorSystem !== "undefined") {
          IndoorSystem.openFloorModal(building.indoorBuildingId || "main-block");
        }
      };
    } else {
      indoorBtn.style.display = "none";
    }
  }

  // Navigate button — launches in-website campus directions
  document.getElementById("navigate-btn").onclick = () => {
    openNavigationPanel(null, building.id);
  };

  panel.classList.add("visible");
}

function closeInfoPanel() {
  const panel = document.getElementById("info-panel");
  if (panel) panel.classList.remove("visible");

  if (activeMarkerId !== null) {
    const b = CONFIG.BUILDINGS.find((x) => x.id === activeMarkerId);
    if (b && markers[activeMarkerId]) {
      const color = CATEGORY_COLORS[b.category] || CATEGORY_COLORS.other;
      markers[activeMarkerId].setIcon(createMarkerIcon(color, false));
      markers[activeMarkerId].setAnimation(null);
    }
    activeMarkerId = null;
  }

  document.querySelectorAll(".building-card").forEach((c) => c.classList.remove("selected"));
}

// ── In-Website Campus Walkway Navigation Engine ──────────────
let currentRouteGlow = null;
let currentRoutePolyline = null;
let startRouteMarker = null;
let endRouteMarker = null;

// Campus walkway network graph connecting landmarks and pathways
const CAMPUS_GRAPH_NODES = {
  "B1": { id: "B1", name: "Main Block", lat: 11.563737, lng: 75.650738, type: "landmark" },
  "B2": { id: "B2", name: "CSE & IT Department", lat: 11.564249, lng: 75.650972, type: "landmark" },
  "B3": { id: "B3", name: "EEE & CE Department", lat: 11.564772, lng: 75.650954, type: "landmark" },
  "B4": { id: "B4", name: "ECE Department", lat: 11.564750, lng: 75.650607, type: "landmark" },
  "B5": { id: "B5", name: "MCA Department", lat: 11.564236, lng: 75.650619, type: "landmark" },
  "B6": { id: "B6", name: "Library", lat: 11.564101, lng: 75.650697, type: "landmark" },
  "B7": { id: "B7", name: "Canteen", lat: 11.564323, lng: 75.651297, type: "landmark" },
  "B8": { id: "B8", name: "Main Gate", lat: 11.563477, lng: 75.650859, type: "landmark" },
  "B9": { id: "B9", name: "Parking Area", lat: 11.563450, lng: 75.650714, type: "landmark" },
  "B10": { id: "B10", name: "Sports Ground", lat: 11.564570, lng: 75.650059, type: "landmark" },

  // Walkway junctions for real corridor tracing
  "W_GATE": { id: "W_GATE", name: "Entrance Path Fork", lat: 11.563500, lng: 75.650800, type: "path" },
  "W_ADMIN": { id: "W_ADMIN", name: "Admin Block Walkway", lat: 11.563760, lng: 75.650760, type: "path" },
  "W_CENTRAL": { id: "W_CENTRAL", name: "Central Academic Junction", lat: 11.564170, lng: 75.650780, type: "path" },
  "W_ACAD_EAST": { id: "W_ACAD_EAST", name: "East Canteen Walkway", lat: 11.564280, lng: 75.651140, type: "path" },
  "W_ACAD_NORTH": { id: "W_ACAD_NORTH", name: "North Quad Walkway", lat: 11.564760, lng: 75.650780, type: "path" },
  "W_SPORTS": { id: "W_SPORTS", name: "Sports Ground Access Path", lat: 11.564420, lng: 75.650320, type: "path" },
};

const CAMPUS_GRAPH_EDGES = [
  // Gate & Parking to Entrance Road
  ["B8", "W_GATE"],
  ["B9", "W_GATE"],
  ["W_GATE", "W_ADMIN"],

  // Admin Area
  ["W_ADMIN", "B1"],
  ["W_ADMIN", "B6"],

  // Central Hub (Library / MCA / CSE Corridor)
  ["B6", "W_CENTRAL"],
  ["W_CENTRAL", "B5"],
  ["W_CENTRAL", "B2"],

  // East Side towards Canteen
  ["B2", "W_ACAD_EAST"],
  ["W_ACAD_EAST", "B7"],

  // North Academic Quad (CSE, EEE, ECE, MCA)
  ["B2", "B3"],
  ["B3", "W_ACAD_NORTH"],
  ["W_ACAD_NORTH", "B4"],
  ["B4", "B5"],

  // West Side towards Sports Ground
  ["B5", "W_SPORTS"],
  ["B4", "W_SPORTS"],
  ["W_SPORTS", "B10"],
];

// Calculate Haversine geodesic distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Client-side Dijkstra shortest path algorithm
function findCampusRoute(startNodeId, endNodeId) {
  if (startNodeId === endNodeId) return null;

  const adj = {};
  for (const nodeKey in CAMPUS_GRAPH_NODES) {
    adj[nodeKey] = [];
  }
  CAMPUS_GRAPH_EDGES.forEach(([u, v]) => {
    if (adj[u] && adj[v]) {
      const dist = getDistanceMeters(
        CAMPUS_GRAPH_NODES[u].lat, CAMPUS_GRAPH_NODES[u].lng,
        CAMPUS_GRAPH_NODES[v].lat, CAMPUS_GRAPH_NODES[v].lng
      );
      adj[u].push({ node: v, dist });
      adj[v].push({ node: u, dist });
    }
  });

  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(CAMPUS_GRAPH_NODES));

  for (const nodeKey in CAMPUS_GRAPH_NODES) {
    distances[nodeKey] = Infinity;
  }
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let current = null;
    for (const node of unvisited) {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    }

    if (distances[current] === Infinity || current === endNodeId) break;

    unvisited.delete(current);

    for (const neighbor of adj[current]) {
      if (!unvisited.has(neighbor.node)) continue;
      const alt = distances[current] + neighbor.dist;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
      }
    }
  }

  if (distances[endNodeId] === Infinity) return null;

  const path = [];
  let curr = endNodeId;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    pathNodes: path,
    totalDistance: distances[endNodeId],
    coordinates: path.map(id => ({ lat: CAMPUS_GRAPH_NODES[id].lat, lng: CAMPUS_GRAPH_NODES[id].lng }))
  };
}

// Generate human-friendly turn-by-turn guidance steps
function generateRouteSteps(pathNodes) {
  const steps = [];
  const startNode = CAMPUS_GRAPH_NODES[pathNodes[0]];
  const endNode = CAMPUS_GRAPH_NODES[pathNodes[pathNodes.length - 1]];

  steps.push({
    isStart: true,
    text: `Depart from <strong>${startNode.name}</strong>`,
    distanceText: "Start point"
  });

  for (let i = 1; i < pathNodes.length; i++) {
    const prev = CAMPUS_GRAPH_NODES[pathNodes[i - 1]];
    const curr = CAMPUS_GRAPH_NODES[pathNodes[i]];
    const segDist = Math.round(getDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng));

    if (i === pathNodes.length - 1) {
      steps.push({
        isDest: true,
        text: `Arrive at <strong>${curr.name}</strong>`,
        distanceText: `Destination reached (~${segDist} m)`
      });
    } else if (curr.type === "landmark") {
      steps.push({
        text: `Pass by <strong>${curr.name}</strong> along walkway`,
        distanceText: `~${segDist} m`
      });
    } else {
      steps.push({
        text: `Continue through <strong>${curr.name}</strong>`,
        distanceText: `~${segDist} m`
      });
    }
  }

  return steps;
}

// Custom SVG pins for navigation start (A) and destination (B)
function createRoutePin(type) {
  const isStart = type === "start";
  const bg = isStart ? "#22c55e" : "#00e5ff";
  const label = isStart ? "A" : "B";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <defs>
        <filter id="nav-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M17 0 C7.6 0 0 7.6 0 17 C0 28 17 42 17 42 C17 42 34 28 34 17 C34 7.6 26.4 0 17 0 Z" fill="${bg}" filter="url(#nav-shadow)"/>
      <circle cx="17" cy="16" r="10" fill="#0d1117"/>
      <text x="17" y="20" fill="${bg}" font-size="12" font-family="Inter, sans-serif" font-weight="bold" text-anchor="middle">${label}</text>
    </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(34, 42),
    anchor: new google.maps.Point(17, 42),
  };
}

// Clear active navigation route visuals from the map
function clearCampusRouteVisuals() {
  if (currentRouteGlow) { currentRouteGlow.setMap(null); currentRouteGlow = null; }
  if (currentRoutePolyline) { currentRoutePolyline.setMap(null); currentRoutePolyline = null; }
  if (startRouteMarker) { startRouteMarker.setMap(null); startRouteMarker = null; }
  if (endRouteMarker) { endRouteMarker.setMap(null); endRouteMarker = null; }
}

// Draw the glowing in-website navigation route polyline
function drawCampusRoute(coords) {
  clearCampusRouteVisuals();

  if (!map || typeof google === "undefined" || !google.maps) return;

  // Outer glowing line
  currentRouteGlow = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: "#00e5ff",
    strokeOpacity: 0.35,
    strokeWeight: 10,
    map: map,
    zIndex: 10,
  });

  // Core crisp neon line
  currentRoutePolyline = new google.maps.Polyline({
    path: coords,
    geodesic: true,
    strokeColor: "#00e5ff",
    strokeOpacity: 0.95,
    strokeWeight: 4,
    map: map,
    zIndex: 11,
  });

  // Start (A) marker
  startRouteMarker = new google.maps.Marker({
    position: coords[0],
    map: map,
    title: "Start Point (A)",
    icon: createRoutePin("start"),
    zIndex: 15,
  });

  // Destination (B) marker
  endRouteMarker = new google.maps.Marker({
    position: coords[coords.length - 1],
    map: map,
    title: "Destination (B)",
    icon: createRoutePin("dest"),
    zIndex: 16,
  });

  // Re-fit view to show entire route with comfortable padding
  const bounds = new google.maps.LatLngBounds();
  coords.forEach(pt => bounds.extend(pt));
  map.fitBounds(bounds, { top: 80, right: 380, bottom: 100, left: 80 });
}

// Populate dropdown selectors for navigation origin and destination
function populateNavSelects() {
  const startSelect = document.getElementById("nav-start-select");
  const destSelect = document.getElementById("nav-dest-select");

  if (!startSelect || !destSelect) return;
  if (startSelect.options.length > 0) return; // already populated

  CONFIG.BUILDINGS.forEach((b) => {
    const optStart = document.createElement("option");
    optStart.value = "B" + b.id;
    optStart.textContent = b.name;
    startSelect.appendChild(optStart);

    const optDest = document.createElement("option");
    optDest.value = "B" + b.id;
    optDest.textContent = b.name;
    destSelect.appendChild(optDest);
  });
}

// Open the in-website navigation panel
function openNavigationPanel(startBuildingId = null, destBuildingId = null) {
  closeInfoPanel();
  populateNavSelects();

  const startSelect = document.getElementById("nav-start-select");
  const destSelect = document.getElementById("nav-dest-select");

  if (startBuildingId) {
    startSelect.value = "B" + startBuildingId;
  } else if (!startSelect.value) {
    startSelect.value = "B8"; // Default to Main Gate
  }

  if (destBuildingId) {
    destSelect.value = "B" + destBuildingId;
  } else if (!destSelect.value || destSelect.value === startSelect.value) {
    destSelect.value = "B1"; // Default to Admin Block
  }

  document.getElementById("nav-panel").classList.add("visible");
  const navBtn = document.getElementById("nav-mode-btn");
  if (navBtn) navBtn.classList.add("active");

  calculateAndShowRoute();
}

// Close the in-website navigation panel
function closeNavigationPanel() {
  document.getElementById("nav-panel").classList.remove("visible");
  const navBtn = document.getElementById("nav-mode-btn");
  if (navBtn) navBtn.classList.remove("active");
}

// Calculate the route and display metrics & steps
function calculateAndShowRoute() {
  const startSelect = document.getElementById("nav-start-select");
  const destSelect = document.getElementById("nav-dest-select");

  if (!startSelect || !destSelect) return;

  const startId = startSelect.value;
  const destId = destSelect.value;

  if (startId === destId) {
    clearCampusRouteVisuals();
    document.getElementById("nav-time").textContent = "0 min";
    document.getElementById("nav-distance").textContent = "0 m";
    document.getElementById("nav-steps-list").innerHTML = `
      <div class="nav-step-item">
        <div class="nav-step-num">!</div>
        <div class="nav-step-text"><strong>Same location:</strong> Starting point and destination are identical. Select a different destination to navigate.</div>
      </div>`;
    return;
  }

  const result = findCampusRoute(startId, destId);

  if (!result) {
    showToast("No walkway route found between selected points.");
    return;
  }

  // Draw the route on the map in the website
  drawCampusRoute(result.coordinates);

  // Calculate metrics (average pedestrian walking speed: ~1.25 m/s or 75 m/min)
  const distMeters = Math.round(result.totalDistance);
  const walkMinutes = Math.max(1, Math.round(distMeters / 75));

  document.getElementById("nav-time").textContent = `${walkMinutes} min walk`;
  document.getElementById("nav-distance").textContent = `${distMeters} meters`;

  // Render step-by-step turn directions
  const steps = generateRouteSteps(result.pathNodes);
  const stepsContainer = document.getElementById("nav-steps-list");
  stepsContainer.innerHTML = "";

  steps.forEach((step, idx) => {
    const item = document.createElement("div");
    item.className = "nav-step-item" +
      (step.isStart ? " is-start" : "") +
      (step.isDest ? " is-destination" : "");

    const badgeSymbol = step.isStart ? "A" : (step.isDest ? "B" : (idx + 1));

    item.innerHTML = `
      <div class="nav-step-num">${badgeSymbol}</div>
      <div class="nav-step-text">
        <div>${step.text}</div>
        <div class="nav-step-dist">${step.distanceText}</div>
      </div>`;

    stepsContainer.appendChild(item);
  });
}

// ── Category filter pills ─────────────────────────────────────
function buildCategoryFilters() {
  const categories = [...new Set(CONFIG.BUILDINGS.map((b) => b.category))];
  const container = document.getElementById("category-filters");

  // "All" pill
  const allPill = makePill("All", null);
  allPill.classList.add("active");
  allPill.style.background = "var(--accent)";
  allPill.style.borderColor = "var(--accent)";
  allPill.style.color = "#000";
  container.appendChild(allPill);

  categories.forEach((cat) => {
    const pill = makePill(cat, cat);
    container.appendChild(pill);
  });
}

function makePill(label, category) {
  const color = category ? (CATEGORY_COLORS[category] || CATEGORY_COLORS.other) : "var(--accent)";
  const pill = document.createElement("button");
  pill.className = "filter-pill";
  pill.textContent = label;
  pill.dataset.cat = category || "all";

  pill.addEventListener("click", () => {
    if (category === null) {
      // All
      activeFilters.clear();
      document.querySelectorAll(".filter-pill").forEach((p) => {
        p.classList.remove("active");
        p.style.background = "";
        p.style.borderColor = "";
        p.style.color = "";
      });
      pill.classList.add("active");
      pill.style.background = color;
      pill.style.borderColor = color;
      pill.style.color = "#000";
    } else {
      // Clear "All" pill styling
      const allPill = document.querySelector('.filter-pill[data-cat="all"]');
      allPill.classList.remove("active");
      allPill.style.background = "";
      allPill.style.borderColor = "";
      allPill.style.color = "";

      if (activeFilters.has(category)) {
        activeFilters.delete(category);
        pill.classList.remove("active");
        pill.style.background = "";
        pill.style.borderColor = "";
        pill.style.color = "";
      } else {
        activeFilters.add(category);
        pill.classList.add("active");
        pill.style.background = color;
        pill.style.borderColor = color;
        pill.style.color = "#000";
      }

      // If nothing active, reset to "All"
      if (activeFilters.size === 0) {
        allPill.classList.add("active");
        allPill.style.background = "var(--accent)";
        allPill.style.borderColor = "var(--accent)";
        allPill.style.color = "#000";
      }
    }

    applyFilters();
  });

  return pill;
}

function applyFilters() {
  closeInfoPanel();

  const filtered = activeFilters.size === 0
    ? CONFIG.BUILDINGS
    : CONFIG.BUILDINGS.filter((b) => activeFilters.has(b.category));

  // Show/hide markers
  CONFIG.BUILDINGS.forEach((b) => {
    const visible = filtered.some((f) => f.id === b.id);
    if (markers[b.id]) {
      markers[b.id].setVisible(visible);
    }
  });

  buildBuildingList(filtered);
  updateStats();
}

// ── Sidebar building list ─────────────────────────────────────
function buildBuildingList(buildings) {
  const container = document.getElementById("building-list");
  container.innerHTML = "";

  if (buildings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M17.5 17.5L22 22M20 11A9 9 0 1 1 2 11a9 9 0 0 1 18 0Z"/>
        </svg>
        <p>No buildings match the selected filters.</p>
      </div>`;
    return;
  }

  buildings.forEach((b) => {
    const color = CATEGORY_COLORS[b.category] || CATEGORY_COLORS.other;
    const card = document.createElement("div");
    card.className = "building-card";
    card.dataset.id = b.id;
    card.style.setProperty("--card-accent", color);

    const indoorBadge = b.hasIndoorMap ? `<span class="building-indoor-badge">🏢 2 Floors</span>` : "";

    card.innerHTML = `
      <div class="building-card-top">
        <div class="building-name">${b.name} ${indoorBadge}</div>
        <div class="building-badge" style="background:${color}">${b.category}</div>
      </div>
      <div class="building-desc">${b.description}</div>`;

    card.addEventListener("click", () => selectBuilding(b.id));
    container.appendChild(card);
  });
}

// ── Search ────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (!q) { results.classList.remove("visible"); return; }

    const matched = CONFIG.BUILDINGS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)
    );

    results.innerHTML = "";

    if (matched.length === 0) {
      results.innerHTML = `<div class="search-result-item" style="color:var(--text-muted)">No results found</div>`;
    } else {
      matched.forEach((b) => {
        const color = CATEGORY_COLORS[b.category] || CATEGORY_COLORS.other;
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.innerHTML = `<span class="dot" style="background:${color}"></span>${b.name}`;
        item.addEventListener("click", () => {
          input.value = b.name;
          results.classList.remove("visible");
          selectBuilding(b.id);
        });
        results.appendChild(item);
      });
    }

    results.classList.add("visible");
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!document.getElementById("search-bar").contains(e.target)) {
      results.classList.remove("visible");
    }
  });

  // Close on Escape
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { results.classList.remove("visible"); input.blur(); }
  });
}

// ── Stats bar ─────────────────────────────────────────────────
function updateStats() {
  const visible = CONFIG.BUILDINGS.filter(
    (b) => activeFilters.size === 0 || activeFilters.has(b.category)
  );

  document.getElementById("stat-total").textContent = CONFIG.BUILDINGS.length;
  document.getElementById("stat-visible").textContent = visible.length;
  document.getElementById("stat-zoom").textContent = map ? map.getZoom() : CONFIG.DEFAULT_ZOOM;
}

// ── Sidebar toggle ────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("toggle-sidebar-btn");
  sidebar.classList.toggle("collapsed");
  btn.classList.toggle("active");
  btn.innerHTML = sidebar.classList.contains("collapsed")
    ? `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg> Show Panel`
    : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg> Hide Panel`;
}

// ── Zoom controls ─────────────────────────────────────────────
function zoomIn() { if (map) map.setZoom(map.getZoom() + 1); }
function zoomOut() { if (map) map.setZoom(map.getZoom() - 1); }

// ── Reset view ────────────────────────────────────────────────
function resetView() {
  if (!map) return;
  closeInfoPanel();
  map.panTo(CONFIG.CAMPUS_CENTER);
  map.setZoom(CONFIG.DEFAULT_ZOOM);
  showToast("Map reset to campus centre");
}

// ── Map type toggle ───────────────────────────────────────────
let isSatellite = false;
function toggleMapType() {
  if (!map) return;
  isSatellite = !isSatellite;
  if (isSatellite) {
    map.setMapTypeId("hybrid");
    map.setOptions({ styles: [] });
    showToast("Switched to Satellite view");
  } else {
    map.setMapTypeId("roadmap");
    map.setOptions({ styles: NIGHT_STYLE });
    showToast("Switched to Night map view");
  }
}

// ── Toast helper ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── DOM ready – wire up non-map UI ────────────────────────────
function initAppUI() {
  if (window.location.protocol === "file:") {
    showToast("⚠️ Opened via file://. Please use http://localhost:5500/ instead.");
  }
  initSearch();

  const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
  if (toggleSidebarBtn) toggleSidebarBtn.addEventListener("click", toggleSidebar);

  const closePanelBtn = document.getElementById("close-panel");
  if (closePanelBtn) closePanelBtn.addEventListener("click", closeInfoPanel);

  const resetViewBtn = document.getElementById("reset-view-btn");
  if (resetViewBtn) resetViewBtn.addEventListener("click", resetView);

  const satBtn = document.getElementById("sat-btn");
  if (satBtn) satBtn.addEventListener("click", toggleMapType);

  const zoomInBtn = document.getElementById("zoom-in-btn");
  if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);

  const zoomOutBtn = document.getElementById("zoom-out-btn");
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);

  // In-Website Navigation controls
  const navModeBtn = document.getElementById("nav-mode-btn");
  if (navModeBtn) {
    navModeBtn.addEventListener("click", () => {
      const panel = document.getElementById("nav-panel");
      if (panel.classList.contains("visible")) {
        closeNavigationPanel();
      } else {
        openNavigationPanel();
      }
    });
  }

  const closeNavBtn = document.getElementById("close-nav-panel");
  if (closeNavBtn) {
    closeNavBtn.addEventListener("click", closeNavigationPanel);
  }

  const startSel = document.getElementById("nav-start-select");
  if (startSel) {
    startSel.addEventListener("change", calculateAndShowRoute);
  }

  const destSel = document.getElementById("nav-dest-select");
  if (destSel) {
    destSel.addEventListener("change", calculateAndShowRoute);
  }

  const swapBtn = document.getElementById("nav-swap-btn");
  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      const s = document.getElementById("nav-start-select");
      const d = document.getElementById("nav-dest-select");
      const temp = s.value;
      s.value = d.value;
      d.value = temp;
      calculateAndShowRoute();
      showToast("Directions reversed");
    });
  }

  const clearBtn = document.getElementById("nav-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearCampusRouteVisuals();
      closeNavigationPanel();
      showToast("Route cleared");
    });
  }

  const recenterBtn = document.getElementById("nav-recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", () => {
      if (currentRoutePolyline && map) {
        const bounds = new google.maps.LatLngBounds();
        currentRoutePolyline.getPath().forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds, { top: 80, right: 380, bottom: 100, left: 80 });
      }
    });
  }

  const geoBtn = document.getElementById("nav-geo-btn");
  if (geoBtn) {
    geoBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser");
        return;
      }
      showToast("Finding your current location...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          let closest = "B8"; // Default: Main Gate
          let minDist = Infinity;
          for (const key in CAMPUS_GRAPH_NODES) {
            const n = CAMPUS_GRAPH_NODES[key];
            const d = getDistanceMeters(uLat, uLng, n.lat, n.lng);
            if (d < minDist) {
              minDist = d;
              closest = key;
            }
          }
          const s = document.getElementById("nav-start-select");
          if (s) {
            s.value = closest;
            calculateAndShowRoute();
            showToast(`Origin set to nearest landmark: ${CAMPUS_GRAPH_NODES[closest].name}`);
          }
        },
        () => {
          showToast("Could not retrieve GPS location. Defaulting to Main Gate.");
          const s = document.getElementById("nav-start-select");
          if (s) {
            s.value = "B8";
            calculateAndShowRoute();
          }
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    });
  }
}

// Auto-initialize when DOM is ready (or immediately if already parsed)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAppUI);
} else {
  initAppUI();
}
