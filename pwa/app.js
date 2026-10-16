/**
 * US-11 driver PWA: delivery list, one-tap state transitions, OSRM ETA.
 *
 * Loaded as an ES module in the browser (`<script type="module">`) and
 * required from Node by the unit tests (CommonJS export guard at the bottom
 * of the pure-functions section).
 */

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const CONFIG = {
  // Backend contract (not implemented yet — see README):
  //   GET    {apiBaseUrl}            -> Delivery[]
  //   PATCH  {apiBaseUrl}/{codigo}   -> updated Delivery  body: { estado_ruta }
  apiBaseUrl: "/api/despachos",
  // Depot origin (Peñalolén) used as the OSRM route destination.
  origin: { lat: -33.4868, lon: -70.5566 },
  // Public OSRM demo server. Replace with a self-hosted instance for production.
  osrmBase: "https://router.project-osrm.org",
};

// ---------------------------------------------------------------------------
// PURE FUNCTIONS (no DOM, no network — unit-tested in Node)
// ---------------------------------------------------------------------------

/**
 * Convert an OSRM route duration (seconds) to whole minutes.
 * Returns null when the input is unusable.
 */
function computeEtaMinutes(durationSeconds) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }
  return Math.max(1, Math.round(durationSeconds / 60));
}

/** Human-readable ETA label; never renders "NaN" or "undefined". */
function formatEta(minutes) {
  if (minutes === null || minutes === undefined) {
    return "ETA no disponible";
  }
  return "≈ " + minutes + " min";
}

/**
 * Valid one-tap state transition.
 * action "ruta": PENDIENTE -> EN_RUTA only.
 * action "entregado": PENDIENTE|EN_RUTA -> ENTREGADO.
 * Returns null for invalid combinations; callers must not send anything.
 */
function nextEstado(currentEstado, action) {
  if (action === "ruta") {
    return currentEstado === "PENDIENTE" ? "EN_RUTA" : null;
  }
  if (action === "entregado") {
    return currentEstado === "PENDIENTE" || currentEstado === "EN_RUTA" ? "ENTREGADO" : null;
  }
  return null;
}

/**
 * OSRM trip URL, longitude first: delivery coords BEFORE the origin,
 * joined with ";". Keeps https when config.osrmBase starts with https.
 */
function buildOsrmUrl(config, delivery) {
  const base = String(config.osrmBase).replace(/\/+$/, "");
  const deliveryPart = Number(delivery.lon) + "," + Number(delivery.lat);
  const originPart = Number(config.origin.lon) + "," + Number(config.origin.lat);
  return (
    base +
    "/route/v1/driving/" +
    deliveryPart +
    ";" +
    originPart +
    "?overview=false&alternatives=false"
  );
}

/** Fresh data wins only when the network is confirmed healthy. */
function pickDeliveries(networkOk, fresh, cached) {
  return networkOk === true ? fresh : cached;
}

// Node access for tests (browser module scripts have no `module`).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    computeEtaMinutes,
    formatEta,
    nextEstado,
    buildOsrmUrl,
    pickDeliveries,
  };
}

// ---------------------------------------------------------------------------
// DOM SECTION (browser only)
// ---------------------------------------------------------------------------
if (typeof document !== "undefined") {
  // Embedded fallback used while the n8n backend does not exist yet.
  const DEMO_DELIVERIES = [
    { codigo_far: "FAR-1001", cliente: "Rosa Meléndez", direccion: "Av. Padre Hurtado Sur 7450", sector: "Peñalolén", telefono: "+56 9 5555 1101", lat: -33.4839, lon: -70.5588, estado_ruta: "PENDIENTE" },
    { codigo_far: "FAR-1002", cliente: "Jorge Pino", direccion: "Las Torres 1140, Depto 42", sector: "Peñalolén", telefono: "+56 9 5555 1102", lat: -33.4912, lon: -70.5457, estado_ruta: "PENDIENTE" },
    { codigo_far: "FAR-1003", cliente: "Camila Reyes", direccion: "Ejército 2330", sector: "Villa La Palma", telefono: "+56 9 5555 1103", lat: -33.4996, lon: -70.5661, estado_ruta: "PENDIENTE" },
    { codigo_far: "FAR-1004", cliente: "Lucía Fernández", direccion: "Av. Grecia 8950", sector: "Peñalolén", telefono: "+56 9 5555 1104", lat: -33.4764, lon: -70.5437, estado_ruta: "PENDIENTE" },
  ];

  const STORAGE_KEY = "reparto.entregas.v1";

  const state = {
    deliveries: [],
    etas: {},          // codigo_far -> minutes | null
    demoMode: false,
    loading: false,
  };

  const els = {};

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setBanner(message, tone) {
    els.banner.textContent = message;
    els.banner.dataset.estado = tone || "info";
  }

  function loadCachedDeliveries() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function saveCachedDeliveries(deliveries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
    } catch (err) {
      // Storage unavailable (private mode, quota): non-fatal.
    }
  }

  /**
   * Fetch deliveries from the API, fall back to cache / demo data.
   * networkOk is only true when the backend answered with a real array.
   */
  async function loadDeliveries() {
    state.loading = true;
    setBanner("Cargando reparto…", "info");

    let fresh = null;
    let networkOk = false;
    let requestFailed = false;

    try {
      const res = await fetch(CONFIG.apiBaseUrl, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fresh = data;
          networkOk = true;
        }
      }
    } catch (err) {
      requestFailed = true;
    }

    const stored = loadCachedDeliveries();
    const cached = stored || DEMO_DELIVERIES;
    state.deliveries = pickDeliveries(networkOk, fresh, cached);
    state.demoMode = !networkOk;
    state.loading = false;

    if (networkOk) {
      saveCachedDeliveries(state.deliveries);
      setBanner("Conectado: lista actualizada desde el servidor.", "ok");
    } else if (requestFailed && !stored) {
      setBanner("Sin conexión y sin datos guardados: mostrando datos de demostración.", "warn");
    } else if (requestFailed) {
      setBanner("Sin conexión: mostrando la última lista guardada.", "warn");
    } else {
      setBanner("Modo demostración: el backend de despachos aún no está disponible.", "warn");
    }

    render();
  }

  /** Persist a state change; network failures are ignored in demo mode. */
  async function patchEstado(codigo, estadoRuta) {
    if (state.demoMode) {
      return true; // Backend does not exist yet — nothing to sync.
    }
    try {
      const res = await fetch(CONFIG.apiBaseUrl + "/" + encodeURIComponent(codigo), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_ruta: estadoRuta }),
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  /** Ask OSRM for the trip duration and store the formatted ETA minutes. */
  async function fetchEta(delivery) {
    let minutes = null;
    try {
      const url = buildOsrmUrl(CONFIG, delivery);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const duration = data && Array.isArray(data.routes) && data.routes[0]
          ? data.routes[0].duration
          : null;
        minutes = computeEtaMinutes(duration);
      }
    } catch (err) {
      minutes = null;
    }
    state.etas[delivery.codigo_far] = minutes;
    return minutes;
  }

  function findDelivery(codigo) {
    return state.deliveries.find((d) => d.codigo_far === codigo) || null;
  }

  /** One tap = one transition: optimistic UI, then PATCH, then ETA for EN_RUTA. */
  async function handleAction(codigo, action) {
    const delivery = findDelivery(codigo);
    if (!delivery) return;

    if (action === "eta") {
      await fetchEta(delivery);
      render();
      return;
    }

    const next = nextEstado(delivery.estado_ruta, action);
    if (next === null) {
      return; // Invalid transition: send nothing.
    }

    // Optimistic update.
    delivery.estado_ruta = next;
    render();

    const synced = await patchEstado(codigo, next);
    if (!synced) {
      setBanner("No se pudo sincronizar el cambio de " + codigo + ". Reintentará en la próxima carga.", "error");
    }

    if (next === "EN_RUTA") {
      await fetchEta(delivery);
      render();
    }
  }

  function cardTemplate(delivery) {
    const codigo = escapeHtml(delivery.codigo_far);
    const estado = escapeHtml(delivery.estado_ruta);
    const etas = state.etas;
    const hasEta = Object.prototype.hasOwnProperty.call(etas, delivery.codigo_far);
    const etaText = hasEta ? formatEta(etas[delivery.codigo_far]) : "";
    const rutaDisabled = delivery.estado_ruta !== "PENDIENTE";
    const entregadoDisabled = delivery.estado_ruta === "ENTREGADO";

    return (
      '<li class="tarjeta" data-codigo="' + codigo + '">' +
        '<div class="fila-superior">' +
          '<p class="codigo">' + codigo + "</p>" +
          '<span class="badge" data-estado="' + estado + '">' + estado + "</span>" +
        "</div>" +
        '<p class="cliente">' + escapeHtml(delivery.cliente) + "</p>" +
        '<p class="detalle">' + escapeHtml(delivery.direccion) + "</p>" +
        '<p class="detalle">' + escapeHtml(delivery.sector) + " · " + escapeHtml(delivery.telefono) + "</p>" +
        '<p class="eta" aria-live="polite">' + escapeHtml(etaText) + "</p>" +
        '<div class="acciones">' +
          '<button type="button" class="btn-ruta" data-accion="ruta"' + (rutaDisabled ? " disabled" : "") +
            ' aria-label="Marcar en ruta el pedido ' + codigo + '">Marcar en ruta</button>' +
          '<button type="button" class="btn-entregado" data-accion="entregado"' + (entregadoDisabled ? " disabled" : "") +
            ' aria-label="Marcar como entregado el pedido ' + codigo + '">Entregado</button>' +
          '<button type="button" class="btn-eta" data-accion="eta"' +
            ' aria-label="Ver el tiempo estimado de llegada del pedido ' + codigo + '">Ver ETA</button>' +
        "</div>" +
      "</li>"
    );
  }

  function render() {
    const list = els.list;
    list.innerHTML = state.deliveries.map(cardTemplate).join("");
    els.empty.hidden = state.deliveries.length !== 0;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(function () {
      // Offline shell unavailable (e.g. insecure context): app still works online.
    });
  }

  function init() {
    els.banner = document.getElementById("banner");
    els.list = document.getElementById("lista-entregas");
    els.empty = document.getElementById("vacio");

    els.list.addEventListener("click", function (event) {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const button = target.closest("button[data-accion]");
      if (!button) return;
      const card = button.closest("[data-codigo]");
      if (!card) return;
      handleAction(card.dataset.codigo, button.dataset.accion);
    });

    registerServiceWorker();
    loadDeliveries();
  }

  init();
}
