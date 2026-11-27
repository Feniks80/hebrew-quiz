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
          return { id: key + ':' + a[0], deck: key, cat: ci, he: a[1], nq: a[2] || '', tr: a[3], ru: a[4], em: a[5] || '', g: a[6] || '', note: a[7] || '', en: a[8] || '', ra: a[9] || '', rh: a[10] || '' };
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
    var p = HQ.decks[id] ? Promise.resolve() : HQ.load('deck-' + id);
    return p.then(function () { HQ.store.migrateDeck(HQ.decks[id]); return HQ.deckView(id); });
  };

  /* ---------- languages: interface (ui) and the language being learned (learn) ---------- */
  var ACC = /\u0301/g;
  HQ.noAcc = function (s) { return String(s || '').replace(ACC, ''); };
  HQ.lang = function () { var u = HQ.store.set('ui'), l = HQ.store.set('learn'); if (l === u) l = u === 'he' ? 'ru' : 'he'; return { ui: u, learn: l }; };
  /* progress ids: Hebrew keeps the old ids, other target languages get a prefix */
  HQ.pref = function () { var l = HQ.lang().learn; return l === 'he' ? '' : l + '@'; };
  HQ.native = function () { var L = HQ.lang(); return L.ui === 'ru' && L.learn === 'he'; };
  /* Cyrillic transcription -> Latin (keeps the stress mark) */
  var CL = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
  HQ.lat = function (s, russian) {
    s = String(s || '');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], lc = c.toLowerCase(), m = CL[lc];
      if (m === undefined) { out += c; continue; }
      /* Russian е after a vowel / at word start sounds "ye" */
      if (russian && lc === 'е' && (i === 0 || /[\s\-аеёиоуыэюяьъ\u0301]/i.test(s[i - 1]))) m = 'ye';
      if (c !== lc && m) m = m[0].toUpperCase() + m.slice(1);
      out += m;
    }
    return out;
  };
  /* one item as seen in the current language pair */
  function view(o, L) {
    var v = { id: HQ.pref() + o.id, deck: o.deck, cat: o.cat, em: o.em, g: '', note: '', o: o };
    if (L.learn === 'he') { v.he = o.he; v.nq = o.nq; v.tr = L.ui === 'ru' ? o.tr : HQ.lat(o.tr); v.ru = L.ui === 'ru' ? o.ru : o.en + (/\(м\)/.test(o.ru) ? ' (m)' : /\(ж\)/.test(o.ru) ? ' (f)' : ''); v.sl = 'he'; if (L.ui === 'ru') { v.note = o.note; v.g = o.g; } }
    else if (L.learn === 'ru') { v.he = HQ.noAcc(o.ra); v.nq = o.ra; v.tr = L.ui === 'he' ? (o.rh || '') : HQ.lat(o.ra, true); v.ru = L.ui === 'he' ? (o.nq || o.he) : o.en; v.mq = L.ui === 'he' ? o.he : ''; v.sl = 'ru'; v.st = v.he; }
    else { v.he = o.en; v.nq = ''; v.tr = ''; v.ru = L.ui === 'he' ? (o.nq || o.he) : HQ.noAcc(o.ra); v.mq = L.ui === 'he' ? o.he : ''; v.sl = 'en'; v.st = o.en; }
    return v;
  }
  /* CSS classes: target-language text and meaning text */
  HQ.tc = function () { return HQ.lang().learn === 'he' ? '.he' : '.tg'; };
  HQ.mc = function () { return HQ.lang().ui === 'he' ? '.he' : ''; };
  HQ.ABC = { he: 'אבגדהוזחטילמנסעפצקרשת', ru: 'абвгдежзиклмнопрстуфхцчшэюя', en: 'abcdefghijklmnoprstuvwy' };
  /* meaning text honours the niqqud setting when the meaning is Hebrew */
  HQ.mean = function (it) { return (it.mq && !HQ.store.set('nq')) ? it.mq : it.ru; };
  var views = {};
  HQ.deckView = function (id) {
    var d = HQ.decks[id], L = HQ.lang();
    if (HQ.native()) return d;
    var key = id + '|' + L.ui + '|' + L.learn;
    if (views[key]) return views[key];
    var m = HQ.manifest.decks[id] || {}, ok = function (o) { return L.learn === 'he' && L.ui === 'ru' ? true : !!(o.en && o.ra); };
    var seen = {};
    var cats = d.cats.map(function (c, ci) {
      var items = c.items.filter(ok).map(function (o) { return view(o, L); }).filter(function (v) { var k = v.he + '|' + v.ru; if (seen[k]) return false; seen[k] = 1; return true; });
      return { id: c.id, title: HQ.ct(m, ci) || c.title, group: c.group, items: items };
    });
    var all = [].concat.apply([], cats.map(function (c) { return c.items; }));
    return (views[key] = { id: id, title: HQ.dt(id), level: d.level, cats: cats, all: all, view: true });
  };
  /* deck / category titles in the interface language */
  HQ.dt = function (id) { var m = HQ.manifest.decks[id]; if (!m) return id; var u = HQ.lang().ui; return (u !== 'ru' && m.ti && m.ti[u]) || HQ.t(m.title); };
  HQ.ct = function (m, ci) { var c = m.cats && m.cats[ci]; if (!c) return ''; var u = HQ.lang().ui; return (u !== 'ru' && c.ti && c.ti[u]) || (u === 'ru' ? c.title : HQ.t(c.title)); };
  /* how many items a deck offers in the current pair */
  HQ.deckN = function (id) { var m = HQ.manifest.decks[id]; if (!m) return 0; return HQ.native() || (HQ.lang().learn === 'he' && HQ.lang().ui === 'ru') ? m.n : (m.nt || 0); };
  HQ.catN = function (id, ci) { var m = HQ.manifest.decks[id], c = m && m.cats[ci]; return c ? (HQ.native() ? c.n : (c.nt || 0)) : 0; };

  /* ---------- automatic move to the next question (setting 'auto': off | ok | all) ----------
     go() runs after a pause unless the screen changed meanwhile (stillHere() returns false) */
  HQ.autoNext = function (ok, stillHere, go) {
    var m = HQ.store.set('auto');
    if (m === 'off' || (m === 'ok' && !ok)) return;
    setTimeout(function () { if (stillHere()) go(); }, ok ? 900 : 2200);
  };
  /* ---------- version shown in footers: content build + Android app version ---------- */
  HQ.version = function () {
    var v = (HQ.manifest && HQ.manifest.ver) || '', A = window.AndroidStore, app = '';
    try { if (A && typeof A.appVersion === 'function') app = A.appVersion() || ''; } catch (e) { }
    return HQ.t('версия') + ' ' + v + (app ? ' · ' + HQ.t('приложение') + ' ' + app : '');
  };
  /* ---------- interface strings: HQ.t('Русский текст {0}', x) ---------- */
  HQ.t = function (s) {
    var u = HQ.store ? HQ.store.set('ui') : 'ru', D = HQ.extra.ui, r = s;
    if (u !== 'ru' && D && D[u] && D[u][s]) r = D[u][s];
    for (var i = 1; i < arguments.length; i++) r = r.split('{' + (i - 1) + '}').join(arguments[i]);
    return r;
  };
  /* plural forms per language: HQ.n(5, 'слово', 'слова', 'слов') */
  HQ.n = function (n, one, few, many) {
    var u = HQ.store.set('ui');
    if (u === 'ru') return HQ.plural(n, one, few, many);
    var D = HQ.extra.ui && HQ.extra.ui[u + '_pl'], f = D && D[many];
    if (!f) return n + ' ' + HQ.t(many);
    return n + ' ' + (n === 1 ? f[0] : f[1]);
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
    var rtl = HQ.store && HQ.store.set('ui') === 'he', e = document.createElement(tag || 'span'), last = 0, m;
    /* in a Hebrew interface the foreign (Latin / Cyrillic) runs are isolated, otherwise the Hebrew runs */
    var re = rtl ? /[A-Za-zА-Яа-яЁё\u0301][A-Za-zА-Яа-яЁё\u0301'’]*(?:[ \-\/.,][A-Za-zА-Яа-яЁё\u0301][A-Za-zА-Яа-яЁё\u0301'’]*)*/g : /[\u0590-\u05FF]+(?:[ \u05BE'"\-][\u0590-\u05FF]+)*/g;
    text = String(text == null ? '' : text);
    while ((m = re.exec(text))) {
      if (m.index > last) e.appendChild(document.createTextNode(text.slice(last, m.index)));
      var b = document.createElement('bdi'); b.className = 'hi'; b.dir = rtl ? 'ltr' : 'rtl'; if (!rtl) b.lang = 'he'; b.textContent = m[0]; e.appendChild(b);
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
  var DEF = { nq: true, dir: 'mix', rate: 0.8, mode: 'simple', theme: 'auto', size: 'm', ui: 'ru', learn: 'he', auto: 'off' };
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
    mistakes: function () { return Object.keys(S.m).filter(HQ.store.mine); },
    learnedIn: function (deckId, items) {
      if (items) return items.filter(function (it) { return HQ.store.learned(it.id); }).length;
      var n = 0, pre = HQ.pref() + deckId + ':'; for (var id in S.w) if (S.w[id].s >= 3 && id.lastIndexOf(pre, 0) === 0) n++; return n;
    },
    mine: function (id) { var p = HQ.pref(); return p ? id.lastIndexOf(p, 0) === 0 : id.indexOf('@') < 0; },
    totalLearned: function () { var n = 0; for (var id in S.w) if (S.w[id].s >= 3 && HQ.store.mine(id)) n++; return n; },
    exam: function (key, pct) { key = HQ.pref() + key; if (arguments.length === 1) return S.ex[key]; var e = S.ex[key] || {}; S.ex[key] = { best: Math.max(e.best || 0, pct), last: pct, t: Date.now() }; save(); },
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
    var r = document.documentElement, t = HQ.store.set('theme'), z = HQ.store.set('size'), u = HQ.store.set('ui');
    r.setAttribute('lang', u); r.setAttribute('dir', u === 'he' ? 'rtl' : 'ltr'); r.setAttribute('data-learn', HQ.lang().learn);
    if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
    if (z === 'm') r.removeAttribute('data-size'); else r.setAttribute('data-size', z);
  };

  /* ---------- speech: native Android bridge -> Web Speech ---------- */
  var voices = { he: null, ru: null, en: null };
  var T0 = Date.now();
  function pickVoices() {
    if (!('speechSynthesis' in window)) return;
    var a = speechSynthesis.getVoices() || [];
    voices.he = a.filter(function (v) { return /^(he|iw)/i.test(v.lang); })[0] || null;
    voices.ru = a.filter(function (v) { return /^ru/i.test(v.lang); })[0] || null;
    voices.en = a.filter(function (v) { return /^en[-_](US|GB)/i.test(v.lang); })[0] || a.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
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
        u.lang = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'he-IL';
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
    say: function (it, slow) { return HQ.tts.speak(it.st || it.nq || it.he, it.sl || 'he', slow); },
    sayText: function (text, lang, slow) { return HQ.tts.speak(lang === 'ru' ? HQ.noAcc(text) : text, lang, slow); },
    openSettings: function () { var B = window.AndroidTTS; if (B && typeof B.openTtsSettings === 'function') { try { B.openTtsSettings(); return true; } catch (e) { } } return false; }
  };

  /* ---------- router ---------- */
  var root;
  HQ.go = function (path) { if (location.hash === '#' + path) HQ.render(); else location.hash = path; };
  HQ.back = function (fallback) { if (history.length > 1) history.back(); else HQ.go(fallback || '/'); };
  HQ.session = null;                                     // a running exercise keeps its state here
  HQ.render = function () {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
    if (parts[0] === 'welcome' && parts[1] === '2') parts = ['welcome2'];
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
    /* first start of a new user: choose languages; existing users keep Russian -> Hebrew */
    var S0 = HQ.store.raw;
    if (!S0.set.welcomed && !S0.set.ui && !Object.keys(S0.w).length && !/^#\/?(welcome|deck|list|test|grammar|letters)/.test(location.hash)) location.hash = '/welcome';
    var go = function () { HQ.applyPrefs(); HQ.render(); };
    if (HQ.store.set('ui') !== 'ru' && !HQ.extra.ui) HQ.loadExtra('ui').then(go, go); else go();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('service-worker.js').catch(function () { }); });
    }
  };
})();
