/**
 * setup-sheets.gs — Data book initializer for the community pharmacy prototype (US-01).
 *
 * HOW TO RUN
 * ----------
 * 1. Open (or create) the target Google Spreadsheet in your browser.
 * 2. Menu: Extensions -> Apps Script.
 * 3. Paste this whole file into the editor and save the project.
 * 4. Select setupSpreadsheet() and press Run.
 * 5. Approve the authorization prompts when Google requests permissions.
 * 6. Open View -> Logs: the script prints the spreadsheet URL and the ID to copy
 *    into GOOGLE_SHEET_ID in .env (see getSpreadsheetId() below).
 *
 * WHAT IT DOES
 * ------------
 * - Creates the 5 schema sheets in order: catalogo, inventario, ordenes, despachos, bitacora.
 * - Writes header rows, freezes row 1 and bolds the headers.
 * - Adds dropdown validations for enum columns and #,##0 number format for CLP columns.
 * - Fills the stock_neto formulas in inventario (rows 2..500).
 * - Inserts 5 EXAMPLE catalog rows + 5 matching inventory rows, highlighted in yellow.
 *
 * WARNING: the EXAMPLE rows MUST be deleted before loading the official catalog.
 * They only exist to demonstrate the schema mechanics (see docs/google-sheets-schema.md).
 */

var SHEET_NAMES = ['catalogo', 'inventario', 'ordenes', 'despachos', 'bitacora'];

var HEADERS = {
  catalogo: ['medicamento_id', 'nombre_comercial', 'principio_activo', 'dosis', 'forma',
    'requiere_receta', 'precio_unitario_clp', 'bioequivalente_de', 'activo'],
  inventario: ['medicamento_id', 'stock_real', 'stock_reservado', 'stock_neto', 'ultima_actualizacion'],
  ordenes: ['codigo_far', 'fecha_creacion', 'rut', 'telefono', 'nombre_cliente', 'medicamento_id',
    'cantidad', 'precio_total_clp', 'estado', 'url_receta', 'fecha_receta', 'fecha_expiracion', 'notas'],
  despachos: ['codigo_far', 'sector', 'direccion', 'estado_ruta', 'eta_minutos', 'fecha_marcado'],
  bitacora: ['timestamp', 'accion', 'codigo_far', 'medicamento_id', 'delta_reservado', 'detalle']
};

// Dropdown definitions: column index (1-based) + allowed values.
var DROPDOWNS = {
  catalogo: [
    { column: 6, values: ['SI', 'NO'] }, // requiere_receta
    { column: 9, values: ['SI', 'NO'] } // activo
  ],
  ordenes: [
    { column: 9, values: ['PENDIENTE_RECETA', 'RECETA_RECIBIDA', 'EN_PREPARACION',
      'EN_RUTA', 'ENTREGADO', 'CANCELADO_EXPIRADO'] } // estado (RF-07)
  ],
  despachos: [
    { column: 2, values: ['Peñalolén Alto', 'Peñalolén Nuevo', 'San Luis', 'Otro'] }, // sector
    { column: 4, values: ['PENDIENTE', 'EN_RUTA', 'ENTREGADO'] } // estado_ruta
  ]
};

// CLP columns receiving the #,##0 number format (1-based column index).
var CLP_COLUMNS = {
  catalogo: [7], // precio_unitario_clp
  ordenes: [8] // precio_total_clp
};

var MAX_DATA_ROW = 500; // Rows 2..500 receive validations, formats and formulas.

// EXAMPLE rows (catalogo) — SYNTHETIC data, delete before production.
// Prices are illustrative CLP values for schema testing only.
// NOTE on the bioequivalente_de demo link: MED-0002 points to MED-0001 only to
// demonstrate the self-reference mechanics of the RF-02 fallback. In real data,
// bioequivalente_de must reference a product with the same principio_activo and dosis.
var EXAMPLE_CATALOG_ROWS = [
  ['MED-0001', 'Pregabalina', 'Pregabalina', '75 mg', 'Cápsula', 'SI', 1890, '', 'SI'],
  ['MED-0002', 'Losartán', 'Losartán', '50 mg', 'Comprimido', 'SI', 640, 'MED-0001', 'SI'],
  ['MED-0003', 'Metformina', 'Metformina', '850 mg', 'Comprimido', 'SI', 520, '', 'SI'],
  ['MED-0004', 'Sertralina', 'Sertralina', '50 mg', 'Comprimido', 'SI', 1150, '', 'SI'],
  ['MED-0005', 'Omeprazol', 'Omeprazol', '20 mg', 'Cápsula', 'NO', 780, '', 'SI']
];

// EXAMPLE rows (inventario) matching the catalog rows above.
// MED-0001 intentionally shows a zero net balance to exercise the RF-02
// "quiebre" flow (stock_neto = 0 -> suggest bioequivalents).
var EXAMPLE_INVENTORY_ROWS = [
  ['MED-0001', 40, 40, new Date()],
  ['MED-0002', 120, 12, new Date()],
  ['MED-0003', 300, 25, new Date()],
  ['MED-0004', 75, 8, new Date()],
  ['MED-0005', 150, 0, new Date()]
];

/**
 * Main entry point. Run this function (and only this one) from the Apps Script editor.
 */
function setupSpreadsheet() {
  var ss = getOrCreateSpreadsheet_();

  for (var i = 0; i < SHEET_NAMES.length; i++) {
    var name = SHEET_NAMES[i];
    var sheet = ensureSheet_(ss, name);
    writeHeaders_(sheet, HEADERS[name]);
    applyDropdowns_(name, sheet);
    applyClpFormats_(name, sheet);
  }

  writeStockNetFormulas_(ss.getSheetByName('inventario'));
  insertExampleRows_(ss);

  var url = ss.getUrl();
  Logger.log('SPREADSHEET_ID: ' + ss.getId());
  Logger.log('Spreadsheet URL: ' + url);
  Logger.log('Done. Remember to copy the ID above into GOOGLE_SHEET_ID in .env.');
}

/**
 * Returns the spreadsheet ID of the active book.
 *
 * The ID is the long token in the spreadsheet URL:
 *   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
 * Copy <SPREADSHEET_ID> into GOOGLE_SHEET_ID in .env.
 */
function getSpreadsheetId() {
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();
  Logger.log('SPREADSHEET_ID: ' + id);
  return id;
}

/**
 * Reuses the active spreadsheet when the script is bound to one;
 * otherwise creates a new book with the canonical title.
 */
function getOrCreateSpreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    Logger.log('Reusing the active spreadsheet: ' + active.getUrl());
    return active;
  }
  var created = SpreadsheetApp.create('Farmacia Peñalolén - Datos');
  Logger.log('Created a new spreadsheet: ' + created.getUrl());
  return created;
}

/**
 * Returns the named sheet, creating it at the end of the book when missing.
 */
function ensureSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Writes the header row, freezes it and applies bold font.
 */
function writeHeaders_(sheet, headers) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Adds dropdown validations (rows 2..MAX_DATA_ROW) for the enum columns.
 */
function applyDropdowns_(name, sheet) {
  var defs = DROPDOWNS[name] || [];
  for (var i = 0; i < defs.length; i++) {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(defs[i].values, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, defs[i].column, MAX_DATA_ROW - 1, 1).setDataValidation(rule);
  }
}

/**
 * Applies the #,##0 number format (rows 2..MAX_DATA_ROW) to the CLP columns.
 */
function applyClpFormats_(name, sheet) {
  var columns = CLP_COLUMNS[name] || [];
  for (var i = 0; i < columns.length; i++) {
    sheet.getRange(2, columns[i], MAX_DATA_ROW - 1, 1).setNumberFormat('#,##0');
  }
}

/**
 * Fills stock_neto with =B<row>-C<row> down column D (rows 2..MAX_DATA_ROW).
 * Human-readable only: n8n must recompute the value in its own expressions.
 */
function writeStockNetFormulas_(inventorySheet) {
  var formulas = [];
  for (var row = 2; row <= MAX_DATA_ROW; row++) {
    formulas.push(['=B' + row + '-C' + row]);
  }
  inventorySheet.getRange(2, 4, MAX_DATA_ROW - 1, 1).setFormulas(formulas);
}

/**
 * Inserts the highlighted EXAMPLE rows (catalogo + inventario).
 * Skipped when the sheets already contain data, so re-runs do not duplicate rows.
 */
function insertExampleRows_(ss) {
  var catalog = ss.getSheetByName('catalogo');
  var inventory = ss.getSheetByName('inventario');

  if (catalog.getLastRow() > 1 || inventory.getLastRow() > 1) {
    Logger.log('Example rows skipped: catalogo/inventario already contain data.');
    return;
  }

  catalog.getRange(2, 1, EXAMPLE_CATALOG_ROWS.length, HEADERS.catalogo.length)
    .setValues(EXAMPLE_CATALOG_ROWS)
    .setBackground('#FFF2CC');
  catalog.getRange(2, 1).setNote('EXAMPLE ROWS - delete them before loading the official catalog.');

  // inventory: stock_neto is a formula column, so only 4 values are written.
  inventory.getRange(2, 1, EXAMPLE_INVENTORY_ROWS.length, 4)
    .setValues(EXAMPLE_INVENTORY_ROWS)
    .setBackground('#FFF2CC');
  inventory.getRange(2, 1).setNote('EXAMPLE ROWS - delete them before loading the official catalog.');

  Logger.log('WARNING: 5 EXAMPLE rows were inserted into catalogo and inventario.');
  Logger.log('WARNING: delete these EXAMPLE rows before loading the official catalog.');
}
