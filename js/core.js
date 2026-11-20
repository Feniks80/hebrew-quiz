/* Hebrew Quiz — core: registry, loader, storage, speech, router. © Shimon Donen, 2026 */
(function () {
  'use strict';
  var HQ = window.HQ = window.HQ || {};
  HQ.decks = {}; HQ.extra = {}; HQ.manifest = null; HQ.views = {};

  /* ---------- data registry (data/*.js call HQ.reg) ---------- */
  HQ.reg = function (kind, key, obj) {
    if (kind === 'manifest') { HQ.manifest = obj; return; }
    if (kind === 'extra') { HQ.extra[key] = obj; return; }
    if (kind === 'deck') {
      obj.cats.forEach(function (c, ci) {
        c.items = c.items.map(function (a) {
          return { id: key + ':' + a[0], deck: key, cat: ci, he: a[1], nq: a[2] || '', tr: a[3], ru: a[4], em: a[5] || '', g: a[6] || '', note: a[7] || '' };
        });
      });
      obj.all = [].concat.apply([], obj.cats.map(function (c) { return c.items; }));
      HQ.decks[key] = obj;
    }
  };
  var loading = {};
  HQ.load = function (file) {            // <script> injection: works on file:// too
    if (loading[file]) return loading[file];
    loading[file] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'data/' + file + '.js'; s.onload = function () { res(); };
      s.onerror = function () { delete loading[file]; rej(new Error('load ' + file)); };
      document.head.appendChild(s);
    });
    return loading[file];
  };
  HQ.loadDeck = function (id) {
    if (HQ.decks[id]) { HQ.store.migrateDeck(HQ.decks[id]); return Promise.resolve(HQ.decks[id]); }
    return HQ.load('deck-' + id).then(function () { HQ.store.migrateDeck(HQ.decks[id]); return HQ.decks[id]; });
  };
  HQ.loadExtra = function (name) {
    if (HQ.extra[name]) return Promise.resolve(HQ.extra[name]);
    return HQ.load(name).then(function () { return HQ.extra[name]; });
  };

  /* ---------- util ---------- */
  HQ.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  HQ.sample = function (a, n) { return HQ.shuffle(a).slice(0, n); };
  HQ.today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  HQ.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  HQ.plural = function (n, one, few, many) { var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many); };
  /* el('div.cls', {onclick:fn, html:'..'}, child, 'text', [children]) */
  HQ.el = function (spec, attrs) {
    var parts = spec.split('.'), e = document.createElement(parts[0] || 'div');
    if (parts.length > 1) e.className = parts.slice(1).join(' ');
    var i = 1;
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      for (var k in attrs) {
        if (k === 'html') e.innerHTML = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'style') e.style.cssText = attrs[k];
        else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
      }
      i = 2;
    }
    for (; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  };
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; }
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  /* mixed Russian + Hebrew text: every Hebrew run is isolated so the browser does not reorder the sentence */
  HQ.rich = function (text, tag) {
    var e = document.createElement(tag || 'span'), re = /[\u0590-\u05FF]+(?:[ \u05BE'"\-][\u0590-\u05FF]+)*/g, last = 0, m;
    text = String(text == null ? '' : text);
    while ((m = re.exec(text))) {
      if (m.index > last) e.appendChild(document.createTextNode(text.slice(last, m.index)));
      var b = document.createElement('bdi'); b.className = 'hi'; b.lang = 'he'; b.dir = 'rtl'; b.textContent = m[0]; e.appendChild(b);
      last = m.index + m[0].length;
    }
    if (last < text.length) e.appendChild(document.createTextNode(text.slice(last)));
    return e;
  };
  /* Hebrew text of an item according to the niqqud setting */
  HQ.heb = function (it) { return (HQ.store.set('nq') && it.nq) ? it.nq : it.he; };
  HQ.hsize = function (s) { var n = s.replace(/[֑-ׇ]/g, '').length; return n > 22 ? 's' : n > 11 ? 'm' : ''; };

  /* ---------- storage ---------- */
  var KEY = 'hq2', OLD = /^(hz-state|he100-state|he-block-|hq-prog|hq2-prog|he-test-state|he-test-idioms-state)/;
  var S = { v: 2, set: {}, w: {}, m: {}, ex: {}, day: {}, gr: {}, mig: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); for (var k in S) if (p[k] != null) S[k] = p[k]; } } catch (e) { }
  var DEF = { nq: true, dir: 'mix', rate: 0.8, mode: 'simple', theme: 'auto', size: 'm' };
  var saveT = null;
  function save() { if (saveT || frozen) return; saveT = setTimeout(function () { saveT = null; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, 150); }
  var frozen = false;
  function flush() { if (frozen) return; if (saveT) { clearTimeout(saveT); saveT = null; } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  function day() { var d = HQ.today(); return S.day[d] || (S.day[d] = { n: 0, ok: 0, nw: 0 }); }

  HQ.store = {
    raw: S, flush: flush,
    set: function (k, v) { if (arguments.length === 1) return (k in S.set) ? S.set[k] : DEF[k]; S.set[k] = v; save(); HQ.applyPrefs(); },
    full: function () { return HQ.store.set('mode') === 'full'; },
    score: function (id) { return S.w[id] ? S.w[id].s : 0; },
    learned: function (id) { return !!S.w[id] && S.w[id].s >= 3; },
    /* record an answer. weight: 2 for "знаю" on a card, 1 for an exercise */
    answer: function (it, ok, weight) {
      var w = S.w[it.id] || (S.w[it.id] = { s: 0, ok: 0, bad: 0 }), was = w.s >= 3, d = day();
      d.n++;
      if (ok) { w.ok++; w.s = Math.min(5, w.s + (weight || 1)); d.ok++; if (S.m[it.id]) { S.m[it.id]--; if (S.m[it.id] <= 0) delete S.m[it.id]; } }
      else { w.bad++; w.s = Math.max(0, w.s - 1); S.m[it.id] = 2; }
      w.t = Date.now();
      if (!was && w.s >= 3) d.nw++;
      save();
    },
    mistakes: function () { return Object.keys(S.m); },
    learnedIn: function (deckId, items) {
      if (items) return items.filter(function (it) { return HQ.store.learned(it.id); }).length;
      var n = 0, pre = deckId + ':'; for (var id in S.w) if (S.w[id].s >= 3 && id.lastIndexOf(pre, 0) === 0) n++; return n;
    },
    totalLearned: function () { var n = 0; for (var id in S.w) if (S.w[id].s >= 3) n++; return n; },
    exam: function (key, pct) { if (arguments.length === 1) return S.ex[key]; var e = S.ex[key] || {}; S.ex[key] = { best: Math.max(e.best || 0, pct), last: pct, t: Date.now() }; save(); },
    grammar: function (id, pct) { if (arguments.length === 1) return S.gr[id]; S.gr[id] = Math.max(S.gr[id] || 0, pct); save(); },
    days: function () { return S.day; },
    reset: function () { S.w = {}; S.m = {}; S.ex = {}; S.day = {}; S.gr = {}; flush(); },
    /* one-time import of the pre-rebuild progress (keyed by Hebrew word) when a deck is first loaded */
    migrateDeck: function (deck) {
      if (!deck || S.mig[deck.id]) return;
      var known = {};
      try {
        var key = deck.id === 'zero' ? 'hz-state' : deck.id === 'everyday' ? 'he100-state' : 'he-block-' + deck.id;
        var o = JSON.parse(localStorage.getItem(key) || 'null');
        if (o && o.known) known = deck.id === 'zero' ? (o.known.words || {}) : o.known;
      } catch (e) { }
      deck.all.forEach(function (it) {
        var old = deck.old && deck.old[it.id.split(':')[1]];
        if ((known[it.he] || (it.nq && known[it.nq]) || (old && known[old])) && !S.w[it.id]) S.w[it.id] = { s: 3, ok: 1, bad: 0, t: Date.now() };
      });
      S.mig[deck.id] = 1; save();
    },
    /* progress code: HQ2:<base64 json of every progress key> (also reads the older HQ1 codes) */
    exportCode: function () {
      flush(); var d = {};
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k === KEY || OLD.test(k)) d[k] = localStorage.getItem(k); } } catch (e) { }
      return 'HQ2:' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, t: Date.now(), d: d }))));
    },
    importCode: function (code) {
      code = String(code || '').replace(/\s+/g, '');
      if (!/^HQ[12]:/.test(code)) return -1;
      var o; try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))); } catch (e) { return -1; }
      if (!o || typeof o.d !== 'object' || !o.d) return -1;
      var n = 0;
      for (var k in o.d) if ((k === KEY || OLD.test(k)) && typeof o.d[k] === 'string') { try { localStorage.setItem(k, o.d[k]); n++; } catch (e) { } }
      if (saveT) { clearTimeout(saveT); saveT = null; }
      if (n > 0) {
        frozen = true;                                   // the page reloads next; don't overwrite the import
        if (!(KEY in o.d)) {                             // old-format code: let the decks re-import it
          try { var cur = JSON.parse(localStorage.getItem(KEY) || '{}'); cur.mig = {}; localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) { }
        }
      }
      return n;
    }
  };
  HQ.applyPrefs = function () {
    var r = document.documentElement, t = HQ.store.set('theme'), z = HQ.store.set('size');
    if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
    if (z === 'm') r.removeAttribute('data-size'); else r.setAttribute('data-size', z);
  };

  /* ---------- speech: native Android bridge -> Web Speech ---------- */
  var voices = { he: null, ru: null };
  var T0 = Date.now();
  function pickVoices() {
    if (!('speechSynthesis' in window)) return;
    var a = speechSynthesis.getVoices() || [];
    voices.he = a.filter(function (v) { return /^(he|iw)/i.test(v.lang); })[0] || null;
    voices.ru = a.filter(function (v) { return /^ru/i.test(v.lang); })[0] || null;
  }
  if ('speechSynthesis' in window) { pickVoices(); speechSynthesis.onvoiceschanged = pickVoices; setTimeout(pickVoices, 400); setTimeout(pickVoices, 1500); }
  /* iPhone / iPad (iPadOS reports itself as a Mac with a touch screen) */
  HQ.ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  HQ.standalone = !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  /* Safari keeps speech locked until the first tap: say an empty phrase inside that tap */
  if ('speechSynthesis' in window && !window.AndroidTTS) {
    var unlock = function () {
      document.removeEventListener('touchend', unlock, true); document.removeEventListener('click', unlock, true);
      try { if (!speechSynthesis.speaking && !speechSynthesis.pending) { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { }
      pickVoices();
    };
    document.addEventListener('touchend', unlock, true); document.addEventListener('click', unlock, true);
  }
  function bridge() { var B = window.AndroidTTS; return (B && typeof B.speak === 'function') ? B : null; }
  HQ.tts = {
    /* 'yes' | 'no' | 'wait' */
    has: function (lang) {
      var B = bridge();
      if (B) { try { if (typeof B.isReady === 'function' && !B.isReady()) return 'wait'; if (typeof B.hasLanguage === 'function') return B.hasLanguage(lang) ? 'yes' : 'no'; return 'yes'; } catch (e) { return 'no'; } }
      if (!('speechSynthesis' in window)) return 'no';
      pickVoices();
      if (voices[lang]) return 'yes';
      /* browsers fill the voice list a moment after the page opens */
      return ((speechSynthesis.getVoices() || []).length === 0 && Date.now() - T0 < 3000) ? 'wait' : 'no';
    },
    speak: function (text, lang, slow) {
      if (!text) return false;
      lang = lang || 'he';
      text = text.replace(/[֑-ֽֿ֯׀׃]/g, '');           // cantillation etc. confuse engines
      var rate = HQ.store.set('rate') * (slow ? 0.7 : 1), B = bridge();
      if (B) {
        try {
          if ((typeof B.isReady !== 'function' || B.isReady()) && (typeof B.hasLanguage !== 'function' || B.hasLanguage(lang))) {
            if (B.speak(text, lang, rate) !== false) return true;
          }
        } catch (e) { }
      }
      if (!('speechSynthesis' in window)) return false;
      var go = function () {
        pickVoices();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'ru' ? 'ru-RU' : 'he-IL';
        try { if (voices[lang]) u.voice = voices[lang]; } catch (e) { }
        u.rate = Math.max(0.3, rate); u.pitch = 1; u.volume = 1;
        try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { }
      };
      var busy = false; try { busy = speechSynthesis.speaking || speechSynthesis.pending; } catch (e) { }
      /* iPhone/iPad only speak inside the tap itself, so start at once when nothing is playing */
      if (!busy) { go(); return true; }
      try { speechSynthesis.cancel(); } catch (e) { }
      if (HQ.ios) go(); else setTimeout(go, 50);
      return true;
    },
    say: function (it, slow) { return HQ.tts.speak(it.nq || it.he, 'he', slow); },
    openSettings: function () { var B = window.AndroidTTS; if (B && typeof B.openTtsSettings === 'function') { try { B.openTtsSettings(); return true; } catch (e) { } } return false; }
  };

  /* ---------- router ---------- */
  var root;
  HQ.go = function (path) { if (location.hash === '#' + path) HQ.render(); else location.hash = path; };
  HQ.back = function (fallback) { if (history.length > 1) history.back(); else HQ.go(fallback || '/'); };
  HQ.session = null;                                     // a running exercise keeps its state here
  HQ.render = function () {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
    var name = parts[0] || 'home', view = HQ.views[name] || HQ.views.home;
    if (name !== 'run') HQ.session = null;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { }
    root.innerHTML = '';
    window.scrollTo(0, 0);
    try { view(root, parts.slice(1)); }
    catch (e) { root.appendChild(HQ.el('div.note.warn', { text: 'Что-то пошло не так. Вернитесь на главную.' })); root.appendChild(HQ.el('button.btn.primary', { onclick: function () { HQ.go('/'); } }, 'На главную')); if (window.console) console.error(e); }
  };
  /* page chrome */
  HQ.top = function (title, sub, back) {
    return HQ.el('div.top',
      back === false ? null : HQ.el('button.icon-btn', { 'aria-label': 'Назад', onclick: function () { typeof back === 'function' ? back() : HQ.go(back || '/'); } }, '‹'),
      HQ.el('h1', {}, title, sub ? HQ.el('div.sub', { text: sub }) : null),
      HQ.el('button.icon-btn', { 'aria-label': 'Настройки', onclick: function () { HQ.go('/settings'); } }, '⚙️'));
  };
  HQ.wait = function (rootEl, promise, then) {
    var n = HQ.el('div.center.muted', { style: 'padding:40px 0' }, 'Загрузка…'); rootEl.appendChild(n);
    promise.then(function (x) { if (n.parentNode) { n.remove(); then(x); } }, function () {
      n.textContent = 'Не удалось загрузить данные. Проверьте интернет и попробуйте ещё раз.';
    });
  };
  HQ.start = function () {
    root = document.getElementById('app');
    HQ.applyPrefs();
    /* legacy deep links: #import=<code> */
    if (/^#import=/.test(location.hash)) {
      var n = HQ.store.importCode(decodeURIComponent(location.hash.slice(8)));
      history.replaceState(null, '', location.pathname + location.search);
      if (n > 0) { location.reload(); return; }
    }
    window.addEventListener('hashchange', HQ.render);
    HQ.render();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('service-worker.js').catch(function () { }); });
    }
  };
})();
