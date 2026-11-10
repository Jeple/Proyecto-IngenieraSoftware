/**
 * Unit tests for the pure functions of pwa/app.js (US-11 / RF-08).
 * Node >= 18, zero dependencies. Run: node pwa/test/pwa.test.mjs
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "app.js");

// Load app.js: prefer require; fall back to evaluating the CJS-style source
// when the nearest package.json declares "type": "module".
function loadApp() {
  const require = createRequire(import.meta.url);
  try {
    const api = require(appPath);
    if (api && typeof api.computeEtaMinutes === "function") return api;
  } catch (err) {
    // fall through to source evaluation
  }
  const source = readFileSync(appPath, "utf8");
  const mod = { exports: {} };
  new Function("module", "exports", source)(mod, mod.exports);
  return mod.exports;
}

const app = loadApp();
const { CONFIG, computeEtaMinutes, formatEta, nextEstado, buildOsrmUrl, pickDeliveries } = app;

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log("PASS  " + name);
  } else {
    failed += 1;
    console.log("FAIL  " + name + " | expected " + JSON.stringify(expected) + " | got " + JSON.stringify(actual));
  }
}

function checkTrue(name, condition) {
  check(name, Boolean(condition), true);
}

// 1. computeEtaMinutes
check("computeEtaMinutes(1140) === 19", computeEtaMinutes(1140), 19);
check("computeEtaMinutes(0) === null", computeEtaMinutes(0), null);
check("computeEtaMinutes(undefined) === null", computeEtaMinutes(undefined), null);
check('computeEtaMinutes("abc") === null', computeEtaMinutes("abc"), null);

// 2. formatEta
check('formatEta(null) === "ETA no disponible"', formatEta(null), "ETA no disponible");
check('formatEta(19) === "≈ 19 min"', formatEta(19), "≈ 19 min");

// 3. nextEstado
check('nextEstado("PENDIENTE","ruta") === "EN_RUTA"', nextEstado("PENDIENTE", "ruta"), "EN_RUTA");
check('nextEstado("PENDIENTE","entregado") === "ENTREGADO"', nextEstado("PENDIENTE", "entregado"), "ENTREGADO");
check('nextEstado("ENTREGADO","ruta") === null', nextEstado("ENTREGADO", "ruta"), null);
check('nextEstado("EN_RUTA","ruta") === null', nextEstado("EN_RUTA", "ruta"), null);
check('nextEstado("PENDIENTE","desconocida") === null', nextEstado("PENDIENTE", "desconocida"), null);

// 4. buildOsrmUrl
const testDelivery = { lat: -33.49, lon: -70.56 };
const osrmUrl = buildOsrmUrl(CONFIG, testDelivery);
checkTrue("buildOsrmUrl contains /route/v1/driving/", osrmUrl.includes("/route/v1/driving/"));
const coordsPart = osrmUrl.split("/route/v1/driving/")[1].split("?")[0];
const segments = coordsPart.split(";");
check("buildOsrmUrl delivery coords first", segments[0], testDelivery.lon + "," + testDelivery.lat);
check("buildOsrmUrl origin second after ';'", segments[1], CONFIG.origin.lon + "," + CONFIG.origin.lat);
checkTrue("buildOsrmUrl uses https base", osrmUrl.startsWith("https://"));

// 5. pickDeliveries
check("pickDeliveries(true,[1],[2]) === [1]", pickDeliveries(true, [1], [2]), [1]);
check("pickDeliveries(false,[1],[2]) === [2]", pickDeliveries(false, [1], [2]), [2]);

// 6. Rendering-free sanity: assert by exported names only (no DOM emulation).
const pureNames = ["computeEtaMinutes", "formatEta", "nextEstado", "buildOsrmUrl", "pickDeliveries"];
checkTrue(
  "pure section exports only named functions (" + pureNames.join(", ") + ")",
  pureNames.every((name) => typeof app[name] === "function")
);

// Summary
const total = passed + failed;
console.log("----");
console.log("Summary: " + passed + "/" + total + " passed, " + failed + " failed.");
if (failed > 0) {
  process.exit(1);
}
process.exit(0);
