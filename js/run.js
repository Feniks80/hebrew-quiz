/* Hebrew Quiz — exercise engine: cards, choice, listen, build, match, exam. © Shimon Donen, 2026 */
(function () {
  'use strict';
  var HQ = window.HQ, el = HQ.el, St = HQ.store;
  var FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

  function isPhrase(it) { return /\s/.test(it.he.trim()); }
  function canBuild(it) {
    var h = it.he.trim();
    if (/["'׳״.\d]/.test(h)) return false;
    if (isPhrase(it)) { var w = h.split(/\s+/); return w.length >= 2 && w.length <= 6; }
    return h.length >= 2 && h.length <= 8;
  }
  /* unlearned first, then the rest, each part shuffled */
  function order(items) {
    var a = HQ.shuffle(items.filter(function (it) { return !St.learned(it.id); })), b = HQ.shuffle(items.filter(function (it) { return St.learned(it.id); }));
    return a.concat(b);
  }
  /* 3 plausible wrong answers: same kind (word/phrase), close length, same category first */
  function distract(it, pool, field) {
    var want = isPhrase(it), seen = {}; seen[it[field]] = 1; seen[it.he] = 1;
    var c = pool.filter(function (x) {
      if (x === it || seen[x[field]] || x.he === it.he || x.ru === it.ru) return false;
      seen[x[field]] = 1; return true;
    });
    function rank(x) { return (isPhrase(x) === want ? 0 : 50) + (x.cat === it.cat && x.deck === it.deck ? 0 : 8) + Math.abs(x.he.length - it.he.length) + Math.random() * 6; }
    return c.map(function (x) { return [rank(x), x]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 3).map(function (p) { return p[1]; });
  }

  /* ---------------- start ---------------- */
  HQ.startRun = function (o) {
    var full = St.full(), src = o.items, pool = o.pool || (o.deck ? o.deck.all : o.items), n;
    var s = { kind: o.kind, title: o.title, back: o.back, pool: pool, i: 0, res: [], examKey: o.examKey, src: src, deck: o.deck, cat: o.cat };
    if (o.kind === 'cards') { n = o.all ? src.length : (o.cat < 0 ? 20 : Math.min(src.length, 40)); s.items = order(src).slice(0, n); }
    else if (o.kind === 'match') {
      /* every word and every translation on the board must be different, otherwise pairs are ambiguous */
      var sh = {}, sm = {}; s.items = order(src).filter(function (it) { var a = HQ.heb(it), b = HQ.mean(it); if (sh[a] || sm[b]) return false; sh[a] = sm[b] = 1; return true; }).slice(0, full ? 20 : 15);
    }
    else if (o.kind === 'build') { var b = src.filter(canBuild); s.items = order(b).slice(0, full ? 12 : 8); }
    else if (o.kind === 'exam') {
      s.items = HQ.shuffle(src).slice(0, full ? 25 : 15);
      var kinds = ['he-ru', 'ru-he', 'listen', 'build'];
      s.q = s.items.map(function (it, i) { var k = kinds[i % 4]; if (k === 'build' && !canBuild(it)) k = 'ru-he'; if (k === 'listen' && HQ.tts.has(HQ.lang().learn) === 'no') k = 'he-ru'; return k; });
    }
    else { s.items = order(src).slice(0, o.all ? Math.min(src.length, 20) : (full ? 15 : 10)); }
    if (!s.items.length) { alert(HQ.t('В этом разделе нет подходящих слов для такого упражнения.')); return; }
    HQ.session = s; HQ.go('/run');
  };

  /* ---------------- frame ---------------- */
  HQ.views.run = function (root) {
    var s = HQ.session;
    if (!s) { HQ.go('/'); return; }
    if (s.done) { result(root, s); return; }
    root.appendChild(el('div.top', {},
      el('button.icon-btn', { 'aria-label': HQ.t('Закрыть'), onclick: function () { if (s.i === 0 || confirm(HQ.t('Закончить занятие?'))) HQ.go(s.back || '/'); } }, '✕'),
      el('h1', {}, s.title, el('div.sub', { text: HQ.t(NAMES[s.kind]) }))));
    var total = s.kind === 'match' ? Math.ceil(s.items.length / 5) : s.items.length;
    root.appendChild(el('div.prog', {}, el('div.bar', {}, el('i', { style: 'width:' + (s.i / total * 100) + '%' })), el('div.n', { text: (s.i + 1) + ' / ' + total })));
    var host = el('div.pop'); root.appendChild(host);
    if (s.kind === 'cards') card(host, s);
    else if (s.kind === 'match') match(host, s);
    else {
      var it = s.items[s.i], k = s.kind === 'exam' ? s.q[s.i] : s.kind;
      if (k === 'choice') { var d = St.set('dir'); k = d === 'mix' ? (s.i % 2 ? 'ru-he' : 'he-ru') : d; }
      var fn = k === 'listen' ? listen : k === 'build' ? build : choice;
      fn(host, s, it, k, function (ok) { record(s, it, ok, 1); });
    }
  };
  var NAMES = { cards: 'Карточки', choice: 'Выбор перевода', listen: 'На слух', build: 'Собери', match: 'Найди пару', exam: 'Экзамен' };
  function record(s, it, ok, w) { St.answer(it, ok, w); s.res.push({ it: it, ok: ok }); }
  function next(s) { s.i++; var total = s.kind === 'match' ? Math.ceil(s.items.length / 5) : s.items.length; if (s.i >= total) s.done = true; HQ.render(); }
  function nextBtn(host, s, ok) {
    var last = s.i + 1 >= s.items.length;
    host.appendChild(el('button.btn.primary', { onclick: function () { next(s); } }, last ? HQ.t('Результат ›') : HQ.t('Дальше ›')));
  }
  function feedback(host, ok, it, showAnswer) {
    host.appendChild(el('div.fb.' + (ok ? 'ok' : 'bad'), {},
      ok ? HQ.t('Верно! 👍') : HQ.t('Почти! Правильный ответ:'),
      (!ok || showAnswer) ? el('span' + HQ.tc(), { text: HQ.heb(it) }) : null,
      (!ok || showAnswer) ? el('span', {}, it.tr ? el('div', { style: 'font-weight:500', text: it.tr }) : '', el('div' + HQ.mc(), { text: HQ.mean(it) })) : null));
  }
  function sayBtn(it, label) { return el('button.say', { onclick: function () { HQ.tts.say(it); } }, '🔊 ' + (label || HQ.t('Послушать'))); }
  function heNode(it, cls) { var t = HQ.heb(it); return el('div.hw' + HQ.tc() + (HQ.hsize(t) ? '.' + HQ.hsize(t) : '') + (cls || ''), { text: t, lang: it.sl || 'he' }); }
  function ruNode(it) { return el('div.ru' + HQ.mc(), { text: HQ.mean(it) }); }

  /* ---------------- cards ---------------- */
  function card(host, s) {
    var it = s.items[s.i], dir = St.set('dir') === 'he-ru' ? 'he-ru' : 'ru-he', open = !!s.open;
    var st = el('div.stage');
    if (it.em) st.appendChild(el('div.em', { text: it.em }));
    if (dir === 'ru-he') {
      st.appendChild(ruNode(it));
      if (open) { st.appendChild(el('hr')); st.appendChild(heNode(it)); if (it.tr) st.appendChild(el('div.tr', { text: it.tr })); }
    } else {
      st.appendChild(heNode(it)); if (it.tr) st.appendChild(el('div.tr', { text: it.tr }));
      if (open) { st.appendChild(el('hr')); st.appendChild(ruNode(it)); }
    }
    if (open && it.note) st.appendChild(el('div.nt', {}, HQ.rich(it.note)));
    if (open || dir === 'he-ru') { st.appendChild(sayBtn(it)); st.appendChild(el('button.say', { onclick: function () { HQ.tts.say(it, true); } }, HQ.t('🐢 Медленно'))); }
    host.appendChild(st);
    if (!open) {
      host.appendChild(el('button.btn.primary', { onclick: function () { s.open = true; HQ.render(); HQ.tts.say(it); } }, HQ.t('Показать ответ')));
      if (dir === 'he-ru' && s.i === 0 && !s.said) { s.said = 1; }
    } else {
      host.appendChild(el('div.row', {},
        el('button.btn.bad', { onclick: function () { s.open = false; record(s, it, false, 1); next(s); } }, HQ.t('Ещё не знаю')),
        el('button.btn.ok', { onclick: function () { s.open = false; record(s, it, true, 2); next(s); } }, HQ.t('Знаю ✓'))));
    }
    host.appendChild(el('div.navrow', {},
      el('button.btn', { disabled: s.i === 0 ? '' : null, onclick: function () { s.open = false; s.i--; HQ.render(); } }, HQ.t('‹ Назад')),
      el('button.btn', { onclick: function () { s.open = false; next(s); } }, HQ.t('Пропустить ›'))));
  }

  /* ---------------- choice (both directions) ---------------- */
  function choice(host, s, it, dir, done) {
    var toHe = dir === 'ru-he', field = toHe ? 'he' : 'ru';
    var opts = HQ.shuffle([it].concat(distract(it, s.pool, field)));
    var st = el('div.stage', {}, el('div.ask', { text: toHe ? HQ.t({ he: 'Как это на иврите?', ru: 'Как это по-русски?', en: 'Как это по-английски?' }[it.sl || 'he']) : HQ.t('Что это значит?') }));
    if (toHe) { if (it.em) st.appendChild(el('div.em', { text: it.em })); st.appendChild(ruNode(it)); }
    else { st.appendChild(heNode(it)); if (it.tr && (!St.full() || St.set('nq'))) st.appendChild(el('div.tr', { text: it.tr })); if (s.kind !== 'exam') st.appendChild(sayBtn(it)); }
    host.appendChild(st);
    var box = el('div.opts'), after = el('div'), picked = false; host.appendChild(box); host.appendChild(after);
    opts.forEach(function (o) {
      var b = el('button.opt' + (toHe ? HQ.tc() : HQ.mc()), { lang: toHe ? (it.sl || 'he') : null, onclick: function () {
        if (toHe) HQ.tts.say(o);                              // every tap on a Hebrew option speaks it
        else if (picked) HQ.tts.say(it);
        if (picked) return; picked = true;
        var ok = o === it;
        Array.prototype.forEach.call(box.children, function (x, i) { if (opts[i] === it) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); else x.classList.add('dim'); });
        if (!toHe) HQ.tts.say(it);
        done(ok); feedback(after, ok, it, true); nextBtn(after, s, ok);
      } }, toHe ? HQ.heb(o) : HQ.mean(o));
      box.appendChild(b);
    });
  }

  /* ---------------- listening ---------------- */
  function listen(host, s, it, kind, done) {
    var noVoice = HQ.tts.has(it.sl || 'he') === 'no';
    var toHe = St.full() && s.i % 2 === 1, field = toHe ? 'he' : 'ru';
    var opts = HQ.shuffle([it].concat(distract(it, s.pool, field)));
    var st = el('div.stage', {}, el('div.ask', { text: HQ.t('Послушайте и выберите') + (toHe ? HQ.t(' слово') : HQ.t(' перевод')) }),
      el('button.say.big', { 'aria-label': HQ.t('Послушать ещё раз'), onclick: function () { HQ.tts.say(it); } }, '🔊'),
      el('div', {}, el('button.say', { onclick: function () { HQ.tts.say(it, true); } }, HQ.t('🐢 Медленно'))));
    if (noVoice) st.appendChild(el('div.nt', { text: HQ.t('Голос не найден, поэтому показываю слово: ') + (it.tr || HQ.heb(it)) }));
    host.appendChild(st);
    setTimeout(function () { if (HQ.session === s && !picked) HQ.tts.say(it); }, 250);
    var box = el('div.opts'), after = el('div'), picked = false; host.appendChild(box); host.appendChild(after);
    opts.forEach(function (o) {
      var b = el('button.opt' + (toHe ? HQ.tc() : HQ.mc()), { onclick: function () {
        if (picked) { HQ.tts.say(toHe ? o : it); return; } picked = true;
        var ok = o === it;
        Array.prototype.forEach.call(box.children, function (x, i) { if (opts[i] === it) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); else x.classList.add('dim'); });
        done(ok); feedback(after, ok, it, true); nextBtn(after, s, ok);
      } }, toHe ? HQ.heb(o) : HQ.mean(o));
      box.appendChild(b);
    });
  }

  /* ---------------- build a word from letters / a phrase from words ---------------- */
  function build(host, s, it, kind, done) {
    var phrase = isPhrase(it), clean = it.he.replace(/[?!,.:;…]/g, ' ').replace(/\s+/g, ' ').trim(), target = phrase ? clean.split(' ') : clean.split('');
    var pieces = target.slice();
    if (!phrase && St.full()) {                              // two extra letters make it a real spelling task
      var extra = HQ.shuffle(HQ.ABC[HQ.lang().learn].split('').filter(function (c) { return target.indexOf(c) < 0 && target.indexOf(FINAL[c] || c) < 0; })).slice(0, 2);
      pieces = pieces.concat(extra);
    }
    var tiles = HQ.shuffle(pieces.map(function (t, i) { return { t: t, k: i }; }));
    if (tiles.map(function (x) { return x.t; }).join('|') === target.join('|') && tiles.length > 1) tiles.reverse();
    var placed = [], finished = false;
    var st = el('div.stage', {}, el('div.ask', { text: phrase ? HQ.t('Соберите фразу из слов') : HQ.t('Соберите слово из букв') }));
    if (it.em) st.appendChild(el('div.em', { text: it.em }));
    st.appendChild(ruNode(it));
    if (it.tr) st.appendChild(el('div.tr', { text: it.tr }));
    if (s.kind !== 'exam') st.appendChild(sayBtn(it, HQ.t('Подсказка')));
    host.appendChild(st);
    var slots = el('div.slots'), bank = el('div.tilesx'), after = el('div');
    host.appendChild(slots); host.appendChild(bank); host.appendChild(after);
    function draw() {
      slots.innerHTML = ''; bank.innerHTML = '';
      placed.forEach(function (tk, i) { slots.appendChild(el('button.tk' + HQ.tc() + (phrase ? '.w' : ''), { onclick: function () { if (finished) return; placed.splice(i, 1); draw(); } }, tk.t)); });
      tiles.forEach(function (tk) {
        bank.appendChild(el('button.tk' + HQ.tc() + (phrase ? '.w' : '') + (placed.indexOf(tk) >= 0 ? '.used' : ''), { onclick: function () { if (finished || placed.indexOf(tk) >= 0) return; placed.push(tk); draw(); if (placed.length === target.length) check(); } }, tk.t));
      });
    }
    function check() {
      finished = true;
      var ok = placed.map(function (x) { return x.t; }).join(phrase ? ' ' : '') === target.join(phrase ? ' ' : '');
      slots.classList.add(ok ? 'ok' : 'bad');
      HQ.tts.say(it); done(ok); feedback(after, ok, it, true); nextBtn(after, s, ok);
    }
    draw();
    after.appendChild(el('div'));
    host.appendChild(el('div.navrow', {}, el('button.btn', { onclick: function () { if (finished) return; placed = []; draw(); } }, HQ.t('↺ Сначала'))));
  }

  /* ---------------- match pairs ---------------- */
  function match(host, s) {
    var group = s.items.slice(s.i * 5, s.i * 5 + 5), left = HQ.shuffle(group), right = HQ.shuffle(group);
    var sel = null, wrong = {}, solved = 0;
    host.appendChild(el('div.center.muted', { style: 'font-size:.85em;margin-bottom:10px', text: HQ.t('Нажмите слово, потом его перевод') }));
    var grid = el('div.match'), after = el('div'); host.appendChild(grid); host.appendChild(after);
    var L = [], R = [];
    function pick(side, it, node) {
      if (side === 'L') HQ.tts.say(it);
      if (!sel || sel.side === side) { if (sel) sel.node.classList.remove('sel'); sel = { side: side, it: it, node: node }; node.classList.add('sel'); return; }
      var a = sel; sel = null; a.node.classList.remove('sel');
      if (a.it === it) {
        a.node.classList.add('gone', 'ok'); node.classList.add('gone', 'ok'); solved++;
        record(s, it, !wrong[it.id], 1);
        if (solved === group.length) { after.appendChild(el('div.fb.ok', { text: HQ.t('Все пары найдены! 👍') })); after.appendChild(el('button.btn.primary', { onclick: function () { next(s); } }, (s.i + 1) * 5 >= s.items.length ? HQ.t('Результат ›') : HQ.t('Дальше ›'))); }
      } else {
        wrong[a.it.id] = 1; wrong[it.id] = 1;
        [a.node, node].forEach(function (n) { n.classList.add('bad', 'shake'); setTimeout(function () { n.classList.remove('bad', 'shake'); }, 450); });
      }
    }
    for (var i = 0; i < group.length; i++) (function (l, r) {
      var ln = el('button.opt' + HQ.tc(), { lang: l.sl || 'he' }, HQ.heb(l)), rn = el('button.opt' + HQ.mc(), {}, HQ.mean(r));
      ln.onclick = function () { pick('L', l, ln); }; rn.onclick = function () { pick('R', r, rn); };
      grid.appendChild(ln); grid.appendChild(rn);
    })(left[i], right[i]);
  }

  /* ---------------- result ---------------- */
  function result(root, s) {
    var n = s.res.length, ok = s.res.filter(function (r) { return r.ok; }).length, pct = n ? Math.round(ok / n * 100) : 0;
    var bad = [], seen = {}; s.res.forEach(function (r) { if (!r.ok && !seen[r.it.id]) { seen[r.it.id] = 1; bad.push(r.it); } });
    root.appendChild(HQ.top(s.title, HQ.t(NAMES[s.kind]), s.back || '/'));
    var passMark = St.full() ? 80 : 70, msg, cls = '';
    if (s.kind === 'exam') {
      if (s.examKey && !s.saved) { St.exam(s.examKey, pct); s.saved = 1; }
      msg = pct >= passMark ? HQ.t('Экзамен сдан! 🎉') : HQ.t('Пока не сдан — нужно ') + passMark + HQ.t('%. Повторите слова и попробуйте ещё раз.'); cls = pct >= passMark ? '.ok' : '';
    } else if (s.kind === 'cards') msg = n ? HQ.t('Вы отметили «знаю» ') + ok + HQ.t(' из ') + n : HQ.t('Вы просмотрели карточки');
    else msg = pct >= 90 ? HQ.t('Отлично! 🎉') : pct >= 70 ? HQ.t('Хорошо получается!') : HQ.t('Неплохо — повторим ещё раз, и станет легче');
    root.appendChild(el('div.card.center', {},
      n ? el('div.score' + cls, { text: s.kind === 'cards' ? ok + ' / ' + n : pct + '%' }) : null,
      s.kind !== 'cards' && n ? el('div.muted', { style: 'margin-top:6px', text: ok + HQ.t(' из ') + n + HQ.t(' правильно') }) : null,
      el('div', { style: 'font-weight:700;margin-top:10px', text: msg })));
    var again = function (items) { return function () { HQ.startRun({ kind: s.kind === 'exam' ? 'exam' : s.kind, deck: s.deck, cat: s.cat, items: items, pool: s.pool, title: s.title, back: s.back, examKey: s.examKey, all: items !== s.src }); }; };
    var st = el('div.stack');
    if (bad.length && s.kind !== 'exam') st.appendChild(el('button.btn.primary', { onclick: function () { HQ.startRun({ kind: s.kind === 'cards' ? 'cards' : 'choice', items: bad, pool: s.pool, title: s.title, back: s.back, all: true }); } }, HQ.t('Повторить ошибки (') + bad.length + ')'));
    st.appendChild(el('button.btn' + (bad.length && s.kind !== 'exam' ? '' : '.primary'), { onclick: again(s.src) }, HQ.t('Ещё раз')));
    st.appendChild(el('button.btn', { onclick: function () { HQ.go(s.back || '/'); } }, HQ.t('Вернуться к теме')));
    root.appendChild(st);
    if (bad.length) {
      var c = el('div.card', { style: 'margin-top:14px' }, el('div', { style: 'font-weight:800', text: HQ.t('Стоит повторить') }));
      bad.forEach(function (it) { c.appendChild(HQ.wordRow(it)); }); root.appendChild(c);
    }
  }
})();
