import { useState, useCallback, useMemo } from "react";

const D = {
  con:[{r:"Сухая штукатурка",h:"טיח יבש",t:"ти́ах яве́ш"},{r:"Балка",h:"קורה",t:"кора́"},{r:"Штраба",h:"חריץ",t:"хариц"},{r:"Красная линия",h:"קו אדום",t:"ка́в адо́м"},{r:"Кондиционер",h:"מזגן",t:"мазга́н"},{r:"Шов бетонирования",h:"הפסקת יציקה",t:"hафсака́т яцика́"},{r:"Граница",h:"גבול",t:"гвуль"},{r:"Рама",h:"מסגרת",t:"мисге́рет"},{r:"Генератор",h:"גנרטור",t:"генера́тор"},{r:"Сметчик",h:"שמאי",t:"шама́й"},{r:"Плита перекрытия",h:"תקרת בטון",t:"тикра́т бетон"},{r:"Декоративная шпатлёвка",h:"שליכט",t:"шлихт"},{r:"Увлажнитель",h:"מרטיב",t:"марти́в"},{r:"Дренажный канал",h:"תעלות מים גשם",t:"теало́т мей ге́шем"}],
  geo:[{r:"Дуга",h:"קשת",t:"кЕшет"},{r:"Линия",h:"קו",t:"кАв"},{r:"Шар",h:"כדור",t:"кадУр"},{r:"Цилиндр",h:"גליל",t:"галИл"},{r:"Вычитание",h:"חיסור",t:"хисУр"},{r:"Знаменатель",h:"מכנה",t:"механЭ"},{r:"Высота",h:"גובה",t:"гОва"},{r:"Результат",h:"תוצאה",t:"тоцаА"},{r:"Эллипс",h:"אליפסה",t:"элипсА"},{r:"Деление",h:"חילוק",t:"хилУк"},{r:"Степень",h:"חזקה",t:"хезкА"},{r:"Точка касания",h:"נקודת השקה",t:"некудАт hашакА"}],
  mat:[{r:"Неравенство",h:"אי-שוויון",t:"и-шивйо́н"},{r:"Формула",h:"נוסחה",t:"но́сха"},{r:"Угол",h:"זווית",t:"зави́т"},{r:"Вектор",h:"וקטור",t:"вéктор"},{r:"Приближение",h:"קירוב",t:"киру́в"},{r:"Уравнение",h:"משוואה",t:"машваа́"},{r:"Пропорция",h:"יחס",t:"я́хас"},{r:"Литр",h:"ליטר",t:"ли́тер"},{r:"Координата",h:"קואורדינטה",t:"коордіна́та"},{r:"Паскаль",h:"פסקל",t:"паска́ль"},{r:"Сходимость",h:"התכנסות",t:"hитка́рвут"},{r:"Интерполяция",h:"אינטרפולציה",t:"интерпола́ция"}],
  mec:[{r:"Вибрация",h:"רעד",t:"ра́ад"},{r:"Растяжение",h:"מתיחה",t:"метиха́"},{r:"Армирование",h:"זיון",t:"зию́н"},{r:"Изгиб",h:"כפיפה",t:"кфифа́"},{r:"Измерение",h:"מדידה",t:"медида́"},{r:"Акт/подтверждение",h:"אישור",t:"ишу́р"},{r:"Контроль качества",h:"בקרת איכות",t:"бикорэ́т эйху́т"},{r:"Момент",h:"מומנט",t:"моме́нт"},{r:"Электрика",h:"חשמל",t:"хашма́ль"},{r:"Кондиционирование",h:"מיזוג",t:"мизу́г"},{r:"Акт вып. работ",h:"אישור ביצוע",t:"ишу́р бицу́а"},{r:"Стат. проверка",h:"בדיקה סטטית",t:"бдика́ стати́т"}],
  doc:[{r:"Оконч. расчёт",h:"תשלום סופי",t:"ташлу́м софи́"},{r:"Договор аренды",h:"חוזה שכירות",t:"хозэ́ схиру́т"},{r:"Сдача объекта",h:"מסירת המבנה",t:"месира́т hамивнэ́"},{r:"Аренда",h:"שכירות",t:"схиру́т"},{r:"Страх. полис",h:"פוליסת ביטוח",t:"поли́сат биту́ах"},{r:"Договор подряда",h:"חוזה קבלנות",t:"хозэ́ кабланУ́т"},{r:"Девелопер",h:"יזם",t:"язА́м"},{r:"Приказ об изм.",h:"צו שינוי",t:"цав шину́й"},{r:"Частичная приёмка",h:"קבלה חלקית",t:"кабала́ хелки́т"},{r:"Стоим. контракта",h:"שווי החוזה",t:"шву́т hахозэ́"},{r:"Назнач. здания",h:"ייעוד המבנה",t:"йиу́д hамивнэ́"},{r:"При условии",h:"בכפוף ל",t:"бехофэ́ф ле"},{r:"Причина задержки",h:"סיבת העיכוב",t:"сиба́т hаику́в"},{r:"Этажность",h:"קומות מותרות",t:"комо́т муте́рет"}],
  phr:[{r:"Болит",h:"כואב",t:"коэ́в"},{r:"Можете объяснить?",h:"אפשר להסביר",t:"эфша́р леhасби́р"},{r:"Десять",h:"עשרה",t:"асара́"},{r:"Обязан",h:"חייב",t:"хая́в"},{r:"Прочный",h:"חזק",t:"хаза́к"},{r:"Полчаса",h:"חצי שעה",t:"хаци́ шаа́"},{r:"Потому что",h:"כי",t:"ки"},{r:"Хорошо / ок",h:"בסדר",t:"бесэ́дер"},{r:"Сдача (оплата)",h:"עודף",t:"о́деф"},{r:"Пятьдесят",h:"חמישים",t:"хамиши́м"},{r:"Фиолетовый",h:"סגול",t:"саго́ль"},{r:"Рядом с",h:"ליד",t:"лея́д"},{r:"Назначить встречу",h:"לקבוע פגישה",t:"ликбо́а пгиша́"},{r:"Минуточку",h:"רגע",t:"рэ́га"}],
  vrb:[{r:"Писать",h:"לכתוב",t:"лихто́в"},{r:"Страховать",h:"לבטח",t:"леватэ́ах"},{r:"Рассказывать",h:"לספר",t:"лесапэ́р"},{r:"Преподавать",h:"ללמד",t:"лелампэ́д"},{r:"Подниматься",h:"לעלות",t:"лаало́т"},{r:"Сообщать",h:"להודיע",t:"леhоди́а"},{r:"Ехать",h:"לנסוע",t:"линсо́а"},{r:"Копать",h:"לחפור",t:"лахпо́р"},{r:"Знать",h:"לדעת",t:"лада́ат"},{r:"Падать",h:"ליפול",t:"липо́ль"},{r:"Объяснять",h:"להסביר",t:"леhасби́р"},{r:"Жить",h:"לגור",t:"лагу́р"},{r:"Находить",h:"למצוא",t:"лимцо́"},{r:"Утверждать",h:"לאשר",t:"леашэ́р"}],
  prn:[{r:"Он сам",h:"הוא עצמו",t:"hу ацмо́"},{r:"Кто-то",h:"מישהו",t:"ми́шеhу"},{r:"Этот / это",h:"זה",t:"зэ"},{r:"Они (ж.)",h:"הן",t:"hэн"},{r:"Как-нибудь",h:"איכשהו",t:"э́йхшеhу"},{r:"Ничто",h:"שום דבר",t:"шум дава́р"},{r:"Мы сами",h:"אנחנו עצמנו",t:"ана́хну ацмэ́ну"},{r:"Такой же",h:"אותו דבר",t:"ото́ дава́р"},{r:"Эти",h:"אלה",t:"э́ле"},{r:"Они (м.)",h:"הם",t:"hэм"},{r:"Что?",h:"מה",t:"ма"},{r:"Кто?",h:"מי",t:"ми"}],
  pre:[{r:"Их (принадл.)",h:"שלהם",t:"шелахэ́м"},{r:"Им (дат.)",h:"להם",t:"лаhэ́м"},{r:"Вам (дат.)",h:"לכם",t:"лахэ́м"},{r:"Наш",h:"שלנו",t:"шелáну"},{r:"От меня",h:"ממני",t:"мимэ́ни"},{r:"Его",h:"שלו",t:"шело́"},{r:"Обо мне",h:"עליי",t:"ала́й"},{r:"Их (вин.)",h:"אותם",t:"отáм"},{r:"Ко мне",h:"אליי",t:"эла́й"},{r:"От него",h:"ממנו",t:"мимэ́ну"},{r:"Ваш (ж.)",h:"שלכן",t:"шелахэ́н"},{r:"Их (ж.)",h:"שלהן",t:"шелахэ́н"}],
  grm:[{r:"Отключённый",h:"מנותק",t:"менута́к"},{r:"Пожарный выход",h:"יציאת חירום",t:"йеция́т хиру́м"},{r:"Такой же как",h:"בדיוק כמו",t:"бадию́к кмо"},{r:"Вместо того чтобы",h:"במקום ל",t:"бимко́м ле"},{r:"В конце концов",h:"בסוף",t:"бесóф"},{r:"Что (союз)",h:"ש",t:"шэ"},{r:"Более того",h:"יותר מזה",t:"йотéр мизэ́"},{r:"Суд",h:"בית משפט",t:"бейт мишпа́т"},{r:"У меня было",h:"היה לי",t:"hая́ ли"},{r:"Иными словами",h:"במילים אחרות",t:"бемили́м ахеро́т"},{r:"Ещё не",h:"עדיין לא",t:"адáин ло"},{r:"Нет (не имеется)",h:"אין",t:"эйн"},{r:"У него нет",h:"אין לו",t:"эйн ло"},{r:"Иногда",h:"לפעמים",t:"лифъами́м"}]
};

const M = {
  con:{n:"Стройка",c:"#2563eb"},
  geo:{n:"Геометрия",c:"#7c3aed"},
  mat:{n:"Матем. инж.",c:"#6366f1"},
  mec:{n:"Механика",c:"#0891b2"},
  doc:{n:"Договоры",c:"#059669"},
  phr:{n:"Фразы",c:"#d97706"},
  vrb:{n:"Глаголы",c:"#dc2626"},
  prn:{n:"Местоимения",c:"#9333ea"},
  pre:{n:"Предлоги",c:"#0d9488"},
  grm:{n:"Грамматика",c:"#b45309"}
};

const sh = a => {
  const b = [...a];
  for (let i = b.length-1; i > 0; i--) {
    const j = 0|Math.random()*(i+1);
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
};

const allPool = Object.values(D).flat();

const mkOpts = (item, fld) => {
  const wrong = sh(allPool.filter(x => x[fld] !== item[fld])).slice(0,3);
  return sh([item, ...wrong]);
};

export default function App() {
  const [page, setPage] = useState("menu");
  const [sel, setSel] = useState(new Set(Object.keys(M)));
  const [dir, setDir] = useState("mix");
  const [qs, setQs] = useState([]);
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState(null);
  const [show, setShow] = useState(false);
  const [res, setRes] = useState({});

  const start = () => {
    const arr = [];
    sel.forEach(k => {
      (D[k]||[]).forEach(item => {
        const heRu = dir==="he" || (dir==="mix" && Math.random()>0.5);
        arr.push({ block:k, item, heRu, opts: mkOpts(item, heRu?"r":"h") });
      });
    });
    setQs(sh(arr));
    setQi(0); setPick(null); setShow(false); setRes({});
    setPage("quiz");
  };

  const answer = opt => {
    if (show) return;
    const q = qs[qi];
    const f = q.heRu ? "r" : "h";
    const ok = opt[f] === q.item[f];
    setPick(opt); setShow(true);
    setRes(p => {
      const old = p[q.block] || {ok:0,n:0,bad:[]};
      return {...p, [q.block]: {ok:old.ok+(ok?1:0), n:old.n+1, bad:ok?old.bad:[...old.bad,q.item]}};
    });
  };

  const next = () => {
    if (qi+1 >= qs.length) { setPage("res"); return; }
    setQi(qi+1); setPick(null); setShow(false);
  };

  const tog = k => setSel(p => { const s=new Set(p); s.has(k)?s.delete(k):s.add(k); return s; });

  const S = {
    wrap: { fontFamily:"system-ui,sans-serif", maxWidth:460, margin:"0 auto", padding:16 },
    btn: (bg,fg) => ({ width:"100%",padding:14,borderRadius:12,border:"none",background:bg,color:fg||"#fff",fontSize:15,fontWeight:600,cursor:"pointer" }),
    card: (c) => ({ padding:20,borderRadius:14,background:c+"0a",border:"1px solid "+c+"22",textAlign:"center",marginBottom:16 }),
  };

  if (page==="menu") {
    const total = Array.from(sel).reduce((s,k)=>s+(D[k]?.length||0),0);
    return (
      <div style={S.wrap}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:24,fontWeight:700,marginBottom:4}}>Диагностика иврита</div>
          <div style={{fontSize:14,color:"#64748b"}}>10 блоков, 135 вопросов</div>
        </div>
        <div style={{background:"#f8fafc",borderRadius:12,padding:12,marginBottom:16,border:"1px solid #e2e8f0"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:6}}>Направление</div>
          {[["mix","Смешанное"],["ru","Рус -> Ивр"],["he","Ивр -> Рус"]].map(([v,l])=>(
            <label key={v} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",cursor:"pointer",fontSize:14}}>
              <input type="radio" checked={dir===v} onChange={()=>setDir(v)} />
              {l}
            </label>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:"#475569"}}>Блоки ({sel.size}/10)</span>
          <div style={{display:"flex",gap:10}}>
            <span onClick={()=>setSel(new Set(Object.keys(M)))} style={{fontSize:12,color:"#2563eb",cursor:"pointer"}}>Все</span>
            <span onClick={()=>setSel(new Set())} style={{fontSize:12,color:"#94a3b8",cursor:"pointer"}}>Снять</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
          {Object.entries(M).map(([k,m])=>{
            const on = sel.has(k);
            return (
              <div key={k} onClick={()=>tog(k)} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 12px",borderRadius:10,cursor:"pointer",
                border:on?("2px solid "+m.c):"2px solid #e2e8f0",
                background:on?(m.c+"0d"):"#fff"
              }}>
                <span style={{fontSize:14,fontWeight:on?600:400,color:on?m.c:"#64748b"}}>{m.n}</span>
                <span style={{fontSize:12,color:"#94a3b8",background:"#f1f5f9",borderRadius:6,padding:"2px 8px"}}>{(D[k]||[]).length}</span>
              </div>
            );
          })}
        </div>
        <button onClick={start} disabled={sel.size===0} style={S.btn(sel.size>0?"#2563eb":"#cbd5e1")}>
          {"Начать тест ("+total+" вопросов)"}
        </button>
      </div>
    );
  }

  if (page==="quiz" && qs.length>0) {
    const q = qs[qi];
    const m = M[q.block];
    const prompt = q.heRu ? q.item.h : q.item.r;
    const af = q.heRu ? "r" : "h";
    const pct = ((qi+1)/qs.length*100);
    return (
      <div style={S.wrap}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,color:m.c,fontWeight:600}}>{m.n}</span>
          <span style={{fontSize:12,color:"#94a3b8"}}>{qi+1}/{qs.length}</span>
        </div>
        <div style={{height:4,background:"#e2e8f0",borderRadius:2,marginBottom:16}}>
          <div style={{height:4,background:"#2563eb",borderRadius:2,width:pct+"%",transition:"width 0.3s"}}/>
        </div>
        <div style={S.card(m.c)}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>
            {q.heRu ? "Переведите с иврита" : "Переведите на иврит"}
          </div>
          <div style={{
            fontSize: q.heRu ? 28 : 18, fontWeight:600, color:"#1e293b",
            direction: q.heRu ? "rtl" : "ltr"
          }}>
            {prompt}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {q.opts.map((opt,i)=>{
            const isOk = opt[af]===q.item[af];
            const isSel = pick && pick[af]===opt[af];
            let bg="#fff", bdr="#e2e8f0", tc="#334155";
            if (show) {
              if (isOk) { bg="#dcfce7"; bdr="#22c55e"; tc="#166534"; }
              else if (isSel) { bg="#fee2e2"; bdr="#ef4444"; tc="#991b1b"; }
              else { bg="#f8fafc"; bdr="#e2e8f0"; tc="#94a3b8"; }
            }
            return (
              <div key={i} onClick={()=>answer(opt)} style={{
                padding:"12px 14px",borderRadius:10,border:"2px solid "+bdr,
                background:bg,cursor:show?"default":"pointer",
                fontSize:q.heRu?15:20, color:tc, fontWeight:isOk&&show?600:400,
                direction:q.heRu?"ltr":"rtl", transition:"all 0.15s"
              }}>
                {opt[af]}
              </div>
            );
          })}
        </div>
        {show && (
          <div style={{padding:10,borderRadius:10,background:"#f0f9ff",border:"1px solid #bae6fd",fontSize:13,color:"#0369a1",marginBottom:12}}>
            <b>{q.item.h}</b> = {q.item.t} = {q.item.r}
          </div>
        )}
        {show && (
          <button onClick={next} style={S.btn("#2563eb")}>
            {qi+1>=qs.length ? "Результаты" : "Дальше"}
          </button>
        )}
      </div>
    );
  }

  if (page==="res") {
    const all = Object.entries(res);
    const totOk = all.reduce((s,[,r])=>s+r.ok,0);
    const totN = all.reduce((s,[,r])=>s+r.n,0);
    const pct = totN>0 ? Math.round(totOk/totN*100) : 0;
    return (
      <div style={S.wrap}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,fontWeight:800,color:pct>=70?"#16a34a":pct>=40?"#d97706":"#dc2626"}}>{pct}%</div>
          <div style={{fontSize:14,color:"#64748b"}}>{totOk} / {totN} правильно</div>
        </div>
        <div style={{fontSize:14,fontWeight:600,color:"#475569",marginBottom:10}}>Карта знаний</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {Object.entries(M).map(([k,m])=>{
            const r = res[k];
            if (!r) return null;
            const p = Math.round(r.ok/r.n*100);
            const bc = p>=80?"#22c55e":p>=50?"#eab308":"#ef4444";
            return (
              <div key={k} style={{background:"#f8fafc",borderRadius:10,padding:10,border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#334155"}}>{m.n}</span>
                  <span style={{fontSize:13,fontWeight:700,color:bc}}>{p}%</span>
                </div>
                <div style={{height:6,background:"#e2e8f0",borderRadius:3}}>
                  <div style={{height:6,background:bc,borderRadius:3,width:p+"%",transition:"width 0.5s"}}/>
                </div>
                {r.bad.length>0 && (
                  <div style={{marginTop:6,fontSize:11,color:"#94a3b8"}}>
                    {"Ошибки: "+r.bad.map(w=>w.r).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPage("menu")} style={{...S.btn("#fff","#475569"),border:"1px solid #e2e8f0",flex:1}}>
            Настройки
          </button>
          <button onClick={()=>{
            const weak = new Set(Object.entries(res).filter(([,r])=>r.ok/r.n<0.6).map(([k])=>k));
            if (weak.size>0) setSel(weak);
            start();
          }} style={{...S.btn("#2563eb"),flex:1}}>
            Повторить слабые
          </button>
        </div>
      </div>
    );
  }
  return null;
}
