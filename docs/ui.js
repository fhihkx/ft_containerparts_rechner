/**
 * FT-Containerparts Finanzierungsrechner – UI-Controller v2
 * ==========================================================
 * DOM-IDs passen zum neuen Bejola-inspirierten index.html.
 * Keine Berechnungs- oder Geschäftslogik – nur UI-Steuerung.
 *
 * @requires CONFIG, Calculator, PDFService
 */

'use strict';

const UI = (() => {

  let _lastRate = null;

  const $ = id => document.getElementById(id);

  // ── INITIALISIERUNG ──────────────────────────────────────────────────────────
  function init() {
    _checkBrowserSupport();
  }

  function _checkBrowserSupport() {
    if (!window.Intl || !window.Promise) {
      console.warn('[FT Rechner] Eingeschränkte Browser-Unterstützung erkannt.');
    }
  }

  // ── PREIS-EINGABE ────────────────────────────────────────────────────────────
  function onPriceInput(input) {
    let v = input.value.replace(/\./g, '').replace(/[^\d,]/g, '');
    const parts = v.split(',');
    const intPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = parts.length > 1 ? intPart + ',' + parts[1].substring(0, 2) : intPart;
    input.classList.remove('border-red-400');
  }

  function onPriceBlur(input) {
    const n = Calculator.parseDE(input.value);
    if (isFinite(n) && n > 0) input.value = Calculator.formatDE(n);
  }

  // ── LAUFZEIT → Restwert-Optionen einschränken ───────────────────────────────
  function onDurationChange() {
    const dur = $('dur').value;
    const resSelect = $('res');
    const currentRes = resSelect.value;
    const available = Calculator.availableResiduals(dur);

    Array.from(resSelect.options).forEach(opt => {
      if (!opt.value) return;
      const ok = available.includes(Number(opt.value));
      opt.disabled = !ok;
      opt.hidden   = !ok;
    });

    if (currentRes && !available.includes(Number(currentRes))) {
      resSelect.value = '';
    }
  }

  function onResidualChange() { /* Zustandsänderung wird bei calculate() verarbeitet */ }

  // ── BERECHNUNG ───────────────────────────────────────────────────────────────
  function calculate() {
    const price    = $('price').value;
    const duration = $('dur').value;
    const residual = $('res').value;

    const errors = Calculator.validateStep1(price, duration, residual);
    if (errors.length) {
      _showErr1(errors);
      return;
    }
    _hideErr1();

    const rate = Calculator.calcRate(Calculator.parseDE(price), residual, duration);
    if (rate === null) {
      _showErr1(['Berechnung fehlgeschlagen. Bitte Eingaben prüfen.']);
      return;
    }

    _lastRate = rate;

    // Hinweis ausblenden, Ergebnis einblenden
    const hint = $('start-hint');
    if (hint) hint.classList.add('hidden');
    const area = $('result-area');
    if (area) area.classList.remove('hidden');

    _animateResult(Calculator.formatDE(rate) + ' €');

    const btn = $('next-btn');
    if (btn) btn.disabled = false;
  }

  // ── ERGEBNIS-ANIMATION ───────────────────────────────────────────────────────
  function _animateResult(text) {
    const el = $('result-display');
    if (!el) return;
    el.innerHTML = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.animationDelay = (i * Math.min(26, 180 / text.length)) + 'ms';
      el.appendChild(s);
    });
  }

  // ── SCHRITT-NAVIGATION ───────────────────────────────────────────────────────
  function goStep2() {
    const price    = Calculator.parseDE($('price').value) || 0;
    const duration = $('dur').value;
    const residual = $('res').value;
    const objekt   = ($('objekt')?.value || '').trim();
    const factor   = Calculator.getFactor(residual, duration);
    const restwert = price * (parseFloat(residual) / 100);

    $('s-preis').textContent = Calculator.formatDE(price) + ' €';
    $('s-dur').textContent   = duration;
    $('s-res').textContent   = Calculator.formatDE(restwert) + ' €';
    $('s-fac').textContent   = factor ? String(factor).replace('.', ',') + ' %' : '—';
    $('s-obj').textContent   = objekt || '—';

    // Rate in Summary übernehmen (sauber, ohne ch-Spans)
    const rateEl = $('s-rate');
    if (rateEl) {
      const rate = _lastRate ?? 0;
      rateEl.innerHTML = Calculator.formatDE(rate) +
        ' <span style="font-size:.42em;font-weight:400;color:#666">€</span>';
    }

    $('step1').classList.add('hidden');
    $('step2').classList.remove('hidden');
    $('step2').classList.add('slide-in');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goStep1() {
    $('step2').classList.add('hidden');
    $('step2').classList.remove('slide-in');
    $('step1').classList.remove('hidden');
    $('step1').classList.add('slide-in');
    _hideErr2();
  }

  // ── TAB-STEUERUNG ────────────────────────────────────────────────────────────
  function showTab(id) {
    ['calc', 'why', 'cmp'].forEach(t => {
      const btn  = $('tab-' + t);
      const view = $('view-' + t);
      const active = (t === id);

      if (btn) {
        btn.classList.toggle('bg-ft-yellow', active);
        btn.classList.toggle('text-ft-dark',  active);
        btn.classList.toggle('text-gray-400', !active);
      }
      if (view) {
        view.classList.toggle('hidden', !active);
      }
    });
  }

  // ── FORMULAR-SUBMIT ──────────────────────────────────────────────────────────
  async function submitForm() {
    // Honeypot
    const hp = document.querySelector('input[name="_hp"]');
    if (hp && hp.value) return;

    // Rate Limit
    const btn   = $('sub-btn');
    const rlMsg = $('rl-msg');
    const last  = localStorage.getItem(CONFIG.rateLimitKey);
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10);
      if (elapsed < CONFIG.rateLimitMs) {
        if (rlMsg) rlMsg.classList.remove('hidden');
        if (btn) btn.disabled = true;
        setTimeout(() => {
          if (rlMsg) rlMsg.classList.add('hidden');
          if (btn) btn.disabled = false;
        }, CONFIG.rateLimitMs - elapsed);
        return;
      }
    }
    if (rlMsg) rlMsg.classList.add('hidden');

    const data = _collectFormData();
    const errors = Calculator.validateContact(data);
    if (errors.length) { _showErr2(errors); return; }
    _hideErr2();

    const origHTML = btn.innerHTML;
    btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Wird erstellt…';
    btn.disabled = true;
    localStorage.setItem(CONFIG.rateLimitKey, Date.now().toString());

    try {
      await PDFService.generate(_buildOffer(data), 'assets/logo.png');
    } catch (e) {
      console.error('[FT Rechner] PDF-Fehler:', e);
      _showErr2([
        'Das PDF konnte nicht erstellt werden: ' + (e.message || 'Unbekannter Fehler.'),
        'Bitte prüfen Sie, ob jsPDF korrekt geladen wurde.',
      ]);
    } finally {
      btn.innerHTML = origHTML;
      btn.disabled = false;
    }
  }

  function _collectFormData() {
    const s = Calculator.sanitize;
    return {
      art:        s($('f-art')?.value),
      anrede:     s($('f-anr')?.value),
      vorname:    s($('f-vn')?.value),
      nachname:   s($('f-nn')?.value),
      firma:      s($('f-fi')?.value),
      strasse:    s($('f-st')?.value),
      plz:        s($('f-plz')?.value),
      ort:        s($('f-ort')?.value),
      objekt:     s($('objekt')?.value),
      bearbeiter: s($('f-bearbeiter')?.value),
      vorgangsId: s($('f-vorgangs')?.value),
    };
  }

  function _buildOffer(data) {
    const price    = Calculator.parseDE($('price').value) || 0;
    const duration = $('dur').value;
    const residual = $('res').value;
    const factor   = Calculator.getFactor(residual, duration);
    const restwert = price * (parseFloat(residual) / 100);
    const rate     = _lastRate ?? Calculator.calcRate(price, residual, duration) ?? 0;

    const now = new Date();
    const p2  = n => String(n).padStart(2, '0');
    const angebotsNr = `FT-${now.getFullYear()}-${p2(now.getMonth()+1)}${p2(now.getDate())}${p2(now.getHours())}${p2(now.getMinutes())}`;
    const datum      = `${p2(now.getDate())}.${p2(now.getMonth()+1)}.${now.getFullYear()}`;

    return {
      ...data,
      preis:      Calculator.formatDE(price),
      laufzeit:   String(duration),
      restwert:   Calculator.formatDE(restwert),
      faktor:     factor ? String(factor).replace('.', ',') : '—',
      rate:       Calculator.formatDE(rate),
      datum,
      angebotsNr,
    };
  }

  // ── FEHLER ───────────────────────────────────────────────────────────────────
  function _showErr1(errors) {
    const box  = $('err1');
    const list = $('err1-list');
    if (!box || !list) return;
    list.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
    box.classList.remove('hidden');
  }
  function _hideErr1() {
    const box = $('err1');
    if (box) { box.classList.add('hidden'); $('err1-list').innerHTML = ''; }
  }
  function _showErr2(errors) {
    const box  = $('err2');
    const list = $('err2-list');
    if (!box || !list) return;
    list.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
    box.classList.remove('hidden');
  }
  function _hideErr2() {
    const box = $('err2');
    if (box) { box.classList.add('hidden'); $('err2-list').innerHTML = ''; }
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return Object.freeze({
    showTab,
    onPriceInput, onPriceBlur,
    onDurationChange, onResidualChange,
    calculate,
    goStep2, goStep1,
    submitForm,
  });

})();
