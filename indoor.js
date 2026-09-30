// ============================================================
//  INDOOR NAVIGATION SYSTEM – JAVASCRIPT
//  Dedicated Multi-Floor Indoor Navigation Engine
// ============================================================

"use strict";

const IndoorSystem = (function () {
  // ── State ───────────────────────────────────────────────────
  let currentBuildingId = "main-block";
  let currentFloorId = "first"; // "first" | "second"

  // Transform / Pan-Zoom state
  let scale = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  // Touch state
  let touchStartDist = 0;
  let touchStartScale = 1.0;

  // Active room & route
  let activeRoomId = null;
  let activeIndoorRoute = null;

  // DOM elements cache
  let elements = {};

  // ── Initialize Indoor System ────────────────────────────────
  function init() {
    cacheElements();
    bindEvents();
    console.log("[IndoorSystem] Multi-floor indoor navigation initialized for Main Block (First & Second Floor).");
  }

  function cacheElements() {
    elements = {
      // Modal
      floorModal: document.getElementById("floor-select-modal"),
      modalBuildingTitle: document.getElementById("modal-building-title"),
      btnFirstFloor: document.getElementById("btn-select-first-floor"),
      btnSecondFloor: document.getElementById("btn-select-second-floor"),
      btnCloseModal: document.getElementById("close-floor-modal"),

      // Viewer
      viewer: document.getElementById("indoor-viewer"),
      btnCloseViewer: document.getElementById("close-indoor-viewer"),
      btnBackToFloors: document.getElementById("btn-back-to-floors"),
      viewerBuildingTitle: document.getElementById("indoor-building-title"),

      // Floor Switcher
      btnFloorFirst: document.getElementById("indoor-tab-first"),
      btnFloorSecond: document.getElementById("indoor-tab-second"),

      // Viewport & Pan-Zoom
      viewport: document.getElementById("indoor-viewport"),
      panZoomContainer: document.getElementById("indoor-pan-zoom-container"),
      floorImg: document.getElementById("indoor-floor-img"),
      imgFallback: document.getElementById("indoor-img-fallback"),
      markersContainer: document.getElementById("indoor-markers-container"),
      pathsSvg: document.getElementById("indoor-paths-svg"),

      // Zoom Controls
      btnZoomIn: document.getElementById("indoor-zoom-in"),
      btnZoomOut: document.getElementById("indoor-zoom-out"),
      btnZoomReset: document.getElementById("indoor-zoom-reset"),

      // Search
      searchInput: document.getElementById("indoor-search-input"),
      searchResults: document.getElementById("indoor-search-results"),
      searchClear: document.getElementById("indoor-search-clear"),

      // Room Info Panel
      roomPanel: document.getElementById("indoor-room-panel"),
      roomTitle: document.getElementById("indoor-room-title"),
      roomBadge: document.getElementById("indoor-room-badge"),
      roomFloorText: document.getElementById("indoor-room-floor"),
      roomNumberText: document.getElementById("indoor-room-number"),
      roomDesc: document.getElementById("indoor-room-desc"),
      btnRoomNavigate: document.getElementById("indoor-room-navigate-btn"),
      btnCloseRoomPanel: document.getElementById("close-indoor-room-panel"),

      // Indoor Nav Panel
      navPanel: document.getElementById("indoor-nav-panel"),
      navStartSelect: document.getElementById("indoor-nav-start-select"),
      navDestSelect: document.getElementById("indoor-nav-dest-select"),
      navSwapBtn: document.getElementById("indoor-nav-swap-btn"),
      navTimeText: document.getElementById("indoor-nav-time"),
      navDistText: document.getElementById("indoor-nav-distance"),
      navStepsList: document.getElementById("indoor-nav-steps-list"),
      btnNavClear: document.getElementById("indoor-nav-clear-btn"),
      btnCloseNav: document.getElementById("close-indoor-nav-panel"),
    };
  }

  // ── Event Bindings ──────────────────────────────────────────
  function bindEvents() {
    // Floor Selection Modal
    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener("click", closeFloorModal);
    }
    if (elements.floorModal) {
      elements.floorModal.addEventListener("click", (e) => {
        if (e.target === elements.floorModal) closeFloorModal();
      });
    }

    if (elements.btnFirstFloor) {
      elements.btnFirstFloor.addEventListener("click", () => {
        openIndoorViewer(currentBuildingId, "first");
      });
    }
    if (elements.btnSecondFloor) {
      elements.btnSecondFloor.addEventListener("click", () => {
        openIndoorViewer(currentBuildingId, "second");
      });
    }

    // Viewer Navigation
    if (elements.btnCloseViewer) {
      elements.btnCloseViewer.addEventListener("click", closeIndoorViewer);
    }
    if (elements.btnBackToFloors) {
      elements.btnBackToFloors.addEventListener("click", () => {
        closeIndoorViewer();
        openFloorModal(currentBuildingId);
      });
    }

    // Floor Switcher Tabs
    if (elements.btnFloorFirst) {
      elements.btnFloorFirst.addEventListener("click", () => switchFloor("first"));
    }
    if (elements.btnFloorSecond) {
      elements.btnFloorSecond.addEventListener("click", () => switchFloor("second"));
    }

    // Pan & Zoom Controls
    if (elements.btnZoomIn) {
      elements.btnZoomIn.addEventListener("click", () => zoomStep(1.25));
    }
    if (elements.btnZoomOut) {
      elements.btnZoomOut.addEventListener("click", () => zoomStep(0.8));
    }
    if (elements.btnZoomReset) {
      elements.btnZoomReset.addEventListener("click", resetView);
    }

    // Viewport Mouse Pan & Wheel Zoom
    if (elements.viewport) {
      elements.viewport.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      elements.viewport.addEventListener("wheel", onWheel, { passive: false });

      // Mobile Touch Gestures
      elements.viewport.addEventListener("touchstart", onTouchStart, { passive: false });
      elements.viewport.addEventListener("touchmove", onTouchMove, { passive: false });
      elements.viewport.addEventListener("touchend", onTouchEnd);

      // Calibration click logger
      elements.viewport.addEventListener("click", onViewportClick);
    }

    // Floor plan image load and error handling
    if (elements.floorImg) {
      elements.floorImg.addEventListener("load", onImageLoaded);
      elements.floorImg.addEventListener("error", onImageError);
    }

    // Room Panel Close
    if (elements.btnCloseRoomPanel) {
      elements.btnCloseRoomPanel.addEventListener("click", closeRoomPanel);
    }

    // Room Navigate Button
    if (elements.btnRoomNavigate) {
      elements.btnRoomNavigate.addEventListener("click", () => {
        if (activeRoomId) {
          startIndoorNavigation(activeRoomId);
        }
      });
    }

    // Indoor Search
    if (elements.searchInput) {
      elements.searchInput.addEventListener("input", onSearchInput);
      elements.searchInput.addEventListener("focus", onSearchInput);
    }
    if (elements.searchClear) {
      elements.searchClear.addEventListener("click", () => {
        elements.searchInput.value = "";
        elements.searchResults.classList.remove("visible");
        elements.searchClear.style.display = "none";
      });
    }
    document.addEventListener("click", (e) => {
      const searchBox = document.getElementById("indoor-search-box");
      if (searchBox && !searchBox.contains(e.target)) {
        if (elements.searchResults) elements.searchResults.classList.remove("visible");
      }
    });

    // Indoor Nav Panel
    if (elements.btnCloseNav) {
      elements.btnCloseNav.addEventListener("click", closeIndoorNavPanel);
    }
    if (elements.btnNavClear) {
      elements.btnNavClear.addEventListener("click", clearIndoorRoute);
    }
    if (elements.navSwapBtn) {
      elements.navSwapBtn.addEventListener("click", swapIndoorNavPoints);
    }
    if (elements.navStartSelect) {
      elements.navStartSelect.addEventListener("change", recalculateIndoorRoute);
    }
    if (elements.navDestSelect) {
      elements.navDestSelect.addEventListener("change", recalculateIndoorRoute);
    }
  }

  // ── Floor Selection Modal ───────────────────────────────────
  function openFloorModal(buildingId = "main-block") {
    currentBuildingId = buildingId;
    const bData = INDOOR_CONFIG.buildings[buildingId] || INDOOR_CONFIG.buildings["main-block"];

    if (elements.modalBuildingTitle) {
      elements.modalBuildingTitle.textContent = bData.name || "Main Block";
    }

    // Show modal
    if (elements.floorModal) {
      elements.floorModal.classList.add("visible");
    }
  }

  function closeFloorModal() {
    if (elements.floorModal) {
      elements.floorModal.classList.remove("visible");
    }
  }

  // ── Open Indoor Map Viewer ──────────────────────────────────
  function openIndoorViewer(buildingId = "main-block", floorId = "first") {
    closeFloorModal();
    currentBuildingId = buildingId;
    currentFloorId = floorId;

    const bData = INDOOR_CONFIG.buildings[buildingId] || INDOOR_CONFIG.buildings["main-block"];

    if (elements.viewerBuildingTitle) {
      elements.viewerBuildingTitle.textContent = bData.name || "Main Block";
    }

    // Open viewer screen
    if (elements.viewer) {
      elements.viewer.classList.add("visible");
    }

    // Load active floor
    loadFloor(floorId);
    populateIndoorNavSelects();
  }

  function closeIndoorViewer() {
    if (elements.viewer) {
      elements.viewer.classList.remove("visible");
    }
    closeRoomPanel();
    closeIndoorNavPanel();
  }

  // ── Switch Floor Instantly ──────────────────────────────────
  function switchFloor(floorId) {
    if (currentFloorId === floorId && elements.floorImg && elements.floorImg.src) {
      return;
    }
    currentFloorId = floorId;
    loadFloor(floorId);
  }

  function loadFloor(floorId) {
    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const floorInfo = bData.floors.find((f) => f.id === floorId) || bData.floors[0];

    // Update floor switcher highlight
    if (elements.btnFloorFirst && elements.btnFloorSecond) {
      elements.btnFloorFirst.classList.toggle("active", floorId === "first");
      elements.btnFloorSecond.classList.toggle("active", floorId === "second");
    }

    // Update image
    const imagePath = floorInfo.image;
    if (elements.floorImg) {
      elements.floorImg.style.display = "none";
      if (elements.imgFallback) elements.imgFallback.style.display = "flex";

      elements.floorImg.src = imagePath;
      elements.floorImg.alt = `${bData.name} - ${floorInfo.name}`;
    }

    // Reset view & render room markers
    resetView();
    renderRooms(floorId);
    renderActiveRoute(floorId);

    if (typeof showToast === "function") {
      showToast(`Showing ${floorInfo.name}`);
    }
  }

  function onImageLoaded() {
    if (elements.floorImg) elements.floorImg.style.display = "block";
    if (elements.imgFallback) elements.imgFallback.style.display = "none";
    syncLayersDimensions();
    resetView();
  }

  function onImageError() {
    if (elements.floorImg) elements.floorImg.style.display = "none";
    if (elements.imgFallback) {
      elements.imgFallback.style.display = "flex";
      elements.imgFallback.innerHTML = `
        <div class="indoor-fallback-content">
          <div class="fallback-icon">📐</div>
          <h3>${currentFloorId === "first" ? "First Floor" : "Second Floor"} Plan</h3>
          <p class="fallback-path"><code>${elements.floorImg ? elements.floorImg.getAttribute("src") : ""}</code></p>
          <div class="fallback-note">Add the floor-plan image under <strong>assets/floor-plans/main-block/</strong> and update its path in <strong>config.js</strong>.</div>
        </div>
      `;
    }
    syncLayersDimensions();
  }

  function syncLayersDimensions() {
    if (!elements.floorImg || !elements.markersContainer) return;
    const w = elements.floorImg.naturalWidth || elements.floorImg.clientWidth || 900;
    const h = elements.floorImg.naturalHeight || elements.floorImg.clientHeight || 600;

    elements.markersContainer.style.width = w + "px";
    elements.markersContainer.style.height = h + "px";

    if (elements.pathsSvg) {
      elements.pathsSvg.setAttribute("width", w);
      elements.pathsSvg.setAttribute("height", h);
      elements.pathsSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
  }

  // ── Pan and Zoom Engine ─────────────────────────────────────
  function applyTransform() {
    if (elements.panZoomContainer) {
      elements.panZoomContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }
  }

  function resetView() {
    if (!elements.viewport) return;
    const vpW = elements.viewport.clientWidth;
    const vpH = elements.viewport.clientHeight;

    const imgW = (elements.floorImg && elements.floorImg.naturalWidth) || 900;
    const imgH = (elements.floorImg && elements.floorImg.naturalHeight) || 600;

    // Fit with 40px margin
    const scaleX = (vpW - 80) / imgW;
    const scaleY = (vpH - 80) / imgH;
    scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    panX = (vpW - imgW * scale) / 2;
    panY = (vpH - imgH * scale) / 2;

    applyTransform();
  }

  function zoomStep(factor) {
    const newScale = Math.min(Math.max(scale * factor, 0.35), 4.5);
    if (!elements.viewport) return;

    const vpW = elements.viewport.clientWidth;
    const vpH = elements.viewport.clientHeight;

    // Zoom towards center of viewport
    const cx = vpW / 2;
    const cy = vpH / 2;

    panX = cx - (cx - panX) * (newScale / scale);
    panY = cy - (cy - panY) * (newScale / scale);
    scale = newScale;

    applyTransform();
  }

  function onMouseDown(e) {
    if (e.button !== 0) return; // Primary button only
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    if (elements.viewport) elements.viewport.style.cursor = "grabbing";
  }

  function onMouseMove(e) {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  }

  function onMouseUp() {
    isPanning = false;
    if (elements.viewport) elements.viewport.style.cursor = "grab";
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = elements.viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(scale * factor, 0.35), 4.5);

    panX = mouseX - (mouseX - panX) * (newScale / scale);
    panY = mouseY - (mouseY - panY) * (newScale / scale);
    scale = newScale;

    applyTransform();
  }

  // Touch Events (Single finger pan, pinch zoom)
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartScale = scale;
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 1 && isPanning) {
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      applyTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartDist > 0) {
        const factor = currentDist / touchStartDist;
        scale = Math.min(Math.max(touchStartScale * factor, 0.35), 4.5);
        applyTransform();
      }
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) isPanning = false;
  }

  // Developer Calibration Logger: click on the floor plan to get relative coordinates
  function onViewportClick(e) {
    if (isPanning) return;
    const rect = elements.panZoomContainer.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }
    const xPct = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
    const yPct = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);
    console.log(
      `[Indoor Calibration] floor: "${currentFloorId}", x: ${xPct.toFixed(1)}, y: ${yPct.toFixed(1)}`
    );
  }

  // ── Room Markers Rendering ──────────────────────────────────
  function renderRooms(floorId) {
    if (!elements.markersContainer) return;
    elements.markersContainer.innerHTML = "";

    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const rooms = (bData.rooms || []).filter((r) => r.floor === floorId);

    rooms.forEach((room) => {
      const pin = document.createElement("div");
      pin.className = "indoor-marker" + (activeRoomId === room.id ? " active" : "");
      pin.dataset.roomId = room.id;
      pin.style.left = `${room.x}%`;
      pin.style.top = `${room.y}%`;

      const typeIcon = getRoomIcon(room.type);
      pin.innerHTML = `
        <div class="indoor-marker-pin">
          <span class="marker-icon">${typeIcon}</span>
        </div>
        <div class="indoor-marker-label">${room.name}</div>
      `;

      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        selectRoom(room.id);
      });

      elements.markersContainer.appendChild(pin);
    });
  }

  function getRoomIcon(type) {
    switch (type) {
      case "classroom":
        return "📚";
      case "lab":
        return "🔬";
      case "office":
      case "faculty":
        return "💼";
      case "stairs":
        return "🪜";
      case "lift":
        return "🛗";
      case "canteen":
        return "☕";
      case "facility":
        return "🚻";
      default:
        return "📍";
    }
  }

  // ── Select Room & Info Panel ────────────────────────────────
  function selectRoom(roomId) {
    activeRoomId = roomId;
    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const room = (bData.rooms || []).find((r) => r.id === roomId);
    if (!room) return;

    // Switch floor if room is on a different floor
    if (room.floor !== currentFloorId) {
      switchFloor(room.floor);
    }

    // Highlight marker
    document.querySelectorAll(".indoor-marker").forEach((m) => {
      m.classList.toggle("active", m.dataset.roomId === roomId);
    });

    // Populate and show info panel
    if (elements.roomTitle) elements.roomTitle.textContent = room.name;
    if (elements.roomBadge) {
      elements.roomBadge.textContent = room.type || "Room";
      elements.roomBadge.className = `indoor-badge badge-${room.type || "default"}`;
    }
    if (elements.roomFloorText) {
      elements.roomFloorText.textContent = room.floor === "first" ? "First Floor" : "Second Floor";
    }
    if (elements.roomNumberText) {
      elements.roomNumberText.textContent = room.roomNumber || room.name;
    }
    if (elements.roomDesc) {
      elements.roomDesc.textContent = room.description || "Main Block indoor location.";
    }

    if (elements.roomPanel) {
      elements.roomPanel.classList.add("visible");
    }

    // Close nav panel if open
    closeIndoorNavPanel();
  }

  function closeRoomPanel() {
    if (elements.roomPanel) {
      elements.roomPanel.classList.remove("visible");
    }
    document.querySelectorAll(".indoor-marker.active").forEach((m) => m.classList.remove("active"));
    activeRoomId = null;
  }

  // ── Indoor Search Architecture ──────────────────────────────
  function onSearchInput() {
    if (!elements.searchInput || !elements.searchResults) return;
    const query = elements.searchInput.value.trim().toLowerCase();

    if (elements.searchClear) {
      elements.searchClear.style.display = query.length > 0 ? "flex" : "none";
    }

    if (!query) {
      elements.searchResults.classList.remove("visible");
      return;
    }

    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const allRooms = bData.rooms || [];

    const matches = allRooms.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const num = (r.roomNumber || "").toLowerCase();
      const type = (r.type || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      return name.includes(query) || num.includes(query) || type.includes(query) || desc.includes(query);
    });

    elements.searchResults.innerHTML = "";

    if (matches.length === 0) {
      elements.searchResults.innerHTML = `
        <div class="indoor-search-empty">
          <span>No rooms found matching "${query}"</span>
        </div>`;
    } else {
      matches.forEach((room) => {
        const item = document.createElement("div");
        item.className = "indoor-search-item";
        item.innerHTML = `
          <div class="item-icon">${getRoomIcon(room.type)}</div>
          <div class="item-info">
            <div class="item-name">${room.name}</div>
            <div class="item-meta">${room.floor === "first" ? "First Floor" : "Second Floor"} • ${room.type || "Room"}</div>
          </div>
        `;
        item.addEventListener("click", () => {
          elements.searchInput.value = room.name;
          elements.searchResults.classList.remove("visible");
          selectRoom(room.id);
        });
        elements.searchResults.appendChild(item);
      });
    }

    elements.searchResults.classList.add("visible");
  }

  // ── Indoor Navigation Architecture & Multi-Floor Routing ────
  function populateIndoorNavSelects() {
    if (!elements.navStartSelect || !elements.navDestSelect) return;
    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const rooms = bData.rooms || [];

    elements.navStartSelect.innerHTML = "";
    elements.navDestSelect.innerHTML = "";

    rooms.forEach((r) => {
      const optA = document.createElement("option");
      optA.value = r.id;
      optA.textContent = `${r.name} (${r.floor === "first" ? "1F" : "2F"})`;
      elements.navStartSelect.appendChild(optA);

      const optB = document.createElement("option");
      optB.value = r.id;
      optB.textContent = `${r.name} (${r.floor === "first" ? "1F" : "2F"})`;
      elements.navDestSelect.appendChild(optB);
    });
  }

  function startIndoorNavigation(destRoomId, startRoomId = null) {
    closeRoomPanel();
    populateIndoorNavSelects();

    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const rooms = bData.rooms || [];

    if (rooms.length === 0) {
      if (typeof showToast === "function") {
        showToast("Room coordinates will appear here once added in config.js");
      }
      return;
    }

    if (elements.navDestSelect) elements.navDestSelect.value = destRoomId;
    if (elements.navStartSelect) {
      if (startRoomId) {
        elements.navStartSelect.value = startRoomId;
      } else if (rooms[0] && rooms[0].id !== destRoomId) {
        elements.navStartSelect.value = rooms[0].id;
      }
    }

    if (elements.navPanel) elements.navPanel.classList.add("visible");
    recalculateIndoorRoute();
  }

  function closeIndoorNavPanel() {
    if (elements.navPanel) elements.navPanel.classList.remove("visible");
    clearIndoorRoute();
  }

  function clearIndoorRoute() {
    activeIndoorRoute = null;
    if (elements.pathsSvg) elements.pathsSvg.innerHTML = "";
    if (elements.navStepsList) elements.navStepsList.innerHTML = "";
  }

  function swapIndoorNavPoints() {
    if (!elements.navStartSelect || !elements.navDestSelect) return;
    const tmp = elements.navStartSelect.value;
    elements.navStartSelect.value = elements.navDestSelect.value;
    elements.navDestSelect.value = tmp;
    recalculateIndoorRoute();
  }

  function recalculateIndoorRoute() {
    if (!elements.navStartSelect || !elements.navDestSelect) return;
    const startId = elements.navStartSelect.value;
    const destId = elements.navDestSelect.value;

    if (!startId || !destId || startId === destId) {
      clearIndoorRoute();
      if (elements.navTimeText) elements.navTimeText.textContent = "0 min";
      if (elements.navDistText) elements.navDistText.textContent = "0 m";
      if (elements.navStepsList) {
        elements.navStepsList.innerHTML = `
          <div class="indoor-step-item">
            <div class="indoor-step-num">!</div>
            <div class="indoor-step-text">Choose a different destination room.</div>
          </div>`;
      }
      return;
    }

    const route = solveIndoorPath(startId, destId);
    if (!route) {
      if (elements.navStepsList) {
        elements.navStepsList.innerHTML = `
          <div class="indoor-step-item">
            <div class="indoor-step-num">!</div>
            <div class="indoor-step-text">Navigation network will connect these rooms once walkways are configured.</div>
          </div>`;
      }
      return;
    }

    activeIndoorRoute = route;
    renderActiveRoute(currentFloorId);
    renderRouteSteps(route);
  }

  // Core Dijkstra indoor pathfinder with Floor-to-Floor transition support
  function solveIndoorPath(startId, destId) {
    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const graph = bData.navigationGraph || { nodes: {}, edges: [] };
    const nodes = graph.nodes || {};
    const edges = graph.edges || [];

    if (Object.keys(nodes).length === 0 || edges.length === 0) {
      return null;
    }

    // Adjacency graph
    const adj = {};
    for (const k in nodes) adj[k] = [];
    edges.forEach((edge) => {
      const u = edge.from;
      const v = edge.to;
      const d = edge.distance || 5;
      if (adj[u] && adj[v]) {
        adj[u].push({ node: v, dist: d, type: edge.type });
        adj[v].push({ node: u, dist: d, type: edge.type });
      }
    });

    const dists = {};
    const prev = {};
    const unvisited = new Set(Object.keys(nodes));
    for (const k in nodes) dists[k] = Infinity;
    dists[startId] = 0;

    while (unvisited.size > 0) {
      let curr = null;
      for (const n of unvisited) {
        if (curr === null || dists[n] < dists[curr]) curr = n;
      }
      if (dists[curr] === Infinity || curr === destId) break;
      unvisited.delete(curr);

      for (const neighbor of adj[curr]) {
        if (!unvisited.has(neighbor.node)) continue;
        const alt = dists[curr] + neighbor.dist;
        if (alt < dists[neighbor.node]) {
          dists[neighbor.node] = alt;
          prev[neighbor.node] = curr;
        }
      }
    }

    if (dists[destId] === Infinity) return null;

    const pathNodes = [];
    let cur = destId;
    while (cur) {
      pathNodes.unshift(cur);
      cur = prev[cur];
    }

    return {
      nodes: pathNodes,
      totalDistance: dists[destId],
    };
  }

  function renderActiveRoute(floorId) {
    if (!elements.pathsSvg || !activeIndoorRoute) return;
    elements.pathsSvg.innerHTML = "";

    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const graph = bData.navigationGraph || { nodes: {} };
    const nodes = graph.nodes || {};

    const imgW = (elements.floorImg && elements.floorImg.naturalWidth) || 900;
    const imgH = (elements.floorImg && elements.floorImg.naturalHeight) || 600;

    // Filter path nodes for the current floor
    const floorPoints = [];
    activeIndoorRoute.nodes.forEach((nId) => {
      const node = nodes[nId];
      if (node && node.floor === floorId) {
        floorPoints.push({
          x: (node.x / 100) * imgW,
          y: (node.y / 100) * imgH,
        });
      }
    });

    if (floorPoints.length < 2) return;

    let dStr = `M ${floorPoints[0].x} ${floorPoints[0].y}`;
    for (let i = 1; i < floorPoints.length; i++) {
      dStr += ` L ${floorPoints[i].x} ${floorPoints[i].y}`;
    }

    // Glow line
    const glowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    glowPath.setAttribute("d", dStr);
    glowPath.setAttribute("stroke", "#00e5ff");
    glowPath.setAttribute("stroke-width", "8");
    glowPath.setAttribute("stroke-opacity", "0.35");
    glowPath.setAttribute("fill", "none");
    glowPath.setAttribute("stroke-linecap", "round");
    glowPath.setAttribute("stroke-linejoin", "round");

    // Core sharp animated path
    const corePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    corePath.setAttribute("d", dStr);
    corePath.setAttribute("stroke", "#00e5ff");
    corePath.setAttribute("stroke-width", "4");
    corePath.setAttribute("stroke-dasharray", "8,6");
    corePath.setAttribute("fill", "none");
    corePath.setAttribute("stroke-linecap", "round");
    corePath.setAttribute("stroke-linejoin", "round");

    elements.pathsSvg.appendChild(glowPath);
    elements.pathsSvg.appendChild(corePath);
  }

  function renderRouteSteps(route) {
    if (!elements.navStepsList) return;
    elements.navStepsList.innerHTML = "";

    const bData = INDOOR_CONFIG.buildings[currentBuildingId] || INDOOR_CONFIG.buildings["main-block"];
    const graph = bData.navigationGraph || { nodes: {} };
    const nodes = graph.nodes || {};

    let currentFloor = null;

    route.nodes.forEach((nId, idx) => {
      const node = nodes[nId];
      if (!node) return;

      const isStart = idx === 0;
      const isEnd = idx === route.nodes.length - 1;

      // Check for floor-to-floor transition (stairs / lift)
      if (node.floor !== currentFloor && currentFloor !== null) {
        const floorStep = document.createElement("div");
        floorStep.className = "indoor-step-item floor-transition";
        floorStep.innerHTML = `
          <div class="indoor-step-num">🪜</div>
          <div class="indoor-step-text">
            <strong>Change Floor:</strong> Proceed to ${node.floor === "first" ? "First Floor" : "Second Floor"}
            <button class="switch-floor-inline-btn" data-floor="${node.floor}">Switch to ${node.floor === "first" ? "First Floor" : "Second Floor"}</button>
          </div>
        `;
        floorStep.querySelector(".switch-floor-inline-btn").addEventListener("click", () => {
          switchFloor(node.floor);
        });
        elements.navStepsList.appendChild(floorStep);
      }
      currentFloor = node.floor;

      const step = document.createElement("div");
      step.className = "indoor-step-item" + (isStart ? " is-start" : "") + (isEnd ? " is-dest" : "");
      const symbol = isStart ? "A" : (isEnd ? "B" : (idx + 1));

      step.innerHTML = `
        <div class="indoor-step-num">${symbol}</div>
        <div class="indoor-step-text">
          <strong>${node.name}</strong> (${node.floor === "first" ? "1F" : "2F"})
        </div>
      `;

      elements.navStepsList.appendChild(step);
    });

    const mins = Math.max(1, Math.round(route.totalDistance / 40));
    if (elements.navTimeText) elements.navTimeText.textContent = `${mins} min walk`;
    if (elements.navDistText) elements.navDistText.textContent = `${Math.round(route.totalDistance)} meters`;
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    init,
    openFloorModal,
    closeFloorModal,
    openIndoorViewer,
    closeIndoorViewer,
    switchFloor,
    selectRoom,
    startIndoorNavigation,
  };
})();

// Explicitly attach IndoorSystem to window for inline HTML onclick handlers & external scripts
if (typeof window !== "undefined") {
  window.IndoorSystem = IndoorSystem;
}

// Auto-initialize when DOM is ready (or immediately if DOM is already parsed)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    IndoorSystem.init();
  });
} else {
  IndoorSystem.init();
}
