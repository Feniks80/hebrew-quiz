/* Hebrew Quiz — grammar, conjugation, letters (print + handwriting), placement tests. © Shimon Donen, 2026 */
(function () {
  'use strict';
  var HQ = window.HQ, el = HQ.el, V = HQ.views, St = HQ.store;
  var heRe = /[א-ת]/;
  function isHe(s) { return heRe.test(s); }

  /* generic multiple-choice runner used by grammar, verbs, letters, tests.
     qs: [{ask, big, bigCls, sub, opts:[str], a:index, why, say, optCls}] */
  var TS = { he: /[\u05D0-\u05EA]/, ru: /[а-яё]/i, en: /[a-z]/i };
  function quiz(root, o) {
    var i = 0, ok = 0, wrong = [];
    function step() {
      root.innerHTML = '';
      root.appendChild(el('div.top', {},
        el('button.icon-btn', { 'aria-label': HQ.t('Закрыть'), onclick: function () { if (i === 0 || confirm(HQ.t('Закончить?'))) HQ.go(o.back); } }, '✕'),
        el('h1', {}, o.title, o.sub ? el('div.sub', { text: o.sub }) : null)));
      if (i >= o.qs.length) { finish(); return; }
      var q = o.qs[i];
      root.appendChild(el('div.prog', {}, el('div.bar', {}, el('i', { style: 'width:' + (i / o.qs.length * 100) + '%' })), el('div.n', { text: (i + 1) + ' / ' + o.qs.length })));
      var st = el('div.stage.pop', {}, q.ask ? el('div.ask', { text: q.ask }) : null);
      if (q.big) st.appendChild(el('div.hw' + (q.bigCls || (isHe(q.big) ? '.he' : '')) + (HQ.hsize(q.big) ? '.' + HQ.hsize(q.big) : ''), { text: q.big }));
      if (q.text) { var qt = HQ.rich(q.text, 'div'); qt.className = 'ru'; qt.style.fontSize = '1.2em'; st.appendChild(qt); }
      if (q.sub) st.appendChild(el('div.tr', { text: q.sub }));
      if (q.say) st.appendChild(el('button.say', { onclick: function () { HQ.tts.speak(q.say, 'he'); } }, HQ.t('🔊 Послушать')));
      if (q.sayL) { st.appendChild(el('button.say', { onclick: function () { HQ.tts.sayText(q.sayL, HQ.lang().learn); } }, HQ.t('🔊 Послушать'))); setTimeout(function () { HQ.tts.sayText(q.sayL, HQ.lang().learn); }, 250); }
      root.appendChild(st);
      var box = el('div.opts'), after = el('div'), picked = false; root.appendChild(box); root.appendChild(after);
      if (q.cols) box.style.gridTemplateColumns = '1fr 1fr';
      q.opts.forEach(function (t, k) {
        var tgt = q.sl ? TS[q.sl].test(t) : isHe(t), oc = isHe(t) ? '.he' : (tgt && HQ.lang().ui === 'he') ? '.tg' : '';
        var b = el('button.opt' + (q.optCls || oc), { onclick: function () {
          if (tgt && !q.mute) HQ.tts.sayText(t, q.sl || 'he');
          if (picked) return; picked = true;
          var good = k === q.a;
          Array.prototype.forEach.call(box.children, function (x, j) { if (j === q.a) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); else x.classList.add('dim'); });
          if (good) ok++; else wrong.push(q);
          if (o.onAnswer) o.onAnswer(q, good);
          if (q.say && !isHe(t)) HQ.tts.speak(q.say, 'he');
          after.appendChild(el('div.fb.' + (good ? 'ok' : 'bad'), {}, good ? HQ.t('Верно! 👍') : HQ.t('Почти! Правильно: '), good ? null : el('span' + (isHe(q.opts[q.a]) ? '.he' : ''), { text: q.opts[q.a] }), q.why ? el('span', { style: 'display:block;font-weight:500;margin-top:4px' }, HQ.rich(q.why)) : null));
          after.appendChild(el('button.btn.primary', { onclick: function () { i++; step(); } }, i + 1 >= o.qs.length ? HQ.t('Результат ›') : HQ.t('Дальше ›')));
        } }, t);
        box.appendChild(b);
      });
    }
    function finish() {
      var pct = Math.round(ok / o.qs.length * 100);
      if (o.onDone) { var custom = o.onDone(pct, ok, wrong, root); if (custom) return; }
      root.appendChild(el('div.card.center', {}, el('div.score' + (pct >= 80 ? '.ok' : ''), { text: pct + '%' }), el('div.muted', { style: 'margin-top:6px', text: ok + HQ.t(' из ') + o.qs.length + HQ.t(' правильно') }),
        el('div', { style: 'font-weight:700;margin-top:10px', text: pct >= 90 ? HQ.t('Отлично! 🎉') : pct >= 70 ? HQ.t('Хорошо получается!') : HQ.t('Стоит перечитать объяснение и попробовать ещё раз') })));
      root.appendChild(el('div.stack', {}, el('button.btn.primary', { onclick: function () { i = 0; ok = 0; wrong = []; if (o.reshuffle) o.qs = o.reshuffle(); step(); } }, HQ.t('Ещё раз')), el('button.btn', { onclick: function () { HQ.go(o.back); } }, HQ.t('Назад'))));
    }
    step();
  }
  HQ.quiz = quiz;

  /* ================= grammar ================= */
  function pick(o) { if (o == null || typeof o !== 'object' || Array.isArray(o)) return o; var u = HQ.lang().ui; return o[u] != null ? o[u] : o[Object.keys(o)[0]]; }
  /* the trilingual course files -> the lesson shape used by the original Russian course */
  function normalize(raw) {
    if (Array.isArray(raw)) return raw;
    return raw.lessons.map(function (l) {
      return { id: l.id, level: l.level, title: pick(l.title), text: pick(l.text) || [],
        table: l.table ? { head: pick(l.table.head), rows: l.table.rows.map(function (r) { return r.map(pick); }) } : null,
        examples: (l.examples || []).map(function (x) { return { he: x.t, nq: x.nq || '', tr: x.p ? pick(x.p) || '' : '', ru: pick(x.m) || '' }; }),
        quiz: (l.quiz || []).map(function (q) { return { q: pick(q.q), opts: q.opts, a: q.a, why: pick(q.why) }; }) };
    });
  }
  var gfile = 'grammar';
  function gkey(id) { return (gfile === 'grammar' ? '' : gfile + ':') + id; }
  V.grammar = function (root, a) {
    gfile = HQ.grammarFile() || 'grammar';
    var learn = HQ.lang().learn, isT = function (c) { return typeof c === 'string' && TS[learn].test(c) && (learn !== 'en' || HQ.lang().ui === 'he' || !TS.ru.test(c)); };
    HQ.wait(root, HQ.loadExtra(gfile).then(normalize), function (G) {
      var les = a[0] ? G.filter(function (l) { return l.id === a[0]; })[0] : null;
      if (!les) { glist(root, G); return; }
      if (a[1] === 'quiz') {
        quiz(root, { title: les.title, sub: HQ.t('Упражнение'), back: '/grammar/' + les.id,
          qs: les.quiz.map(function (q) { return { text: q.q, opts: q.opts, a: q.a, why: q.why, mute: false, sl: learn }; }),
          onDone: function (pct) { St.grammar(gkey(les.id), pct); } });
        return;
      }
      root.appendChild(HQ.top(les.title, HQ.t('Грамматика · ') + les.level, '/grammar'));
      var c = el('div.card.prose'); les.text.forEach(function (p) { c.appendChild(HQ.rich(p, 'p')); }); root.appendChild(c);
      if (les.table) {
        var t = el('table.tb'), tr = el('tr'); les.table.head.forEach(function (h) { tr.appendChild(el('th', { text: h })); }); t.appendChild(tr);
        les.table.rows.forEach(function (r) { var x = el('tr'); r.forEach(function (cell) { var tg = isT(cell); x.appendChild(el('td' + (tg ? '.tap' : ''), tg ? { onclick: function () { HQ.tts.sayText(cell, learn); } } : {}, tg ? el('span' + HQ.tc(), { text: cell }) : cell)); }); t.appendChild(x); });
        root.appendChild(el('div.card', { style: 'overflow-x:auto' }, t));
      }
      if (les.examples && les.examples.length) {
        var e = el('div.card', {}, el('div', { style: 'font-weight:800', text: HQ.t('Примеры') }));
        les.examples.forEach(function (x) {
          var shown = learn === 'he' ? ((St.set('nq') && x.nq) ? x.nq : x.he) : learn === 'ru' && !St.set('nq') ? HQ.noAcc(x.he) : x.he;
          e.appendChild(el('div.ex', {}, el('button.sp', { onclick: function () { HQ.tts.sayText(learn === 'he' ? (x.nq || x.he) : x.he, learn); } }, '🔊'),
            el('div.b', {}, el('div' + HQ.tc(), { text: shown }), x.tr ? el('div.tr', { text: x.tr }) : null, el('div.ru' + HQ.mc(), {}, HQ.rich(x.ru)))));
        });
        root.appendChild(e);
      }
      var best = St.grammar(gkey(les.id));
      root.appendChild(el('button.btn.primary', { onclick: function () { HQ.go('/grammar/' + les.id + '/quiz'); } }, HQ.t('Упражнение (') + les.quiz.length + HQ.t(' вопросов)') + (best != null ? HQ.t(' · лучший ') + best + '%' : '')));
      var idx = G.indexOf(les);
      if (G[idx + 1]) root.appendChild(el('button.btn', { style: 'margin-top:10px', onclick: function () { HQ.go('/grammar/' + G[idx + 1].id); } }, HQ.t('Следующий урок: ') + G[idx + 1].title + ' ›'));
    });
  };
  function glist(root, G) {
    root.appendChild(HQ.top(HQ.t('Грамматика'), HQ.n(G.length, 'урок', 'урока', 'уроков'), '/'));
    var lv = null;
    G.forEach(function (l, i) {
      if (l.level !== lv) { lv = l.level; root.appendChild(el('div.grp', { text: HQ.t('Уровень ') + lv })); }
      var b = St.grammar(gkey(l.id));
      root.appendChild(el('button.catrow', { onclick: function () { HQ.go('/grammar/' + l.id); } },
        el('div.ring', { style: '--p:' + (b || 0), 'data-t': b != null ? b + '%' : (i + 1) }), el('div.t', { text: l.title }), el('div.n', { text: '›' })));
    });
  }

  /* ================= verb conjugation ================= */
  var PR = { ms: 'я/ты/он', fs: 'я/ты/она', mp: 'мы/вы/они', fp: 'мы/вы/они (ж)' };
  var PP = { '1s': 'я', '2ms': 'ты (м)', '2fs': 'ты (ж)', '3ms': 'он', '3fs': 'она', '1p': 'мы', '2p': 'вы', '3p': 'они' };
  var PI = { ms: 'ты (м)!', fs: 'ты (ж)!', p: 'вы!' };
  var TENSES = [['present', 'Настоящее', PR], ['past', 'Прошедшее', PP], ['future', 'Будущее', PP], ['imp', 'Повелительное', PI]];
  V.conj = function (root, a) {
    HQ.wait(root, HQ.loadExtra('conj'), function (C) {
      if (a[0] === 'quiz') { conjQuiz(root, C, a[1] != null ? [C[+a[1]]] : C, a[1] != null ? '/conj/' + a[1] : '/conj'); return; }
      var v = a[0] != null ? C[+a[0]] : null;
      if (!v) {
        root.appendChild(HQ.top('Спряжение глаголов', HQ.n(C.length, 'глагол', 'глагола', 'глаголов'), '/'));
        root.appendChild(el('button.btn.primary', { style: 'margin-bottom:14px', onclick: function () { HQ.go('/conj/quiz'); } }, 'Тренировка форм (10 вопросов)'));
        var b = null;
        C.map(function (x, i) { return [x, i]; }).sort(function (p, q) { return p[0].binyan < q[0].binyan ? -1 : p[0].binyan > q[0].binyan ? 1 : p[1] - q[1]; }).forEach(function (p) {
          if (p[0].binyan !== b) { b = p[0].binyan; root.appendChild(el('div.grp', {}, 'Биньян ', el('span.he', { text: b }))); }
          root.appendChild(el('button.catrow', { onclick: function () { HQ.go('/conj/' + p[1]); } }, el('div.t', {}, el('span.he', { style: 'font-size:1.25em;font-weight:700', text: St.set('nq') ? p[0].inf_nq : p[0].inf }), el('div.muted', { style: 'font-size:.8em;font-weight:500', text: p[0].tr + ' — ' + p[0].ru })), el('div.n', { text: '›' })));
        });
        return;
      }
      root.appendChild(HQ.top(v.ru, 'корень ' + v.root + ' · ' + v.binyan, '/conj'));
      root.appendChild(el('div.stage', {}, el('div.hw.he', { text: St.set('nq') ? v.inf_nq : v.inf }), el('div.tr', { text: v.tr }), el('button.say', { onclick: function () { HQ.tts.speak(v.inf_nq, 'he'); } }, '🔊 Послушать')));
      if (v.note) root.appendChild(el('div.note.info', {}, HQ.rich(v.note)));
      TENSES.forEach(function (t) {
        if (!v[t[0]]) return;
        var tb = el('table.tb'), any = false;
        Object.keys(t[2]).forEach(function (k) {
          var f = v[t[0]][k]; if (!f || f[0] === '—') return; any = true;
          tb.appendChild(el('tr', {}, el('th', { style: 'width:34%', text: t[2][k] }), el('td.tap', { onclick: function () { HQ.tts.speak(f[1] || f[0], 'he'); } }, el('span.he', { text: St.set('nq') ? (f[1] || f[0]) : f[0] }), el('small', { text: f[2] }))));
        });
        if (any) root.appendChild(el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:6px', text: t[1] }), tb));
      });
      root.appendChild(el('button.btn.primary', { onclick: function () { HQ.go('/conj/quiz/' + a[0]); } }, 'Проверить себя по этому глаголу'));
    });
  };
  function conjQuiz(root, C, verbs, back) {
    function make() {
      var qs = [];
      for (var n = 0; n < 10; n++) {
        var v = verbs[Math.floor(Math.random() * verbs.length)], t = TENSES[Math.floor(Math.random() * (St.full() ? 4 : 2))];
        var real = function (tt) { return v[tt[0]] && Object.keys(tt[2]).some(function (k) { return v[tt[0]][k] && v[tt[0]][k][0] !== '—'; }); };
        if (!real(t)) { t = TENSES[1]; }
        var keys = Object.keys(t[2]).filter(function (k) { return v[t[0]][k] && v[t[0]][k][0] !== '—'; }), k = keys[Math.floor(Math.random() * keys.length)];
        var right = v[t[0]][k][0], pool = {};
        TENSES.forEach(function (tt) { if (v[tt[0]]) Object.keys(v[tt[0]]).forEach(function (kk) { var f = v[tt[0]][kk][0]; if (f !== right && f !== '—') pool[f] = 1; }); });
        var opts = HQ.shuffle([right].concat(HQ.sample(Object.keys(pool), 3)));
        qs.push({ ask: t[1] + ' время'.replace('Повелительное время', 'Повелительное'), text: t[2][k] + ' — ' + v.ru, sub: v.inf + ' · ' + v.tr, opts: opts, a: opts.indexOf(right), why: v[t[0]][k][2], cols: true });
      }
      return qs;
    }
    quiz(root, { title: 'Формы глаголов', sub: 'Выберите нужную форму', back: back, qs: make(), reshuffle: make });
  }

  /* ================= letters: print and handwriting ================= */
  var SOFIT = [['ך', 'хаф со́фит', 'כ в конце слова'], ['ם', 'мем со́фит', 'מ в конце слова'], ['ן', 'нун со́фит', 'נ в конце слова'], ['ף', 'фей со́фит', 'פ в конце слова'], ['ץ', 'ца́ди со́фит', 'צ в конце слова']];
  var LOOK = [['ב', 'כ'], ['ד', 'ר'], ['ה', 'ח'], ['ח', 'ת'], ['ו', 'ז'], ['ו', 'ן'], ['ס', 'ם'], ['ג', 'נ'], ['ט', 'מ'], ['ע', 'צ'], ['כ', 'פ'], ['י', 'ו']];
  var HWORDS = ['שלום', 'תודה', 'בבקשה', 'אמא', 'אבא', 'בית', 'מים', 'לחם', 'חלב', 'רופא', 'תור', 'מחר', 'היום', 'כן', 'לא', 'שבת', 'בוקר טוב', 'מה שלומך', 'אני בבית', 'להתראות', 'סבתא', 'ילדים', 'כסף', 'טלפון', 'רחוב', 'מספר', 'שעה', 'חנות', 'פתוח', 'סגור'];
  V.letters = function (root, a) {
    var hand = a[0] === 'hand', base = '/letters/' + (hand ? 'hand' : 'print');
    HQ.wait(root, HQ.loadExtra('letters'), function (L) {
      var all = L.map(function (l) { return { ch: l.ch, name: l.name, hint: l.hint, say: l.nq }; }).concat(SOFIT.map(function (s) { return { ch: s[0], name: s[1], hint: s[2], say: '' }; }));
      if (a[1] === 'quiz') { letterQuiz(root, all, hand, base, a[2]); return; }
      root.appendChild(HQ.top(hand ? 'Письменные буквы' : 'Алфавит', hand ? 'Так пишут от руки' : '22 буквы + 5 конечных', '/'));
      root.appendChild(el('div.note.info', { text: hand ? 'В Израиле от руки пишут другим шрифтом — письменным. Им написаны записки, рецепты, ценники на рынке. Нажмите на букву, чтобы сравнить печатную и письменную.' : 'Иврит читается справа налево. Гласных букв почти нет — их подсказывают точки (огласовки). Нажмите на букву, чтобы услышать её название.' }));
      var view = el('div.stage', {}, el('div.muted', { text: 'Нажмите на букву ниже' })); root.appendChild(view);
      var grid = el('div.lgrid'); root.appendChild(grid);
      all.forEach(function (l) {
        grid.appendChild(el('button.lcell', { onclick: function () {
          view.innerHTML = '';
          view.appendChild(el('div', { style: 'display:flex;justify-content:center;gap:34px;align-items:flex-end' },
            el('div', {}, el('div.hw.he', { style: 'font-size:4.2em;line-height:1.1', text: l.ch }), el('div.muted', { style: 'font-size:.7em', text: 'печатная' })),
            hand ? el('div', {}, el('div.hw.hand', { style: 'font-size:4.2em;line-height:1.1', text: l.ch }), el('div.muted', { style: 'font-size:.7em', text: 'письменная' })) : null));
          view.appendChild(el('div.tr', { text: l.name })); view.appendChild(el('div.nt', { text: l.hint }));
          if (l.say) { view.appendChild(el('button.say', { onclick: function () { HQ.tts.speak(l.say, 'he'); } }, '🔊 Название')); HQ.tts.speak(l.say, 'he'); }
          view.scrollIntoView({ block: 'nearest' });
        } }, el('div.g' + (hand ? '.hand' : '.he'), { text: l.ch }), el('div.n', { text: l.name.split(' ')[0] })));
      });
      root.appendChild(el('div.label', { text: 'Проверка' }));
      var st = el('div.stack'); root.appendChild(st);
      if (hand) {
        st.appendChild(el('button.btn.primary', { onclick: function () { HQ.go(base + '/quiz/letters'); } }, 'Письменная буква → печатная'));
        st.appendChild(el('button.btn', { onclick: function () { HQ.go(base + '/quiz/words'); } }, 'Прочитать слово, написанное от руки'));
      } else {
        st.appendChild(el('button.btn.primary', { onclick: function () { HQ.go(base + '/quiz/letters'); } }, 'Какая это буква?'));
        st.appendChild(el('button.btn', { onclick: function () { HQ.go(base + '/quiz/look'); } }, 'Похожие буквы (ב/כ, ד/ר, ה/ח…)'));
        st.appendChild(el('button.btn', { onclick: function () { HQ.go(base + '/quiz/sound'); } }, 'На слух: какая буква прозвучала?'));
      }
    });
  };
  function letterQuiz(root, all, hand, back, kind) {
    function make() {
      var qs = [];
      if (kind === 'words') {
        HQ.sample(HWORDS, 10).forEach(function (w) { var o = HQ.shuffle([w].concat(HQ.sample(HWORDS.filter(function (x) { return x !== w; }), 3))); qs.push({ ask: 'Что здесь написано от руки?', big: w, bigCls: '.hand', opts: o, a: o.indexOf(w), say: w, cols: true }); });
      } else if (kind === 'look') {
        HQ.shuffle(LOOK).slice(0, 10).forEach(function (p) {
          var t = p[Math.floor(Math.random() * 2)], L = all.filter(function (l) { return l.ch === t; })[0], o = HQ.shuffle(p.slice().concat(HQ.sample(all.filter(function (l) { return p.indexOf(l.ch) < 0; }), 2).map(function (l) { return l.ch; })));
          qs.push({ ask: 'Где буква «' + L.name.split(' ')[0] + '»?', text: L.hint, opts: o, a: o.indexOf(t), cols: true, mute: true });
        });
      } else if (kind === 'sound') {
        HQ.sample(all.filter(function (l) { return l.say; }), 10).forEach(function (l) { var o = HQ.shuffle([l].concat(HQ.sample(all.filter(function (x) { return x !== l && x.say; }), 3))).map(function (x) { return x.ch; }); qs.push({ ask: 'Какая буква прозвучала?', say: l.say, text: '🔊', opts: o, a: o.indexOf(l.ch), cols: true, mute: true, why: l.name }); });
      } else {
        HQ.sample(all, 12).forEach(function (l) {
          if (hand) { var o = HQ.shuffle([l].concat(HQ.sample(all.filter(function (x) { return x !== l; }), 3))).map(function (x) { return x.ch; }); qs.push({ ask: 'Какая это печатная буква?', big: l.ch, bigCls: '.hand', opts: o, a: o.indexOf(l.ch), cols: true, mute: true, why: l.name }); }
          else { var o2 = HQ.shuffle([l].concat(HQ.sample(all.filter(function (x) { return x !== l; }), 3))).map(function (x) { return x.name; }); qs.push({ ask: 'Как называется буква?', big: l.ch, opts: o2, a: o2.indexOf(l.name), say: l.say, why: l.hint }); }
        });
      }
      return qs;
    }
    quiz(root, { title: hand ? 'Письменные буквы' : 'Алфавит', sub: 'Проверка', back: back, qs: make(), reshuffle: make });
  }

  /* ================= alphabet of Russian / English ================= */
  V.abc = function (root, a) {
    var L = HQ.lang(), f = 'letters-' + L.learn;
    HQ.wait(root, HQ.loadExtra(f), function (A) {
      if (a[0] === 'quiz') { abcQuiz(root, A, a[1]); return; }
      root.appendChild(HQ.top(HQ.t('Алфавит'), HQ.n(A.length, 'буква', 'буквы', 'букв'), '/'));
      var view = el('div.stage', {}, el('div.muted', { text: HQ.t('Нажмите на букву ниже') })); root.appendChild(view);
      var grid = el('div.lgrid'); root.appendChild(grid);
      A.forEach(function (l) {
        grid.appendChild(el('button.lcell', { onclick: function () {
          view.innerHTML = '';
          view.appendChild(el('div.hw.tg', { style: 'font-size:3.6em;line-height:1.1', text: l.ch }));
          view.appendChild(el('div.tr' + HQ.mc(), { text: pick(l.name) || '' }));
          view.appendChild(el('div.nt' + HQ.mc(), { text: pick(l.sound) || '' }));
          if (l.ex) view.appendChild(el('button.say', { onclick: function () { HQ.tts.sayText(l.ex.w, L.learn); } }, '🔊 ', el('span.tg', { text: l.ex.w }), ' — ', el('span' + HQ.mc(), { text: l.ex[L.ui] || '' })));
          HQ.tts.sayText(l.say || l.ch, L.learn);
          view.scrollIntoView({ block: 'nearest' });
        } }, el('div.g.tg', { text: l.ch }), el('div.n' + HQ.mc(), { text: pick(l.name) || '' })));
      });
      root.appendChild(el('div.label', { text: HQ.t('Проверка') }));
      root.appendChild(el('div.stack', {},
        el('button.btn.primary', { onclick: function () { HQ.go('/abc/quiz/sound'); } }, HQ.t('На слух: какая буква прозвучала?')),
        el('button.btn', { onclick: function () { HQ.go('/abc/quiz/word'); } }, HQ.t('С какой буквы начинается слово?'))));
    });
  };
  function abcQuiz(root, A, kind) {
    var L = HQ.lang();
    function make() {
      return HQ.sample(A.filter(function (l) { return kind !== 'word' || l.ex; }), 10).map(function (l) {
        var o = HQ.shuffle([l].concat(HQ.sample(A.filter(function (x) { return x !== l; }), 3))).map(function (x) { return x.ch; });
        if (kind === 'word') return { ask: HQ.t('С какой буквы начинается слово?'), big: l.ex.w, bigCls: '.tg', sub: l.ex[L.ui] || '', opts: o, a: o.indexOf(l.ch), cols: true, mute: true };
        return { ask: HQ.t('Какая буква прозвучала?'), text: '🔊', opts: o, a: o.indexOf(l.ch), cols: true, mute: true, why: pick(l.name), sayL: l.say || l.ch };
      });
    }
    quiz(root, { title: HQ.t('Алфавит'), sub: HQ.t('Проверка'), back: '/abc', qs: make(), reshuffle: make });
  }

  /* ================= placement tests ================= */
  var TH = { gr: ['Приветствие и общение', 'phrases'], fd: ['Еда и магазин', 'shopping'], bd: ['Тело и здоровье', 'health'], hm: ['Дом и быт', 'home'], ct: ['Город и транспорт', 'city'], pp: ['Люди и эмоции', 'people'], tm: ['Время и числа', 'core'], en: ['Инженерный иврит', 'engineer'],
    ev: ['Бытовые идиомы', 'b2'], sl: ['Разговорный сленг', 'b2'], pg: ['Поговорки', 'b2'], id: ['Образные выражения', 'b2'] };
  var LV = ['A0', 'A1', 'A2', 'B1', 'B2'];
  V.test = function (root, a) {
    var which = a[0] === 'idioms' ? 'idioms' : 'level', back = '/test/' + which;
    HQ.wait(root, HQ.loadExtra('test-' + which), function (Q) {
      if (a[1] !== 'go') {
        root.appendChild(HQ.top(which === 'level' ? 'Проверка уровня' : 'Идиомы и сленг', '', '/'));
        root.appendChild(el('div.card.prose', {},
          el('p', { html: which === 'level' ? '<b>' + Q.length + ' вопроса</b> по 8 темам, от простых слов (A1) до сложных (B2). Около 12 минут, без таймера.' : '<b>' + Q.length + ' выражения</b>: бытовые идиомы, сленг, поговорки. Нужно понять переносный смысл.' }),
          el('p', { text: 'В конце вы увидите результат по каждой теме и что стоит подучить.' })));
        var ex = St.exam('test/' + which);
        if (ex) root.appendChild(el('div.note.info', { text: 'Прошлый результат: ' + ex.last + '% · лучший: ' + ex.best + '%' }));
        root.appendChild(el('button.btn.primary', { onclick: function () { HQ.go(back + '/go'); } }, 'Начать ›'));
        return;
      }
      var lvl = which === 'level', ans = [];
      var qs = Q.map(function (q) {
        var th = q[0], he = lvl ? q[2] : q[1], tr = lvl ? q[3] : q[2], right = lvl ? q[4] : q[3], wr = lvl ? q[5] : q[4], o = HQ.shuffle([right].concat(wr));
        return { ask: TH[th] ? TH[th][0] : '', big: he, sub: tr, say: he, opts: o, a: o.indexOf(right), th: th, lv: lvl ? q[1] : '' };
      });
      quiz(root, { title: lvl ? 'Проверка уровня' : 'Идиомы и сленг', back: back, qs: qs,
        onAnswer: function (q, good) { ans.push({ th: q.th, lv: q.lv, ok: good }); },
        onDone: function (pct, ok, wrong, host) {
          St.exam('test/' + which, pct);
          var ths = []; ans.forEach(function (x) { if (ths.indexOf(x.th) < 0) ths.push(x.th); });
          var rows = ths.map(function (t) {
            var mine = ans.filter(function (x) { return x.th === t; }), good = mine.filter(function (x) { return x.ok; }).length, got = 0;
            if (lvl) { for (var i = 1; i < 5; i++) { var at = mine.filter(function (x) { return x.lv === LV[i]; }); if (at.length && at.filter(function (x) { return x.ok; }).length / at.length >= 0.5) got = i; else break; } }
            return { t: t, good: good, n: mine.length, lv: got };
          });
          var overall = '';
          if (lvl) { var s = rows.map(function (r) { return r.lv; }).sort(function (x, y) { return x - y; }); overall = LV[s[Math.floor(s.length / 2)]]; }
          host.appendChild(el('div.card.center', {}, el('div.score', { text: pct + '%' }), el('div.muted', { style: 'margin-top:6px', text: ok + ' из ' + qs.length + ' правильно' }),
            lvl ? el('div', { style: 'font-weight:800;font-size:1.2em;margin-top:10px', text: 'Ваш уровень: ' + overall }) : null));
          var c = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: 'По темам' }));
          rows.slice().sort(function (x, y) { return x.good / x.n - y.good / y.n; }).forEach(function (r) {
            c.appendChild(el('div.lrow', {}, el('div.t', { text: TH[r.t][0] }), el('div.bar', {}, el('i', { style: 'width:' + (r.good / r.n * 100) + '%' })), el('div.n', { text: (lvl ? LV[r.lv] + ' · ' : '') + r.good + '/' + r.n })));
          });
          host.appendChild(c);
          var weak = rows.slice().sort(function (x, y) { return x.good / x.n - y.good / y.n; }).filter(function (r) { return r.good < r.n; }).slice(0, 3), seen = {};
          if (weak.length) {
            host.appendChild(el('div.label', { text: 'Рекомендуем подучить' }));
            weak.forEach(function (r) { var d = TH[r.t][1], m = HQ.manifest.decks[d]; if (!m || seen[d]) return; seen[d] = 1; host.appendChild(el('button.catrow', { onclick: function () { HQ.go('/deck/' + d); } }, el('div.t', { text: m.title }), el('div.n', { text: 'Открыть ›' }))); });
          }
          host.appendChild(el('div.stack', { style: 'margin-top:12px' }, el('button.btn.primary', { onclick: function () { HQ.go(back); } }, 'Готово')));
          return true;
        } });
    });
  };
})();
