/* Hebrew Quiz — screens: home, deck, word list, settings, stats, mistakes. © Shimon Donen, 2026 */
(function () {
  'use strict';
  var HQ = window.HQ, el = HQ.el, V = HQ.views, St = HQ.store;

  function deckMeta(id) { return HQ.manifest.decks[id]; }

  /* ---------------- voice check ---------------- */
  HQ.voiceNote = function (host) {
    var box = el('div'); host.appendChild(box);
    var tries = 0;
    (function check() {
      var st = HQ.tts.has('he');
      if (st === 'wait' && tries++ < 14) { setTimeout(check, 300); return; }
      if (!box.parentNode) return;
      if (st === 'yes') return;
      box.appendChild(el('div.note.warn', {},
        el('b', { text: '🔇 Голос иврита не найден' }),
        el('div', { text: 'Без него слова не будут звучать. Как установить, написано в настройках.' }),
        el('button.btn.small', { style: 'margin-top:10px', onclick: function () { HQ.go('/settings/voice'); } }, 'Как включить звук')));
    })();
  };

  /* ---------------- home ---------------- */
  V.home = function (root) {
    var M = HQ.manifest, full = St.full(), learned = St.totalLearned(), d = St.days()[HQ.today()] || { n: 0 };
    var last = St.set('last');
    var hero = el('div.hero',
      el('div.t', { text: 'Учим иврит' }),
      el('div.d', { text: learned ? 'Продолжайте в своём темпе' : 'Начните с алфавита или проверьте свой уровень' }),
      el('div.row',
        el('div.pill', {}, el('b', { text: learned }), 'слов выучено'),
        el('div.pill', {}, el('b', { text: d.n }), 'ответов сегодня')),
      (last && M.decks[last]) ? el('button.go', { onclick: function () { HQ.go('/deck/' + last); } }, 'Продолжить: ' + M.decks[last].title + ' ›') : null);
    root.appendChild(el('div.top', {}, el('h1', {}, ''), el('button.icon-btn', { 'aria-label': 'Настройки', onclick: function () { HQ.go('/settings'); } }, '⚙️')));
    root.firstChild.style.marginBottom = '4px';
    root.appendChild(hero);
    HQ.voiceNote(root);
    if (HQ.ios && !HQ.standalone && /^https?:/.test(location.protocol) && !St.set('iosHint')) {
      var hint = el('div.note.info', {},
        el('b', { text: '📲 Поставить на экран «Домой»' }),
        el('div', { text: 'Нажмите внизу Safari кнопку «Поделиться» (квадрат со стрелкой вверх), затем «На экран Домой». Появится значок, как у обычного приложения, и оно будет работать без интернета.' }),
        el('button.btn.small', { style: 'margin-top:10px', onclick: function () { St.set('iosHint', 1); hint.parentNode.removeChild(hint); } }, 'Понятно'));
      root.appendChild(hint);
    }

    M.sections.forEach(function (sec) {
      if (sec.full && !full) return;
      var items = sec.items.filter(function (it) { return (full || !it.full) && (it.type !== 'deck' || M.decks[it.id]) && (it.type !== 'grammar' || M.extras.grammar) && (it.type !== 'conj' || M.extras.conj); });
      if (!items.length) return;
      root.appendChild(el('div.sec', {}, el('div.t', { text: sec.title }), sec.hint ? el('div.h', { text: sec.hint }) : null));
      var grid = el('div.tiles'); root.appendChild(grid);
      items.forEach(function (it) { grid.appendChild(tile(it)); });
    });
    if (!full) {
      root.appendChild(el('div.sec', {}, el('div.t', { text: 'Ещё' })));
      root.appendChild(el('button.btn.soft', { onclick: function () { St.set('mode', 'full'); HQ.render(); } }, 'Показать продвинутые разделы (B2, инженерный)'));
    }
    root.appendChild(el('div.foot', { html: '© Shimon Donen, 2026 · ' + M.total + ' слов и фраз · обновлено ' + M.built }));
  };
  function tile(it) {
    var m = it.type === 'deck' ? deckMeta(it.id) : null, title = it.title || (m && m.title), num = '', pct = 0, path;
    if (it.type === 'deck') { var n = St.learnedIn(it.id); pct = m.n ? n / m.n * 100 : 0; num = n + ' / ' + m.n; path = '/deck/' + it.id; }
    else if (it.type === 'letters') path = '/letters/' + it.id;
    else if (it.type === 'grammar') path = '/grammar';
    else if (it.type === 'conj') path = '/conj';
    else if (it.type === 'test') path = '/test/' + it.id;
    else if (it.type === 'mistakes') { path = '/mistakes'; num = String(St.mistakes().length || ''); }
    else if (it.type === 'stats') path = '/stats';
    var isHe = /[א-ת]/.test(it.icon);
    return el('button.tile', { onclick: function () { HQ.go(path); } },
      el('div.ic' + (isHe ? '.he' : ''), { text: it.icon }),
      el('div.b', {},
        el('div.t', {}, title, m ? el('span.lv', { text: m.level }) : null),
        el('div.d', { text: it.desc || '' })),
      num ? el('div.num', { text: num }) : null,
      pct ? el('i.pr', { style: 'width:' + pct + '%' }) : null);
  }

  /* ---------------- deck ---------------- */
  var MODES = [
    { k: 'cards', e: '🃏', t: 'Карточки', d: 'Учим новые слова' },
    { k: 'choice', e: '✅', t: 'Выбор', d: 'Выберите перевод' },
    { k: 'listen', e: '👂', t: 'На слух', d: 'Услышать и узнать' },
    { k: 'build', e: '🧱', t: 'Собери', d: 'Слово из букв, фраза из слов' },
    { k: 'match', e: '🔗', t: 'Найди пару', d: 'Соединить слово и перевод' }
  ];
  V.deck = function (root, a) {
    var id = a[0], ci = (a[1] == null || a[1] === '' || a[1] === 'all') ? -1 : parseInt(a[1], 10), m = deckMeta(id);
    if (!m) { HQ.go('/'); return; }
    St.set('last', id);
    root.appendChild(HQ.top(m.title, m.level + ' · ' + HQ.plural(m.n, 'слово', 'слова', 'слов'), '/'));
    HQ.wait(root, HQ.loadDeck(id), function (deck) {
      if (!(ci >= 0 && ci < deck.cats.length)) ci = -1;
      var items = ci < 0 ? deck.all : deck.cats[ci].items, name = ci < 0 ? 'Вся тема' : deck.cats[ci].title;
      var known = St.learnedIn(id, items);
      root.appendChild(el('div.card', {},
        el('div', { style: 'display:flex;align-items:center;gap:12px' },
          ring(known, items.length),
          el('div', { style: 'flex:1' }, el('div', { style: 'font-weight:700', text: name }),
            el('div.muted', { style: 'font-size:.8em', text: 'Выучено ' + known + ' из ' + items.length })))));
      var grid = el('div.modes'); root.appendChild(grid);
      MODES.forEach(function (mo) {
        grid.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: mo.k, deck: deck, cat: ci, items: items, title: name, back: '/deck/' + id + (ci < 0 ? '' : '/' + ci) }); } },
          el('div.e', { text: mo.e }), el('div.t', { text: mo.t }), el('div.d', { text: mo.d })));
      });
      var ex = St.exam(id + '/' + ci);
      grid.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: 'exam', deck: deck, cat: ci, items: items, title: 'Экзамен: ' + name, back: '/deck/' + id + (ci < 0 ? '' : '/' + ci), examKey: id + '/' + ci }); } },
        el('div.e', { text: '🎓' }), el('div.t', { text: 'Экзамен' }), el('div.d', { text: ex ? 'Лучший результат: ' + ex.best + '%' : 'Проверка по теме' })));
      grid.appendChild(el('button.mode.wide', { onclick: function () { HQ.go('/list/' + id + (ci < 0 ? '' : '/' + ci)); } },
        el('div.e', { text: '📖' }), el('div', {}, el('div.t', { style: 'margin:0', text: 'Список слов' }), el('div.d', { text: 'Все слова раздела с озвучкой' }))));

      root.appendChild(el('div.label', { text: 'Разделы темы' }));
      root.appendChild(catRow('Вся тема', St.learnedIn(id, deck.all), deck.all.length, ci < 0, function () { HQ.go('/deck/' + id); }));
      var g = null;
      deck.cats.forEach(function (c, i) {
        if (c.group && c.group !== g) { g = c.group; root.appendChild(el('div.grp', { text: g })); }
        root.appendChild(catRow(c.title, St.learnedIn(id, c.items), c.items.length, ci === i, function () { HQ.go('/deck/' + id + '/' + i); }));
      });
    });
  };
  function ring(k, n) { var p = n ? Math.round(k / n * 100) : 0; return el('div.ring', { style: '--p:' + p, 'data-t': p + '%' }); }
  function catRow(t, k, n, on, fn) {
    return el('button.catrow' + (on ? '.on' : ''), { onclick: fn }, ring(k, n), el('div.t', { text: t }), el('div.n', { text: k + ' / ' + n }));
  }

  /* ---------------- word list ---------------- */
  V.list = function (root, a) {
    var id = a[0], ci = a[1] == null ? -1 : parseInt(a[1], 10), m = deckMeta(id);
    if (!m) { HQ.go('/'); return; }
    root.appendChild(HQ.top('Список слов', m.title, '/deck/' + id + (ci < 0 ? '' : '/' + ci)));
    HQ.wait(root, HQ.loadDeck(id), function (deck) {
      (ci < 0 ? deck.cats : [deck.cats[ci]]).forEach(function (c) {
        var card = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: c.title }));
        c.items.forEach(function (it) { card.appendChild(HQ.wordRow(it)); });
        root.appendChild(card);
      });
    });
  };
  HQ.wordRow = function (it) {
    return el('div.ex', {},
      el('button.sp', { 'aria-label': 'Послушать', onclick: function () { HQ.tts.say(it); } }, '🔊'),
      el('div.b', {},
        el('div.he', { text: (it.em ? it.em + ' ' : '') + HQ.heb(it) }),
        el('div.tr', { text: it.tr }),
        el('div.ru', { text: it.ru + (it.note ? ' — ' + it.note : '') })),
      St.learned(it.id) ? el('span', { title: 'выучено', text: '✅' }) : null);
  };

  /* ---------------- settings ---------------- */
  function seg(key, opts) {
    var s = el('div.seg'), cur = St.set(key);
    opts.forEach(function (o) { s.appendChild(el('button' + (cur === o[0] ? '.on' : ''), { onclick: function () { St.set(key, o[0]); HQ.render(); } }, o[1])); });
    return s;
  }
  V.settings = function (root, a) {
    root.appendChild(HQ.top('Настройки', '', function () { HQ.back('/'); }));
    root.lastChild.lastChild.remove();
    var c = el('div.card.stack');
    c.appendChild(el('div.label', { style: 'margin-top:0', text: 'Режим' }));
    c.appendChild(seg('mode', [['simple', 'Простой'], ['full', 'Полный']]));
    c.appendChild(el('div.muted', { style: 'font-size:.78em', text: 'Простой: только самое нужное, короткие занятия. Полный: все разделы, B2, инженерный, длинные тренировки.' }));
    c.appendChild(el('div.label', { text: 'Огласовки (точки под буквами)' }));
    c.appendChild(seg('nq', [[true, 'Показывать'], [false, 'Без огласовок']]));
    c.appendChild(el('div.label', { text: 'Направление в упражнениях' }));
    c.appendChild(seg('dir', [['mix', 'Вперемешку'], ['he-ru', 'Иврит → рус'], ['ru-he', 'Рус → иврит']]));
    c.appendChild(el('div.label', { text: 'Скорость речи' }));
    c.appendChild(seg('rate', [[0.55, 'Медленно'], [0.8, 'Спокойно'], [1, 'Обычно']]));
    c.appendChild(el('div.label', { text: 'Размер текста' }));
    c.appendChild(seg('size', [['m', 'Обычный'], ['l', 'Крупный'], ['xl', 'Очень крупный']]));
    c.appendChild(el('div.label', { text: 'Оформление' }));
    c.appendChild(seg('theme', [['auto', 'Как в системе'], ['light', 'Светлое'], ['dark', 'Тёмное']]));
    root.appendChild(c);

    /* voice */
    var v = el('div.card.stack', { id: 'voice' });
    v.appendChild(el('div', { style: 'font-weight:800', text: '🔊 Звук' }));
    var st = el('div.muted', { style: 'font-size:.86em' }); v.appendChild(st);
    function upd() {
      var h = HQ.tts.has('he'), r = HQ.tts.has('ru');
      st.textContent = 'Голос иврита: ' + (h === 'yes' ? 'есть ✓' : h === 'wait' ? 'проверяю…' : 'не найден') + ' · русского: ' + (r === 'yes' ? 'есть ✓' : r === 'wait' ? '…' : 'не найден');
      if (h === 'wait') setTimeout(upd, 400);
    }
    upd(); setTimeout(upd, 1600);
    v.appendChild(el('button.btn.soft', { onclick: function () { HQ.tts.speak('שָׁלוֹם, מַה שְּׁלוֹמְךָ?', 'he'); } }, 'Проверить звук'));
    if (window.AndroidTTS && typeof window.AndroidTTS.openTtsSettings === 'function')
      v.appendChild(el('button.btn', { onclick: function () { HQ.tts.openSettings(); } }, 'Открыть настройки голоса'));
    if (HQ.ios) v.appendChild(el('div.muted', { style: 'font-size:.8em', html: '<b>Если звука нет (iPhone, iPad):</b> проверьте, что выключен беззвучный режим (переключатель сбоку) и прибавьте громкость. Голос иврита в iPhone уже есть. Более приятный голос: Настройки → Универсальный доступ → Устный контент → Голоса → Иврит → загрузить «Кармит (улучшенный)».' }));
    else v.appendChild(el('div.muted', { style: 'font-size:.8em', html: '<b>Если звука нет (Android):</b> Настройки телефона → Общие настройки → Язык и ввод → Преобразование текста в речь → Google → ⚙ → Установить голосовые данные → עברית (иврит). Потом закройте и снова откройте приложение. Громкость — «мультимедиа».' }));
    root.appendChild(v);

    /* progress code */
    var p = el('div.card.stack');
    p.appendChild(el('div', { style: 'font-weight:800', text: '💾 Сохранить и перенести прогресс' }));
    p.appendChild(el('div.muted', { style: 'font-size:.82em', text: 'Код прогресса можно отправить себе в WhatsApp и вставить на другом устройстве или после переустановки.' }));
    var out = el('div.stack');
    p.appendChild(el('button.btn.soft', { id: 'pc-export-btn', onclick: function () {
      out.innerHTML = ''; var ta = el('textarea', { id: 'progresscode', readonly: '' }); ta.value = St.exportCode(); out.appendChild(ta);
      var cb = el('button.btn.primary', { onclick: function () {
        var done = function () { cb.textContent = 'Скопировано ✓'; setTimeout(function () { cb.textContent = '📋 Скопировать'; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); try { document.execCommand('copy'); } catch (e) { } done(); }
      } }, '📋 Скопировать'); out.appendChild(cb); ta.select();
    } }, 'Получить код прогресса'));
    p.appendChild(out);
    var inp = el('div.stack');
    p.appendChild(el('button.btn', { onclick: function () {
      inp.innerHTML = ''; var ta = el('textarea', { id: 'importcode', placeholder: 'Вставьте код (начинается с HQ…)' }), msg = el('div');
      inp.appendChild(ta);
      inp.appendChild(el('button.btn.primary', { onclick: function () {
        if (!/^HQ[12]:/.test(ta.value.replace(/\s+/g, ''))) { msg.className = 'note warn'; msg.textContent = 'Код не распознан. Проверьте, что он скопирован полностью.'; return; }
        if (!confirm('Восстановить прогресс из кода? Текущий прогресс на этом устройстве будет заменён.')) return;
        var n = St.importCode(ta.value);
        if (n <= 0) { msg.className = 'note warn'; msg.textContent = 'Код не распознан. Проверьте, что он скопирован полностью.'; return; }
        msg.className = 'note ok'; msg.textContent = 'Готово, прогресс восстановлен.'; setTimeout(function () { location.hash = '/'; location.reload(); }, 1200);
      } }, 'Восстановить'));
      inp.appendChild(msg);
    } }, 'Восстановить из кода'));
    p.appendChild(inp);
    root.appendChild(p);

    root.appendChild(el('button.btn.bad', { onclick: function () { if (confirm('Стереть весь прогресс на этом устройстве?')) { St.reset(); HQ.go('/'); } } }, 'Сбросить прогресс'));
    root.appendChild(el('div.foot', { html: 'Учим иврит · © Shimon Donen, 2026<br>Шрифты Rubik и Gveret Levin — SIL Open Font License' }));
    if (a[0] === 'voice') setTimeout(function () { v.scrollIntoView({ block: 'start' }); }, 30);
  };

  /* ---------------- statistics ---------------- */
  V.stats = function (root) {
    var M = HQ.manifest, days = St.days(), keys = Object.keys(days).sort();
    root.appendChild(HQ.top('Статистика', '', '/'));
    var total = St.totalLearned(), ans = 0, ok = 0; keys.forEach(function (k) { ans += days[k].n; ok += days[k].ok; });
    root.appendChild(el('div.kpis', {},
      el('div.kpi', {}, el('b', { text: total }), el('span', { text: 'слов выучено' })),
      el('div.kpi', {}, el('b', { text: keys.length }), el('span', { text: keys.length === 1 ? 'день занятий' : 'дней занятий' })),
      el('div.kpi', {}, el('b', { text: ans }), el('span', { text: 'ответов всего' }))));
    if (ans >= 20 && ok / ans >= 0.6) root.appendChild(el('div.note.ok', { text: 'Правильных ответов: ' + Math.round(ok / ans * 100) + '% — отличная работа!' }));

    var card = el('div.card', {}, el('div', { style: 'font-weight:800', text: 'Последние 14 дней' }), el('div.muted', { style: 'font-size:.76em', text: 'Сколько ответов вы дали в каждый из дней' }));
    var row = el('div.days'), mx = 1, list = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); var n = days[k] ? days[k].n : 0; mx = Math.max(mx, n); list.push([d.getDate(), n]); }
    list.forEach(function (x) { row.appendChild(el('div.d', { title: x[1] + ' ответов' }, el('i' + (x[1] ? '' : '.z'), { style: 'height:' + Math.max(3, x[1] / mx * 100) + '%' }), el('span', { text: x[0] }))); });
    card.appendChild(row); root.appendChild(card);

    var c2 = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: 'По темам' }));
    M.sections.forEach(function (s) { s.items.forEach(function (it) {
      if (it.type !== 'deck' || !M.decks[it.id]) return;
      var m = M.decks[it.id], k = St.learnedIn(it.id);
      if (!k && (s.full || it.full) && !St.full()) return;
      c2.appendChild(el('div.lrow', {}, el('div.t', { text: m.title }), el('div.bar', {}, el('i', { style: 'width:' + (m.n ? k / m.n * 100 : 0) + '%' })), el('div.n', { text: k + ' / ' + m.n })));
    }); });
    root.appendChild(c2);

    var ex = St.raw.ex, ek = Object.keys(ex);
    if (ek.length) {
      var c3 = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: 'Экзамены и тесты' }));
      ek.sort(function (a, b) { return ex[b].t - ex[a].t; }).slice(0, 12).forEach(function (key) {
        var p = key.split('/'), m = M.decks[p[0]], name = m ? m.title + (p[1] >= 0 && m.cats[p[1]] ? ' · ' + m.cats[p[1]].title : '') : (key === 'test/level' ? 'Проверка уровня' : key === 'test/idioms' ? 'Идиомы и сленг' : key);
        c3.appendChild(el('div.lrow', {}, el('div.t', { text: name }), el('div.n', { style: 'min-width:120px', text: 'лучший ' + ex[key].best + '%' })));
      });
      root.appendChild(c3);
    }
    var mi = St.mistakes().length;
    if (mi) root.appendChild(el('button.btn.soft', { onclick: function () { HQ.go('/mistakes'); } }, '🛠️ Повторить слова с ошибками (' + mi + ')'));
  };

  /* ---------------- mistakes ---------------- */
  V.mistakes = function (root) {
    root.appendChild(HQ.top('Работа над ошибками', '', '/'));
    var ids = St.mistakes();
    if (!ids.length) { root.appendChild(el('div.note.ok', { text: 'Ошибок для повторения нет. Когда вы ошибётесь в упражнении, слово появится здесь.' })); return; }
    var deckIds = {}; ids.forEach(function (id) { deckIds[id.split(':')[0]] = 1; });
    var want = Object.keys(deckIds).filter(function (d) { return HQ.manifest.decks[d]; });
    HQ.wait(root, Promise.all(want.map(HQ.loadDeck)), function () {
      var set = {}; ids.forEach(function (i) { set[i] = 1; });
      var items = []; want.forEach(function (d) { HQ.decks[d].all.forEach(function (it) { if (set[it.id]) items.push(it); }); });
      if (!items.length) { root.appendChild(el('div.note.ok', { text: 'Ошибок для повторения нет.' })); return; }
      root.appendChild(el('div.note.info', { text: 'Здесь ' + HQ.plural(items.length, 'слово', 'слова', 'слов') + ', в которых были ошибки. Слово уйдёт из списка после двух правильных ответов.' }));
      var g = el('div.modes'); root.appendChild(g);
      [['cards', '🃏', 'Карточки', 'Вспомнить спокойно'], ['choice', '✅', 'Тренировка', 'Выбрать перевод']].forEach(function (m) {
        g.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: m[0], items: items, pool: items, title: 'Работа над ошибками', back: '/mistakes', all: true }); } },
          el('div.e', { text: m[1] }), el('div.t', { text: m[2] }), el('div.d', { text: m[3] })));
      });
      var card = el('div.card', { style: 'margin-top:12px' }); items.slice(0, 60).forEach(function (it) { card.appendChild(HQ.wordRow(it)); }); root.appendChild(card);
    });
  };
})();
