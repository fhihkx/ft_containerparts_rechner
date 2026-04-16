/**
 * FT-Containerparts Finanzierungsrechner – Zentrale Konfiguration
 * ================================================================
 * Alle fachlichen Werte, Firmenangaben und Textbausteine.
 *
 * PFLEGE: Diese Datei bei jeder fachlichen Änderung aktualisieren.
 * Faktoren, Firmenangaben und Texte können hier geändert werden,
 * ohne HTML, Styles oder Logik anzufassen.
 *
 * @version 1.1.0
 * @updated 2026-04-15
 */

'use strict';

const CONFIG = Object.freeze({

  // ── VERSIONIERUNG ───────────────────────────────────────────────────────────
  version:     '1.1.0',
  versionDate: '2026-04-15',

  // ── FIRMENANGABEN (Quelle: Impressum ft-containerparts.de) ─────────────────
  company: Object.freeze({
    name:    'FT-Containerparts GmbH & CO. KG',
    street:  'Böcklerallee 9 – 13',
    city:    '27721 Ritterhude',
    phone:   '(+49) 4292 / 81167 – 0',
    fax:     '(+49) 4292 / 81167 – 29',
    email:   'info@ft-containerparts.de',
    web:     'www.ft-containerparts.de',
    ceo:     'Frank Techau, Christoph Glienke',
    court:   'Handelsregister: HRA Walsrode 200570',
    vatId:   'USt-IdNr.: DE257268504',
  }),

  // ── FAKTOREN-TABELLE ────────────────────────────────────────────────────────
  //
  // Bedeutung des Faktors:
  //   Monatliche Rate (Netto) = Anschaffungspreis × (Faktor / 100)
  //   Beispiel: 50.000 € × (2,36 / 100) = 1.180,00 € / Monat
  //
  // Erlaubte Kombinationen:
  //   Restwert 15 %  →  36 oder 48 Monate
  //   Restwert 10 %  →  36, 48 oder 54 Monate
  //   Restwert  5 %  →  48, 54 oder 60 Monate
  //
  // Gesperrte Kombinationen (null = Faktor nicht hinterlegt):
  //   5 % / 36 Monate   →  nicht verfügbar
  //   10 % / 60 Monate  →  nicht verfügbar
  //   15 % / 54 Monate  →  nicht verfügbar
  //   15 % / 60 Monate  →  nicht verfügbar
  //
  // Quelle / Freigabe: Interne Konditionstabelle (Stand 2026-04)
  //
  factors: Object.freeze({
    '15': Object.freeze({ '36': 2.93, '48': 2.27, '54': null, '60': null }),
    '10': Object.freeze({ '36': 3.06, '48': 2.36, '54': 2.13, '60': null }),
    '5':  Object.freeze({ '36': null, '48': 2.45, '54': 2.22, '60': 2.02 }),
  }),

  // Verfügbare Laufzeiten (Monate) – Reihenfolge bestimmt die Darstellung
  durations: Object.freeze([36, 48, 54, 60]),

  // Verfügbare Restwerte (%) – Reihenfolge bestimmt die Darstellung
  residuals: Object.freeze([5, 10, 15]),

  // ── VALIDIERUNG ─────────────────────────────────────────────────────────────
  validation: Object.freeze({
    priceMin:  100,          // Mindestbetrag in €
    priceMax:  9_999_999,    // Maximalbetrag in €
    plzRegex:  /^\d{4,10}$/, // PLZ: 4–10 Ziffern (DE + internationale Kunden)
  }),

  // ── TEXTBAUSTEINE ───────────────────────────────────────────────────────────
  // Alle für das PDF und die UI verwendeten Texte.
  // Formulierungen hier ändern, NICHT im Code.
  texts: Object.freeze({
    pdfSubject:      'Unverbindliches Finanzierungsangebot',
    pdfGreeting:     (anrede, nachname) => {
      if (anrede === 'Frau') return `Sehr geehrte Frau ${nachname},`;
      if (anrede === 'Herr') return `Sehr geehrter Herr ${nachname},`;
      return 'Sehr geehrte Damen und Herren,';
    },
    pdfIntro:        'vielen Dank für Ihr Interesse. Anbei erhalten Sie unser unverbindliches Finanzierungsangebot:',
    pdfDisclaimer:   'Alle Preise verstehen sich netto, zzgl. der gesetzlichen Mehrwertsteuer. ' +
                     'Das Angebot ist unverbindlich und vorbehaltlich positiver Bonitätsprüfung durch unsere Finanzierungspartner.',
    pdfMietkaufNote: 'Hinweis Mietkauf: Die gesetzliche MwSt. ist vorab auf die Gesamtsumme ' +
                     'aller Raten an die Finanzierungsgesellschaft zu entrichten.',
    pdfClosing:      'Wir freuen uns auf Ihre Rückmeldung und stehen für Rückfragen jederzeit zur Verfügung.',
    pdfSignoff:      'Mit freundlichen Grüßen,',
    uiDisclaimer:    '*Alle Preise netto zzgl. gesetzl. MwSt. Unverbindlich, vorbehaltlich positiver Bonitätsprüfung.',
  }),

  // ── UX / RATE LIMITING ─────────────────────────────────────────────────────
  rateLimitMs:  3000,
  rateLimitKey: 'ft_cp_last_submit',
});
