/**
 * FT-Containerparts Finanzierungsrechner – Berechnungs- und Validierungslogik
 * ============================================================================
 * Reine Fachlogik. Keinerlei DOM- oder UI-Abhängigkeiten.
 * Alle Werte kommen aus CONFIG (config.js).
 *
 * @requires CONFIG (config.js muss vorher geladen sein)
 */

'use strict';

const Calculator = (() => {

  // ── FAKTOR-LOOKUP ───────────────────────────────────────────────────────────
  /** Gibt den Leasingfaktor für eine Restwert/Laufzeit-Kombination zurück.
   *  @param {number|string} residual  Restwert in %
   *  @param {number|string} duration  Laufzeit in Monaten
   *  @returns {number|null}           Faktor oder null wenn nicht verfügbar
   */
  function getFactor(residual, duration) {
    const entry = (CONFIG.factors[String(residual)] || {})[String(duration)];
    return (entry === undefined || entry === null) ? null : entry;
  }

  // ── MONATSRATE ──────────────────────────────────────────────────────────────
  /** Berechnet die monatliche Netto-Leasingrate.
   *  @returns {number|null}  Rate in € oder null bei ungültigen Eingaben
   */
  function calcRate(price, residual, duration) {
    const f = getFactor(residual, duration);
    if (f === null) return null;
    const p = typeof price === 'string' ? parseDE(price) : price;
    if (!isFinite(p) || p <= 0) return null;
    return p * (f / 100);
  }

  // ── VERFÜGBARE RESTWERTE nach gewählter Laufzeit ────────────────────────────
  /**
   * Liefert die Restwert-Optionen, die zur gewählten Laufzeit verfügbar sind.
   * Logik: Laufzeit wählen → Restwert-Auswahl einschränken.
   * @param {number|string|null} duration  Gewählte Laufzeit oder null
   * @returns {number[]}                   Verfügbare Restwerte
   */
  function availableResiduals(duration) {
    if (!duration) return [...CONFIG.residuals];
    return CONFIG.residuals.filter(r => getFactor(r, duration) !== null);
  }

  // ── VALIDIERUNG: PREIS ──────────────────────────────────────────────────────
  /** @returns {string|null}  Fehlermeldung oder null */
  function validatePrice(value) {
    const n = parseDE(value);
    if (isNaN(n) || n <= 0)
      return `Bitte einen gültigen Anschaffungspreis eingeben (mind. ${formatDE(CONFIG.validation.priceMin)} €).`;
    if (n < CONFIG.validation.priceMin)
      return `Mindestbetrag: ${formatDE(CONFIG.validation.priceMin)} €.`;
    if (n > CONFIG.validation.priceMax)
      return `Bitte einen realistischen Betrag eingeben (max. ${formatDE(CONFIG.validation.priceMax)} €).`;
    return null;
  }

  // ── VALIDIERUNG: STEP 1 (Rechner-Eingaben) ──────────────────────────────────
  /** @returns {string[]}  Fehlermeldungen, leer = alles ok */
  function validateStep1(price, duration, residual) {
    const errors = [];
    const pe = validatePrice(price);
    if (pe) errors.push(pe);
    if (!duration) errors.push('Bitte eine Laufzeit wählen.');
    if (!residual) errors.push('Bitte einen Restwert wählen.');
    if (duration && residual && getFactor(residual, duration) === null)
      errors.push(`Die Kombination ${duration} Monate / ${residual} % Restwert ist nicht verfügbar.`);
    return errors;
  }

  // ── VALIDIERUNG: STEP 2 (Kontaktdaten) ─────────────────────────────────────
  /** @returns {string[]}  Fehlermeldungen, leer = alles ok */
  function validateContact(data) {
    const errors = [];
    const req = (val, label) => { if (!String(val || '').trim()) errors.push(`${label} ist ein Pflichtfeld.`); };
    req(data.art,      'Finanzierungsart');
    req(data.anrede,   'Anrede');
    req(data.vorname,  'Vorname');
    req(data.nachname, 'Nachname');
    req(data.firma,    'Firmenname');
    req(data.objekt,   'Objekt / Produktbezeichnung');
    req(data.strasse,  'Straße');
    req(data.plz,      'PLZ');
    req(data.ort,      'Ort');
    if (data.plz?.trim() && !/^\d{4,10}$/.test(data.plz.trim()))
      errors.push('PLZ: Bitte nur Ziffern eingeben (4–10 Stellen).');
    return errors;
  }

  // ── HILFSFUNKTIONEN ─────────────────────────────────────────────────────────
  /** Deutschen Dezimalstring → number  (z. B. "1.234,56" → 1234.56) */
  function parseDE(s) {
    const n = Number(String(s || '').trim().replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  /** number → deutsche Dezimaldarstellung mit n Nachkommastellen */
  function formatDE(n, decimals = 2) {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  /** Einfache XSS-Sanitierung für PDF-Ausgaben */
  function sanitize(s) {
    return String(s || '').replace(/[&<>"'/]/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '/': '&#x2F;',
    })[m]).trim();
  }

  // Öffentliche API
  return Object.freeze({
    getFactor, calcRate, availableResiduals,
    validatePrice, validateStep1, validateContact,
    parseDE, formatDE, sanitize,
  });

})();
