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
      var st = HQ.tts.has(HQ.lang().learn);
      if (st === 'wait' && tries++ < 14) { setTimeout(check, 300); return; }
      if (!box.parentNode) return;
      if (st === 'yes') return;
      box.appendChild(el('div.note.warn', {},
        el('b', { text: HQ.t({ he: '🔇 Голос иврита не найден', ru: '🔇 Русский голос не найден', en: '🔇 Английский голос не найден' }[HQ.lang().learn]) }),
        el('div', { text: HQ.t('Без него слова не будут звучать. Как установить, написано в настройках.') }),
        el('button.btn.small', { style: 'margin-top:10px', onclick: function () { HQ.go('/settings/voice'); } }, HQ.t('Как включить звук'))));
    })();
  };

  /* ---------------- home ---------------- */
  V.home = function (root) {
    var M = HQ.manifest, full = St.full(), learned = St.totalLearned(), d = St.days()[HQ.today()] || { n: 0 };
    var last = St.set('last');
    var hero = el('div.hero',
      el('div.t', { text: HQ.t({ he: 'Учим иврит', ru: 'Учим русский', en: 'Учим английский' }[HQ.lang().learn]) }),
      el('div.d', { text: learned ? HQ.t('Продолжайте в своём темпе') : HQ.t('Начните с алфавита или проверьте свой уровень') }),
      el('div.row',
        el('div.pill', {}, el('b', { text: learned }), HQ.t('слов выучено')),
        el('div.pill', {}, el('b', { text: d.n }), HQ.t('ответов сегодня'))),
      (last && M.decks[last] && HQ.deckN(last)) ? el('button.go', { onclick: function () { HQ.go('/deck/' + last); } }, HQ.t('Продолжить: ') + HQ.dt(last) + ' ›') : null);
    root.appendChild(el('div.top', {}, el('h1', {}, ''), el('button.icon-btn', { 'aria-label': HQ.t('Настройки'), onclick: function () { HQ.go('/settings'); } }, '⚙️')));
    root.firstChild.style.marginBottom = '4px';
    root.appendChild(hero);
    HQ.voiceNote(root);
    var lbk = St.set('lastBackup');
    if (learned >= 20 && (!lbk || Date.now() - lbk > 14 * 864e5) && St.set('backupNag') !== HQ.today()) {
      var nag = el('div.note.info', {},
        el('b', { text: HQ.t('💾 Сохраните прогресс') }),
        el('div', { text: HQ.t('Выучено уже ') + HQ.n(learned, 'слово', 'слова', 'слов') + HQ.t('. Отправьте код себе в мессенджер — тогда прогресс не пропадёт при переустановке или смене телефона.') }),
        el('div.row', { style: 'margin-top:10px' },
          el('button.btn.small.primary', { onclick: function () { HQ.go('/settings/backup'); } }, HQ.t('Сохранить')),
          el('button.btn.small', { onclick: function () { St.set('backupNag', HQ.today()); nag.remove(); } }, HQ.t('Позже'))));
      root.appendChild(nag);
    }
    var framed = false; try { framed = window.top !== window; } catch (e) { framed = true; }
    if (HQ.ios && !HQ.standalone && !framed && /^https?:/.test(location.protocol) && !St.set('iosHint')) {
      var hint = el('div.note.info', {},
        el('b', { text: HQ.t('📲 Поставить на экран «Домой»') }),
        el('div', { text: HQ.t('Нажмите внизу Safari кнопку «Поделиться» (квадрат со стрелкой вверх), затем «На экран Домой». Появится значок, как у обычного приложения, и оно будет работать без интернета.') }),
        el('button.btn.small', { style: 'margin-top:10px', onclick: function () { St.set('iosHint', 1); hint.parentNode.removeChild(hint); } }, HQ.t('Понятно')));
      root.appendChild(hint);
    }

    M.sections.forEach(function (sec) {
      if (sec.full && !full) return;
      var items = sec.items.filter(function (it) { return !isHidden(it) && (full || !it.full) && HQ.tileOk(it); });
      if (!items.length) return;
      root.appendChild(el('div.sec', {}, el('div.t', { text: HQ.t(sec.title) }), sec.hint && HQ.native() ? el('div.h', { text: HQ.t(sec.hint) }) : null));
      var grid = el('div.tiles'); root.appendChild(grid);
      items.forEach(function (it) { grid.appendChild(tile(it)); });
    });
    var nh = Object.keys(St.set('hide') || {}).length;
    root.appendChild(el('button.btn' + (nh ? '.soft' : ''), { style: 'margin-top:18px', onclick: function () { HQ.go('/settings/topics'); } }, nh ? HQ.t('👁 Скрытые темы: ') + nh + HQ.t(' — показать или изменить') : HQ.t('👁 Выбрать темы на главной')));
    if (!full && HQ.lang().learn === 'he') {
      root.appendChild(el('div.sec', {}, el('div.t', { text: HQ.t('Ещё') })));
      root.appendChild(el('button.btn.soft', { onclick: function () { St.set('mode', 'full'); HQ.render(); } }, HQ.t('Показать продвинутые разделы (B2, инженерный)')));
    }
    var tot = 0; for (var dk in M.decks) tot += HQ.deckN(dk);
    root.appendChild(el('div.foot', {}, '© Shimon Donen, 2026 · ' + tot + HQ.t(' слов и фраз'), el('br'), HQ.version()));
  };
  /* which hub tiles exist for the current language pair */
  HQ.grammarFile = function () {
    var L = HQ.lang(), M = HQ.manifest.extras || {};
    var f = L.learn === 'he' ? (L.ui === 'ru' ? 'grammar' : 'grammar-he-en') : 'grammar-' + L.learn;
    return M[f] ? f : null;
  };
  HQ.tileOk = function (it) {
    var L = HQ.lang(), M = HQ.manifest;
    if (it.type === 'deck') return !!M.decks[it.id] && HQ.deckN(it.id) > 0;
    if (it.type === 'grammar') return !!HQ.grammarFile();
    if (it.type === 'conj' || it.type === 'test') return HQ.native() && (it.type !== 'test' || !!(M.extras || {})['test-' + it.id]);
    if (it.type === 'numbers') return L.learn === 'he';
    if (it.type === 'letters') return L.learn === 'he' ? HQ.native() : (it.id === 'print' && !!(M.extras || {})['letters-' + L.learn]);
    return true;
  };
  function tile(it) {
    var m = it.type === 'deck' ? deckMeta(it.id) : null, title = m ? HQ.dt(it.id) : HQ.t(it.title || ''), num = '', pct = 0, path;
    if (it.type === 'deck') { var n = St.learnedIn(it.id), dn = HQ.deckN(it.id); pct = dn ? n / dn * 100 : 0; num = n + ' / ' + dn; path = '/deck/' + it.id; }
    else if (it.type === 'letters') path = HQ.lang().learn === 'he' ? '/letters/' + it.id : '/abc';
    else if (it.type === 'grammar') path = '/grammar';
    else if (it.type === 'conj') path = '/conj';
    else if (it.type === 'test') path = '/test/' + it.id;
    else if (it.type === 'numbers') path = '/numbers';
    else if (it.type === 'mistakes') { path = '/mistakes'; num = String(St.mistakes().length || ''); }
    else if (it.type === 'stats') path = '/stats';
    var icon = it.type === 'letters' && it.id === 'print' ? { he: 'א', ru: 'Аа', en: 'Aa' }[HQ.lang().learn] : it.icon;
    var isHe = /[א-ת]/.test(icon);
    return el('button.tile', { onclick: function () { HQ.go(path); } },
      el('div.ic' + (isHe ? '.he' : ''), { text: icon }),
      el('div.b', {},
        el('div.t', {}, title, m ? el('span.lv', { text: m.level }) : null),
        el('div.d', { text: (HQ.native() || it.type === 'mistakes' || it.type === 'stats') ? HQ.t(it.desc || '') : (it.type === 'letters' ? HQ.n((HQ.manifest.extras || {})['letters-' + HQ.lang().learn] || 0, 'буква', 'буквы', 'букв') : '') })),
      num ? el('div.num', { text: num }) : null,
      pct ? el('i.pr', { style: 'width:' + pct + '%' }) : null);
  }

  /* ---------------- deck ---------------- */
  function MODES() { return [
    { k: 'cards', e: '🃏', t: HQ.t('Карточки'), d: HQ.t('Учим новые слова') },
    { k: 'choice', e: '✅', t: HQ.t('Выбор'), d: HQ.t('Выберите перевод') },
    { k: 'listen', e: '👂', t: HQ.t('На слух'), d: HQ.t('Услышать и узнать') },
    { k: 'build', e: '🧱', t: HQ.t('Собери'), d: HQ.t('Слово из букв, фраза из слов') },
    { k: 'match', e: '🔗', t: HQ.t('Найди пару'), d: HQ.t('Соединить слово и перевод') }
  ]; }
  V.deck = function (root, a) {
    var id = a[0], ci = (a[1] == null || a[1] === '' || a[1] === 'all') ? -1 : parseInt(a[1], 10), m = deckMeta(id);
    if (!m) { HQ.go('/'); return; }
    St.set('last', id);
    root.appendChild(HQ.top(HQ.dt(id), m.level + ' · ' + HQ.n(HQ.deckN(id), 'слово', 'слова', 'слов'), '/'));
    HQ.wait(root, HQ.loadDeck(id), function (deck) {
      if (!(ci >= 0 && ci < deck.cats.length)) ci = -1;
      var items = ci < 0 ? deck.all : deck.cats[ci].items, name = ci < 0 ? HQ.t('Вся тема') : deck.cats[ci].title;
      var known = St.learnedIn(id, items);
      root.appendChild(el('div.card', {},
        el('div', { style: 'display:flex;align-items:center;gap:12px' },
          ring(known, items.length),
          el('div', { style: 'flex:1' }, el('div', { style: 'font-weight:700', text: name }),
            el('div.muted', { style: 'font-size:.8em', text: HQ.t('Выучено ') + known + HQ.t(' из ') + items.length })))));
      var grid = el('div.modes'); root.appendChild(grid);
      MODES().forEach(function (mo) {
        grid.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: mo.k, deck: deck, cat: ci, items: items, title: name, back: '/deck/' + id + (ci < 0 ? '' : '/' + ci) }); } },
          el('div.e', { text: mo.e }), el('div.t', { text: mo.t }), el('div.d', { text: mo.d })));
      });
      var ex = St.exam(id + '/' + ci);
      grid.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: 'exam', deck: deck, cat: ci, items: items, title: HQ.t('Экзамен: ') + name, back: '/deck/' + id + (ci < 0 ? '' : '/' + ci), examKey: id + '/' + ci }); } },
        el('div.e', { text: '🎓' }), el('div.t', { text: HQ.t('Экзамен') }), el('div.d', { text: ex ? HQ.t('Лучший результат: ') + ex.best + '%' : HQ.t('Проверка по теме') })));
      grid.appendChild(el('button.mode.wide', { onclick: function () { HQ.go('/list/' + id + (ci < 0 ? '' : '/' + ci)); } },
        el('div.e', { text: '📖' }), el('div', {}, el('div.t', { style: 'margin:0', text: HQ.t('Список слов') }), el('div.d', { text: HQ.t('Все слова раздела с озвучкой') }))));

      root.appendChild(el('div.label', { text: HQ.t('Разделы темы') }));
      root.appendChild(catRow(HQ.t('Вся тема'), St.learnedIn(id, deck.all), deck.all.length, ci < 0, function () { HQ.go('/deck/' + id); }));
      var g = null;
      deck.cats.forEach(function (c, i) {
        if (!c.items.length) return;
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
    root.appendChild(HQ.top(HQ.t('Список слов'), HQ.dt(id), '/deck/' + id + (ci < 0 ? '' : '/' + ci)));
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
      el('button.sp', { 'aria-label': HQ.t('Послушать'), onclick: function () { HQ.tts.say(it); } }, '🔊'),
      el('div.b', {},
        el('div' + HQ.tc(), { text: (it.em ? it.em + ' ' : '') + HQ.heb(it) }),
        it.tr ? el('div.tr', { text: it.tr }) : null,
        el('div.ru', {}, el('span' + HQ.mc(), { text: HQ.mean(it) }), it.note ? ' — ' + it.note : '')),
      St.learned(it.id) ? el('span', { title: HQ.t('выучено'), text: '✅' }) : null);
  };

  /* ---------------- settings ---------------- */
  /* topics the user chose to hide from the home screen */
  function tileKey(it) { return it.type + ':' + it.id; }
  function isHidden(it) { var h = St.set('hide') || {}; return !!h[tileKey(it)]; }
  function setHidden(it, on) { var h = {}, c = St.set('hide') || {}; for (var k in c) h[k] = c[k]; if (on) h[tileKey(it)] = 1; else delete h[tileKey(it)]; St.set('hide', h); }
  HQ.isHidden = isHidden;
  function seg(key, opts) {
    var s = el('div.seg'), cur = St.set(key);
    opts.forEach(function (o) { s.appendChild(el('button' + (cur === o[0] ? '.on' : ''), { onclick: function () { St.set(key, o[0]); HQ.render(); } }, o[1])); });
    return s;
  }
  /* restore from a pasted code or from the text of a saved file */
  function restore(text, note) {
    var m = String(text || '').replace(/\s+/g, '').match(/HQ[12]:[A-Za-z0-9+\/=]+/);
    if (!m) { note('warn', HQ.t('Код не найден. Проверьте, что он скопирован полностью.')); return; }
    if (!confirm(HQ.t('Восстановить прогресс? Текущий прогресс на этом устройстве будет заменён.'))) return;
    var n = St.importCode(m[0]);
    if (n <= 0) { note('warn', HQ.t('Код не распознан. Проверьте, что он скопирован полностью.')); return; }
    note('ok', HQ.t('Готово, прогресс восстановлен.')); setTimeout(function () { location.hash = '/'; location.reload(); }, 1200);
  }
  HQ.backup = {
    text: function () {
      var c = St.exportCode();
      return HQ.t('Учим иврит — код прогресса (') + new Date().toLocaleDateString('ru-RU') + HQ.t(', выучено слов: ') + St.totalLearned() + ').\n' +
        HQ.t('Чтобы восстановить: Настройки → Сохранить и перенести прогресс → Вставить код.\n\n') + c + '\n';
    },
    share: function () {
      var t = HQ.backup.text(), A = window.AndroidStore;
      if (A && typeof A.share === 'function') { try { A.share(t); St.set('lastBackup', Date.now()); return true; } catch (e) { } }
      if (navigator.share) { navigator.share({ title: HQ.t('Учим иврит — прогресс'), text: t }).then(function () { St.set('lastBackup', Date.now()); }, function () { }); return true; }
      return false;
    },
    /* true = saved, 'ask' = the system file dialog was opened, false = failed */
    saveFile: function () {
      var t = HQ.backup.text(), name = 'ivrit-progress-' + HQ.today() + '.txt', A = window.AndroidStore;
      if (A && typeof A.saveFile === 'function') { try { A.saveFile(name, t); return 'ask'; } catch (e) { } }
      try {
        var url = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' })), link = el('a', { href: url, download: name });
        document.body.appendChild(link); link.click(); setTimeout(function () { URL.revokeObjectURL(url); link.remove(); }, 2000);
        St.set('lastBackup', Date.now()); return true;
      } catch (e) { return false; }
    }
  };
  HQ.onFileSaved = function (ok) {
    if (ok) St.set('lastBackup', Date.now());
    alert(ok ? HQ.t('Файл с прогрессом сохранён.') : HQ.t('Файл не сохранён.'));
  };
  /* ---------------- languages ---------------- */
  var UI_NAMES = { ru: 'Русский', en: 'English', he: 'עברית' };
  HQ.setLang = function (ui, learn) {
    if (ui) St.set('ui', ui);
    if (learn) St.set('learn', learn);
    var L = HQ.lang(); St.set('learn', L.learn);
    return (L.ui === 'ru' ? Promise.resolve() : HQ.loadExtra('ui').catch(function () { })).then(function () { HQ.applyPrefs(); });
  };
  HQ.langCard = function () {
    var L = HQ.lang(), c = el('div.card.stack', { id: 'langs' });
    c.appendChild(el('div', { style: 'font-weight:800', text: '🌐 ' + HQ.t('Языки') }));
    c.appendChild(el('div.label', { style: 'margin-top:0', text: HQ.t('Язык интерфейса') }));
    var a = el('div.seg');
    ['ru', 'en', 'he'].forEach(function (u) { a.appendChild(el('button' + (L.ui === u ? '.on' : ''), { lang: u, onclick: function () { HQ.setLang(u).then(HQ.render); } }, UI_NAMES[u])); });
    c.appendChild(a);
    c.appendChild(el('div.label', { text: HQ.t('Какой язык учу') }));
    var b = el('div.seg');
    ['he', 'ru', 'en'].filter(function (x) { return x !== L.ui; }).forEach(function (x) {
      b.appendChild(el('button' + (L.learn === x ? '.on' : ''), { onclick: function () { HQ.setLang(null, x).then(HQ.render); } }, HQ.t({ he: 'Иврит', ru: 'Русский', en: 'Английский' }[x])));
    });
    c.appendChild(b);
    c.appendChild(el('div.muted', { style: 'font-size:.78em', text: HQ.t('Прогресс по каждому языку хранится отдельно.') }));
    return c;
  };
  /* first start: choose the languages */
  V.welcome = function (root) {
    var box = el('div.stack', { style: 'padding-top:24px' });
    box.appendChild(el('div.hero', {}, el('div.t', { text: 'Учим языки · Learn languages · לומדים שפות' }), el('div.d', { text: 'Иврит · Русский · English' })));
    box.appendChild(el('div.label', { text: 'Язык программы · App language · שפת הממשק' }));
    ['ru', 'en', 'he'].forEach(function (u) {
      box.appendChild(el('button.btn' + (u === 'ru' ? '.primary' : ''), { lang: u, onclick: function () { HQ.setLang(u).then(function () { HQ.go('/welcome/2'); }); } }, UI_NAMES[u]));
    });
    root.appendChild(box);
  };
  V.welcome2 = function (root) {
    var L = HQ.lang(), box = el('div.stack', { style: 'padding-top:24px' });
    box.appendChild(el('div.hero', {}, el('div.t', { text: HQ.t('Какой язык учу') })));
    ['he', 'ru', 'en'].filter(function (x) { return x !== L.ui; }).forEach(function (x) {
      box.appendChild(el('button.btn.primary', { onclick: function () { St.set('welcomed', 1); HQ.setLang(null, x).then(function () { HQ.go('/'); }); } },
        { he: '🇮🇱 ', ru: '🇷🇺 ', en: '🇬🇧 ' }[x] + HQ.t({ he: 'Иврит', ru: 'Русский', en: 'Английский' }[x])));
    });
    box.appendChild(el('button.btn', { onclick: function () { HQ.go('/welcome'); } }, '‹ ' + HQ.t('Назад')));
    root.appendChild(box);
  };

  V.settings = function (root, a) {
    root.appendChild(HQ.top(HQ.t('Настройки'), '', function () { HQ.back('/'); }));
    root.lastChild.lastChild.remove();
    root.appendChild(HQ.langCard());
    var c = el('div.card.stack');
    c.appendChild(el('div.label', { style: 'margin-top:0', text: HQ.t('Режим') }));
    c.appendChild(seg('mode', [['simple', HQ.t('Простой')], ['full', HQ.t('Полный')]]));
    c.appendChild(el('div.muted', { style: 'font-size:.78em', text: HQ.t('Простой: только самое нужное, короткие занятия. Полный: все разделы, B2, инженерный, длинные тренировки.') }));
    var nqUseful = HQ.lang().learn !== 'en' || HQ.lang().ui === 'he';
    if (nqUseful) c.appendChild(el('div.label', { text: HQ.lang().learn === 'he' ? HQ.t('Огласовки (точки под буквами)') : HQ.lang().learn === 'ru' ? HQ.t('Ударения в русских словах') : HQ.t('Огласовки в словах на иврите') }));
    if (nqUseful) c.appendChild(seg('nq', [[true, HQ.t('Показывать')], [false, HQ.lang().learn === 'ru' ? HQ.t('Без ударений') : HQ.t('Без огласовок')]]));
    c.appendChild(el('div.label', { text: HQ.t('Направление в упражнениях') }));
    var LN = { he: HQ.t('Иврит'), ru: HQ.t('Русский'), en: HQ.t('Английский') }, Lp = HQ.lang(), ar = Lp.ui === 'he' ? ' ← ' : ' → ';
    c.appendChild(seg('dir', [['mix', HQ.t('Вперемешку')], ['he-ru', LN[Lp.learn] + ar + LN[Lp.ui]], ['ru-he', LN[Lp.ui] + ar + LN[Lp.learn]]]));
    c.appendChild(el('div.label', { text: HQ.t('Переход к следующему вопросу') }));
    c.appendChild(seg('auto', [['off', HQ.t('Кнопкой «Дальше»')], ['ok', HQ.t('Сам, после верного')], ['all', HQ.t('Сам, всегда')]]));
    c.appendChild(el('div.muted', { style: 'font-size:.78em', text: HQ.t('«Сам»: после верного ответа следующий вопрос появляется через секунду. После ошибки в режиме «всегда» — через 2 секунды, чтобы успеть увидеть правильный ответ.') }));
    c.appendChild(el('div.label', { text: HQ.t('Скорость речи') }));
    c.appendChild(seg('rate', [[0.55, HQ.t('Медленно')], [0.8, HQ.t('Спокойно')], [1, HQ.t('Обычно')]]));
    c.appendChild(el('div.label', { text: HQ.t('Размер текста') }));
    c.appendChild(seg('size', [['xs', HQ.t('Мелкий')], ['s', HQ.t('Меньше')], ['m', HQ.t('Обычный')]]));
    c.appendChild(seg('size', [['l', HQ.t('Крупный')], ['xl', HQ.t('Очень крупный')]]));
    c.appendChild(el('div.label', { text: HQ.t('Оформление') }));
    c.appendChild(seg('theme', [['auto', HQ.t('Как в системе')], ['light', HQ.t('Светлое')], ['dark', HQ.t('Тёмное')]]));
    root.appendChild(c);

    /* topics on the home screen */
    var tc = el('div.card.stack', { id: 'topics' });
    tc.appendChild(el('div', { style: 'font-weight:800', text: HQ.t('👁 Темы на главной') }));
    tc.appendChild(el('div.muted', { style: 'font-size:.82em', text: HQ.t('Снимите галочку с тем, которые вам не нужны, — они исчезнут с главной. Прогресс по ним сохраняется, вернуть можно в любой момент.') }));
    var M = HQ.manifest, fullMode = St.full();
    M.sections.forEach(function (sec) {
      var items = sec.items.filter(function (it) { return (it.type !== 'deck' || M.decks[it.id]) && (it.type !== 'grammar' || M.extras.grammar) && (it.type !== 'conj' || M.extras.conj); });
      if (!items.length) return;
      if (!items.some(HQ.tileOk)) return;
      tc.appendChild(el('div.label', { text: HQ.t(sec.title) + ((sec.full && !fullMode) ? HQ.t(' (видно в полном режиме)') : '') }));
      items.forEach(function (it) {
        if (!HQ.tileOk(it)) return;
        var title = M.decks[it.id] && it.type === 'deck' ? HQ.dt(it.id) : HQ.t(it.title || it.id), on = !isHidden(it);
        var box = el('input', { type: 'checkbox' }); box.checked = on;
        var row = el('label.chk', {}, box, el('span.e', { text: it.icon || '' }), el('span.t', { text: title }));
        box.addEventListener('change', function () { setHidden(it, !box.checked); });
        tc.appendChild(row);
      });
    });
    tc.appendChild(el('div.row', {},
      el('button.btn', { onclick: function () { St.set('hide', {}); HQ.render(); } }, HQ.t('Показать все')),
      el('button.btn', { onclick: function () { HQ.go('/'); } }, HQ.t('На главную'))));
    root.appendChild(tc);
    if (a && a[0] === 'topics') setTimeout(function () { tc.scrollIntoView({ block: 'start' }); }, 30);

    /* voice */
    var v = el('div.card.stack', { id: 'voice' });
    v.appendChild(el('div', { style: 'font-weight:800', text: HQ.t('🔊 Звук') }));
    var st = el('div.muted', { style: 'font-size:.86em' }); v.appendChild(st);
    function upd() {
      var Lv = HQ.lang(), h = HQ.tts.has(Lv.learn), r = HQ.tts.has(Lv.ui);
      var LN2 = { he: HQ.t('Иврит'), ru: HQ.t('Русский'), en: HQ.t('Английский') }, st2 = function (x) { return x === 'yes' ? HQ.t('есть ✓') : x === 'wait' ? HQ.t('проверяю…') : HQ.t('не найден'); };
      st.textContent = HQ.t('Голос') + ' · ' + LN2[Lv.learn] + ': ' + st2(h) + ' · ' + LN2[Lv.ui] + ': ' + st2(r);
      if (h === 'wait') setTimeout(upd, 400);
    }
    upd(); setTimeout(upd, 1600);
    v.appendChild(el('button.btn.soft', { onclick: function () { var l = HQ.lang().learn; HQ.tts.speak({ he: 'שָׁלוֹם, מַה שְּׁלוֹמְךָ?', ru: 'Здравствуйте, как дела?', en: 'Hello, how are you?' }[l], l); } }, HQ.t('Проверить звук')));
    if (window.AndroidTTS && typeof window.AndroidTTS.openTtsSettings === 'function')
      v.appendChild(el('button.btn', { onclick: function () { HQ.tts.openSettings(); } }, HQ.t('Открыть настройки голоса')));
    if (HQ.ios) v.appendChild(el('div.muted', { style: 'font-size:.8em', html: HQ.t('<b>Если звука нет (iPhone, iPad):</b> проверьте, что выключен беззвучный режим (переключатель сбоку) и прибавьте громкость. Голос иврита в iPhone уже есть. Более приятный голос: Настройки → Универсальный доступ → Устный контент → Голоса → Иврит → загрузить «Кармит (улучшенный)».') }));
    else v.appendChild(el('div.muted', { style: 'font-size:.8em', html: HQ.t('<b>Если звука нет (Android):</b> Настройки телефона → Общие настройки → Язык и ввод → Преобразование текста в речь → Google → ⚙ → Установить голосовые данные → עברית (иврит). Потом закройте и снова откройте приложение. Громкость — «мультимедиа».') }));
    root.appendChild(v);

    /* progress backup */
    var p = el('div.card.stack', { id: 'backup' });
    p.appendChild(el('div', { style: 'font-weight:800', text: HQ.t('💾 Сохранить и перенести прогресс') }));
    p.appendChild(el('div.muted', { style: 'font-size:.82em', text: HQ.t('Перед переустановкой приложения или переходом на другой телефон сохраните прогресс: отправьте код себе в WhatsApp или Telegram, или сохраните файл. Потом восстановите его здесь же.') }));
    var lb = St.set('lastBackup');
    p.appendChild(el('div.muted', { style: 'font-size:.82em;font-weight:600', text: lb ? HQ.t('Последнее сохранение: ') + new Date(lb).toLocaleDateString('ru-RU') : HQ.t('Прогресс ещё ни разу не сохранялся.') }));
    var msg = el('div');
    function note(cls, t) { msg.className = 'note ' + cls; msg.textContent = t; }
    p.appendChild(el('button.btn.primary', { onclick: function () {
      if (HQ.backup.share()) note('ok', HQ.t('Выберите, куда отправить, например «Избранное» в Telegram или чат с собой в WhatsApp.'));
      else { showCode(); note('info', HQ.t('Скопируйте код и отправьте его себе в любой мессенджер.')); }
    } }, HQ.t('📤 Отправить код себе')));
    p.appendChild(el('button.btn.soft', { onclick: function () {
      var r = HQ.backup.saveFile();
      if (r === 'ask') note('info', HQ.t('Выберите папку, например «Загрузки» или Google Диск.'));
      else if (r) note('ok', HQ.t('Файл сохранён в «Загрузки».'));
      else note('warn', HQ.t('Не получилось сохранить файл. Используйте «Отправить код себе».'));
    } }, HQ.t('💾 Сохранить в файл')));
    var out = el('div.stack');
    function showCode() {
      out.innerHTML = ''; var ta = el('textarea', { id: 'progresscode', readonly: '' }); ta.value = St.exportCode(); out.appendChild(ta);
      St.set('lastBackup', Date.now());
      var cb = el('button.btn', { onclick: function () {
        var done = function () { cb.textContent = HQ.t('Скопировано ✓'); setTimeout(function () { cb.textContent = HQ.t('📋 Скопировать'); }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); try { document.execCommand('copy'); } catch (e) { } done(); }
      } }, HQ.t('📋 Скопировать')); out.appendChild(cb); ta.select();
    }
    p.appendChild(el('button.btn', { id: 'pc-export-btn', onclick: showCode }, HQ.t('Показать код прогресса')));
    p.appendChild(out);
    p.appendChild(msg);

    p.appendChild(el('div.label', { text: HQ.t('Восстановить') }));
    var file = el('input', { type: 'file', accept: '.txt,text/plain', style: 'display:none' });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { restore(String(r.result || ''), note); file.value = ''; };
      r.onerror = function () { note('warn', HQ.t('Не удалось прочитать файл.')); };
      r.readAsText(f);
    });
    p.appendChild(file);
    p.appendChild(el('button.btn', { onclick: function () { file.click(); } }, HQ.t('📂 Загрузить из файла')));
    var inp = el('div.stack');
    p.appendChild(el('button.btn', { onclick: function () {
      inp.innerHTML = ''; var ta = el('textarea', { id: 'importcode', placeholder: HQ.t('Вставьте код (начинается с HQ…)') });
      inp.appendChild(ta);
      inp.appendChild(el('button.btn.primary', { onclick: function () { restore(ta.value, note); } }, HQ.t('Восстановить')));
    } }, HQ.t('Вставить код')));
    p.appendChild(inp);
    root.appendChild(p);
    if (a[0] === 'backup') setTimeout(function () { p.scrollIntoView({ block: 'start' }); }, 30);

    root.appendChild(el('button.btn.bad', { onclick: function () { if (confirm(HQ.t('Стереть весь прогресс на этом устройстве?'))) { St.reset(); HQ.go('/'); } } }, HQ.t('Сбросить прогресс')));
    root.appendChild(el('div.foot', { html: HQ.t('Учим иврит · © Shimon Donen, 2026<br>Шрифты Rubik и Gveret Levin — SIL Open Font License') }));
    root.appendChild(el('div.foot', { style: 'margin-top:0' }, HQ.version()));
    if (a[0] === 'voice') setTimeout(function () { v.scrollIntoView({ block: 'start' }); }, 30);
  };

  /* ---------------- statistics ---------------- */
  V.stats = function (root) {
    var M = HQ.manifest, days = St.days(), keys = Object.keys(days).sort();
    root.appendChild(HQ.top(HQ.t('Статистика'), '', '/'));
    var total = St.totalLearned(), ans = 0, ok = 0; keys.forEach(function (k) { ans += days[k].n; ok += days[k].ok; });
    root.appendChild(el('div.kpis', {},
      el('div.kpi', {}, el('b', { text: total }), el('span', { text: HQ.t('слов выучено') })),
      el('div.kpi', {}, el('b', { text: keys.length }), el('span', { text: keys.length === 1 ? HQ.t('день занятий') : HQ.t('дней занятий') })),
      el('div.kpi', {}, el('b', { text: ans }), el('span', { text: HQ.t('ответов всего') }))));
    if (ans >= 20 && ok / ans >= 0.6) root.appendChild(el('div.note.ok', { text: HQ.t('Правильных ответов: ') + Math.round(ok / ans * 100) + HQ.t('% — отличная работа!') }));

    var card = el('div.card', {}, el('div', { style: 'font-weight:800', text: HQ.t('Последние 14 дней') }), el('div.muted', { style: 'font-size:.76em', text: HQ.t('Сколько ответов вы дали в каждый из дней') }));
    var row = el('div.days'), mx = 1, list = [];
    for (var i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); var n = days[k] ? days[k].n : 0; mx = Math.max(mx, n); list.push([d.getDate(), n]); }
    list.forEach(function (x) { row.appendChild(el('div.d', { title: x[1] + HQ.t(' ответов') }, el('i' + (x[1] ? '' : '.z'), { style: 'height:' + Math.max(3, x[1] / mx * 100) + '%' }), el('span', { text: x[0] }))); });
    card.appendChild(row); root.appendChild(card);

    var c2 = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: HQ.t('По темам') }));
    M.sections.forEach(function (s) { s.items.forEach(function (it) {
      if (it.type !== 'deck' || !M.decks[it.id]) return;
      var m = M.decks[it.id], k = St.learnedIn(it.id), dn = HQ.deckN(it.id);
      if (!dn) return;
      if (!k && (s.full || it.full) && !St.full()) return;
      c2.appendChild(el('div.lrow', {}, el('div.t', { text: HQ.dt(it.id) }), el('div.bar', {}, el('i', { style: 'width:' + (dn ? k / dn * 100 : 0) + '%' })), el('div.n', { text: k + ' / ' + dn })));
    }); });
    root.appendChild(c2);

    var ex = St.raw.ex, pf = HQ.pref(), ek = Object.keys(ex).filter(function (k) { return pf ? k.indexOf(pf) === 0 : k.indexOf('@') < 0; });
    if (ek.length) {
      var c3 = el('div.card', {}, el('div', { style: 'font-weight:800;margin-bottom:4px', text: HQ.t('Экзамены и тесты') }));
      ek.sort(function (a, b) { return ex[b].t - ex[a].t; }).slice(0, 12).forEach(function (key) {
        var p = key.slice(pf.length).split('/'), m = M.decks[p[0]], name = m ? HQ.dt(p[0]) + (p[1] >= 0 && m.cats[p[1]] ? ' · ' + HQ.ct(m, +p[1]) : '') : (key === 'test/level' ? HQ.t('Проверка уровня') : key === 'test/idioms' ? HQ.t('Идиомы и сленг') : key);
        c3.appendChild(el('div.lrow', {}, el('div.t', { text: name }), el('div.n', { style: 'min-width:120px', text: HQ.t('лучший ') + ex[key].best + '%' })));
      });
      root.appendChild(c3);
    }
    var mi = St.mistakes().length;
    if (mi) root.appendChild(el('button.btn.soft', { onclick: function () { HQ.go('/mistakes'); } }, HQ.t('🛠️ Повторить слова с ошибками (') + mi + ')'));
  };

  /* ---------------- mistakes ---------------- */
  V.mistakes = function (root) {
    root.appendChild(HQ.top(HQ.t('Работа над ошибками'), '', '/'));
    var ids = St.mistakes();
    if (!ids.length) { root.appendChild(el('div.note.ok', { text: HQ.t('Ошибок для повторения нет. Когда вы ошибётесь в упражнении, слово появится здесь.') })); return; }
    var deckIds = {}; ids.forEach(function (id) { deckIds[id.split(':')[0]] = 1; });
    var want = Object.keys(deckIds).filter(function (d) { return HQ.manifest.decks[d]; });
    HQ.wait(root, Promise.all(want.map(HQ.loadDeck)), function () {
      var set = {}; ids.forEach(function (i) { set[i] = 1; });
      var items = []; want.forEach(function (d) { HQ.deckView(d).all.forEach(function (it) { if (set[it.id]) items.push(it); }); });
      if (!items.length) { root.appendChild(el('div.note.ok', { text: HQ.t('Ошибок для повторения нет.') })); return; }
      root.appendChild(el('div.note.info', { text: HQ.t('Здесь ') + HQ.n(items.length, 'слово', 'слова', 'слов') + HQ.t(', в которых были ошибки. Слово уйдёт из списка после двух правильных ответов.') }));
      var g = el('div.modes'); root.appendChild(g);
      [['cards', '🃏', HQ.t('Карточки'), HQ.t('Вспомнить спокойно')], ['choice', '✅', HQ.t('Тренировка'), HQ.t('Выбрать перевод')]].forEach(function (m) {
        g.appendChild(el('button.mode', { onclick: function () { HQ.startRun({ kind: m[0], items: items, pool: items, title: HQ.t('Работа над ошибками'), back: '/mistakes', all: true }); } },
          el('div.e', { text: m[1] }), el('div.t', { text: m[2] }), el('div.d', { text: m[3] })));
      });
      var card = el('div.card', { style: 'margin-top:12px' }); items.slice(0, 60).forEach(function (it) { card.appendChild(HQ.wordRow(it)); }); root.appendChild(card);
    });
  };
})();
