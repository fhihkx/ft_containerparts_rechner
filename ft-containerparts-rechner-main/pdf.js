/**
 * FT-Containerparts Finanzierungsrechner – PDF-Generierung
 * =========================================================
 * Erzeugt ein strukturiertes Angebotsdokument als PDF-Download.
 * Verwendet jsPDF (CDN, Integrity-Hash in index.html).
 *
 * Dokumentstruktur:
 *   1. Briefkopf (Logo + Firmendaten Absender)
 *   2. Empfängeradresse
 *   3. Datum, Angebotsnummer, Vorgangsreferenz
 *   4. Betreff
 *   5. Anrede + Intro
 *   6. Angebotsdatentabelle
 *   7. Konditionen-/Hinweistext
 *   8. Grußformel + Bearbeiter
 *   9. Fußzeile (Firmendaten, Registernummer, Version)
 *
 * @requires CONFIG (config.js), jsPDF (window.jspdf)
 */

'use strict';

const PDFService = (() => {

  // Zeilenbrecher für jsPDF
  const LH = 6.5;

  // ── HAUPTFUNKTION ───────────────────────────────────────────────────────────
  /**
   * @param {Object} offer     Angebotsfelder (aus UIController.collectOffer)
   * @param {string} logoSrc   Pfad zum Logo (assets/logo.png)
   * @returns {Promise<void>}  Löst auf, wenn PDF heruntergeladen wurde
   */
  async function generate(offer, logoSrc) {
    if (!window.jspdf) throw new Error('jsPDF nicht geladen.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const c = CONFIG.company;
    const t = CONFIG.texts;
    const W = 210, M = 20, RX = 190; // Seitenbreite, Margin links, rechte Kante

    // ── 1. LOGO ────────────────────────────────────────────────────────────
    try {
      const logoData = await loadImage(logoSrc);
      const lW = 52, lH = (logoData.h / logoData.w) * lW;
      doc.addImage(logoData.data, 'PNG', M, 15, lW, lH);
    } catch {
      // Logo nicht gefunden – Fallback: Firmenname als Text
      doc.setFont('helvetica', 'bold').setFontSize(13);
      doc.text(c.name, M, 22);
    }

    // ── 2. ABSENDER-BLOCK (oben rechts) ────────────────────────────────────
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(100);
    doc.text([c.name, c.street, c.city, c.phone, c.email], RX, 16, { align: 'right' });

    // ── 3. TRENNLINIE ───────────────────────────────────────────────────────
    doc.setDrawColor(220, 175, 0).setLineWidth(0.6);
    doc.line(M, 38, RX, 38);

    // ── 4. EMPFÄNGER ────────────────────────────────────────────────────────
    doc.setTextColor(30).setFontSize(9.5).setFont('helvetica', 'normal');
    doc.text([
      offer.firma,
      `${offer.anrede} ${offer.vorname} ${offer.nachname}`,
      offer.strasse,
      `${offer.plz} ${offer.ort}`,
    ], M, 46);

    // ── 5. DATUM + ANGEBOTS-NR ──────────────────────────────────────────────
    doc.setFontSize(9).setTextColor(80);
    doc.text(`Datum: ${offer.datum}`, RX, 46, { align: 'right' });
    doc.text(`Angebots-Nr.: ${offer.angebotsNr}`, RX, 52, { align: 'right' });
    if (offer.vorgangsId) {
      doc.text(`Vorgang: ${offer.vorgangsId}`, RX, 58, { align: 'right' });
    }

    // ── 6. BETREFF ──────────────────────────────────────────────────────────
    let y = 72;
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(20);
    doc.text(`${t.pdfSubject} – ${offer.art}`, M, y);
    y += 5;

    if (offer.objekt) {
      doc.setFontSize(9.5).setFont('helvetica', 'normal').setTextColor(60);
      doc.text(`Objekt / Produkt: ${offer.objekt}`, M, y);
      y += 5;
    }

    doc.setDrawColor(220, 175, 0).setLineWidth(0.4).line(M, y, RX, y);
    y += 8;

    // ── 7. ANREDE + INTRO ───────────────────────────────────────────────────
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(30);
    doc.text(t.pdfGreeting(offer.anrede, offer.nachname), M, y);
    y += LH + 2;
    doc.text(t.pdfIntro, M, y);
    y += LH + 6;

    // ── 8. ANGEBOTSDATEN-TABELLE ────────────────────────────────────────────
    const rows = [
      ['Anschaffungspreis (Netto)', offer.preis, '€'],
      ['Laufzeit',                  offer.laufzeit, 'Monate'],
      ['Mietsonderzahlung',         '0,00', '€'],
      ['Monatliche Rate (Netto)',   offer.rate, '€'],
      ['Leasingfaktor',            offer.faktor, '%'],
      ['Kalk. Restwert',           offer.restwert, '€'],
    ];

    const COL = { label: M + 6, val: 130, unit: 145 };
    doc.setFillColor(250, 248, 235);
    rows.forEach((row, i) => {
      if (i % 2 === 0) doc.rect(M, y - 4.5, RX - M, LH + 1, 'F');
      doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(50);
      doc.text(row[0], COL.label, y);
      doc.setFont('helvetica', 'bold').setTextColor(20);
      doc.text(row[1], COL.val, y, { align: 'right' });
      doc.setFont('helvetica', 'normal').setTextColor(50);
      doc.text(row[2], COL.unit, y);
      y += LH + 1;
    });
    y += 6;

    // ── 9. MIETKAUF-HINWEIS ─────────────────────────────────────────────────
    if (offer.art === 'Mietkauf') {
      doc.setFontSize(9).setFont('helvetica', 'bolditalic').setTextColor(100);
      const note = doc.splitTextToSize(t.pdfMietkaufNote, RX - M);
      doc.text(note, M, y);
      y += note.length * LH + 4;
    }

    // ── 10. DISCLAIMER ──────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(110);
    const disc = doc.splitTextToSize(t.pdfDisclaimer, RX - M);
    doc.text(disc, M, y);
    y += disc.length * LH + 8;

    // ── 11. SCHLUSS ─────────────────────────────────────────────────────────
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(30);
    doc.text(t.pdfClosing, M, y);  y += LH + 6;
    doc.text(t.pdfSignoff, M, y);  y += LH + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(c.name, M, y);        y += LH;
    if (offer.bearbeiter) {
      doc.setFont('helvetica', 'normal').setFontSize(9);
      doc.text(`Bearbeiter: ${offer.bearbeiter}`, M, y);
    }

    // ── 12. FUSSZEILE ───────────────────────────────────────────────────────
    doc.setDrawColor(220, 175, 0).setLineWidth(0.5).line(M, 272, RX, 272);
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(140);

    const col1 = [c.name, c.street, c.city];
    const col2 = [`Tel.: ${c.phone}`, `Fax: ${c.fax}`, `E-Mail: ${c.email}`];
    const col3 = [c.web, c.court, c.vatId];
    const col4 = [`Erstellt: ${offer.datum}`, `Version: ${CONFIG.version}`, `Angebots-Nr.: ${offer.angebotsNr}`];

    doc.text(col1, M,       275);
    doc.text(col2, M + 50,  275);
    doc.text(col3, M + 100, 275);
    doc.text(col4, RX,      275, { align: 'right' });

    // ── SPEICHERN ───────────────────────────────────────────────────────────
    const fname = `FT_Angebot_${offer.art}_${sanitizeFilename(offer.firma)}_${offer.angebotsNr}.pdf`;
    doc.save(fname);
  }

  // ── HILFSFUNKTIONEN ─────────────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = Object.assign(document.createElement('canvas'),
          { width: img.naturalWidth, height: img.naturalHeight });
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => reject(new Error(`Logo konnte nicht geladen werden: ${src}`));
      img.src = src;
    });
  }

  function sanitizeFilename(s) {
    return String(s || 'Kunde').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').substring(0, 30);
  }

  return Object.freeze({ generate });

})();
