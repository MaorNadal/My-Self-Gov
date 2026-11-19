/* מעקב הוצאות חודשי ומצב נסיעה לחו"ל (v0.20). אחסון: gov_money ו-gov_trips דרך GOV.rd/GOV.wr (נכלל בייצוא ובסנכרון הרגילים).
   מקור אמת אחד להוצאות: gov_money.entries. הוצאה של נסיעה היא אותה רשומה עם tripId, ולכן היא מופיעה אוטומטית גם במעקב החודשי (בקטגוריה "נסיעות").
   סכום תמיד נשמר בשקלים (amount). לנסיעה נשמר גם הסכום המקורי, המטבע והשער. שער החליפין מוזן ידנית (אין קריאה לשירות חיצוני). */
(function () {
    'use strict';
    const G = window.GOV, str = (v, n) => String(v == null ? '' : v).trim().slice(0, n), DATE = /^\d{4}-\d{2}-\d{2}$/, MON = /^\d{4}-\d{2}$/;
    const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : d; };
    const CATS = { food: ['🛒', 'מזון וסופר'], rest: ['🍽️', 'מסעדות וקפה'], home: ['🏠', 'דיור וחשבונות'], transport: ['🚗', 'תחבורה ורכב'], health: ['💊', 'בריאות'], fun: ['🎬', 'בילויים ופנאי'], shop: ['🛍️', 'קניות'], edu: ['📚', 'לימודים'], trip: ['✈️', 'נסיעות'], other: ['📦', 'אחר'] };
    const TCATS = { flight: ['🛫', 'טיסות'], lodging: ['🏨', 'לינה'], food: ['🍽️', 'אוכל'], local: ['🚕', 'תחבורה מקומית'], fun: ['🎟️', 'אטרקציות ובילוי'], shop: ['🛍️', 'קניות'], comms: ['📱', 'תקשורת'], insur: ['🛡️', 'ביטוח וויזה'], other: ['📦', 'אחר'] };
    const CUR = { BRL: ['ריאל ברזילאי', 'R$'], USD: ['דולר', '$'], EUR: ['יורו', '€'], GBP: ['לירה שטרלינג', '£'], ILS: ['שקל', '₪'] };
    // ---------- הוצאות ----------
    const cleanE = p => { const o = p && typeof p === 'object' ? p : {}, tcat = TCATS[o.tcat] ? o.tcat : '', trip = str(o.tripId, 40); return { id: str(o.id, 40) || G.uid(), date: DATE.test(o.date) ? o.date : G.localDate(), amount: num(o.amount, 0.01, 10000000, 0), cat: trip ? 'trip' : (CATS[o.cat] ? o.cat : 'other'), note: str(o.note, 120), tripId: trip, tcat: trip ? (tcat || 'other') : '', orig: trip && o.orig && typeof o.orig === 'object' ? { amt: num(o.orig.amt, 0.01, 100000000, 0), cur: CUR[o.orig.cur] ? o.orig.cur : 'ILS', rate: num(o.orig.rate, 0.0001, 100000, 1) } : null }; };
    const cleanM = p => { const o = p && typeof p === 'object' ? p : {}, b = {}, ob = o.budgets && typeof o.budgets === 'object' ? o.budgets : {}; Object.keys(CATS).forEach(k => { const v = num(ob[k], 0, 10000000, 0); if (v) b[k] = v; }); return { entries: (Array.isArray(o.entries) ? o.entries : []).filter(x => x && typeof x === 'object').map(cleanE).filter(e => e.amount > 0), budgets: b, total: num(o.total, 0, 100000000, 0) }; };
    const read = () => cleanM(G.rd('money', {})), write = m => G.wr('money', m);
    const money = {
        CATS, TCATS, CUR,
        all: () => read().entries.sort((a, b) => b.date.localeCompare(a.date)),
        month: mk => read().entries.filter(e => e.date.slice(0, 7) === mk).sort((a, b) => b.date.localeCompare(a.date)),
        add(o) { const e = cleanE(o); if (!(e.amount > 0)) return { ok: false, error: 'הסכום חייב להיות גדול מאפס.' }; if (e.date > G.addDays(G.localDate(), 1)) return { ok: false, error: 'אי אפשר לרשום הוצאה עתידית.' }; const m = read(); m.entries.push(e); return write(m) ? { ok: true, entry: e } : { ok: false, error: 'השמירה נכשלה.' }; },
        remove(id) { const m = read(); m.entries = m.entries.filter(e => e.id !== id); return write(m); },
        budgets: () => read().budgets, total: () => read().total,
        setBudgets(b, total) { const m = read(); m.budgets = cleanM({ budgets: b }).budgets; m.total = num(total, 0, 100000000, 0); return write(m); },
        summary(mk) {
            const m = read(), es = m.entries.filter(e => e.date.slice(0, 7) === mk), by = {}; Object.keys(CATS).forEach(k => { by[k] = 0; }); es.forEach(e => { by[e.cat] += e.amount; });
            const spent = es.reduce((s, e) => s + e.amount, 0), dim = G.daysInMonth(mk), td = G.localDate(), day = td.slice(0, 7) === mk ? Number(td.slice(8)) : (td.slice(0, 7) > mk ? dim : 0), cum = []; let c = 0;
            for (let d = 1; d <= dim; d++) { const ds = mk + '-' + G.pad(d); c += es.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0); cum.push(ds > td ? null : Math.round(c)); }
            const sumB = Object.values(m.budgets).reduce((s, v) => s + v, 0), budget = m.total || sumB || 0, pace = day ? spent / day * dim : 0, tripSpent = es.filter(e => e.tripId).reduce((s, e) => s + e.amount, 0);
            return { mk, spent, by, budgets: m.budgets, budget, remaining: budget ? budget - spent : null, pace: Math.round(pace), over: budget ? pace > budget : false, cum, day, dim, n: es.length, tripSpent, daily: day ? spent / day : 0 };
        },
        csv(mk) { const rows = [['תאריך', 'סכום בשקלים', 'קטגוריה', 'הערה', 'נסיעה', 'מקורי', 'מטבע']].concat(money.month(mk).map(e => [e.date, e.amount, CATS[e.cat][1], e.note, e.tripId ? 'כן' : '', e.orig ? e.orig.amt : '', e.orig ? e.orig.cur : ''])); return '﻿' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'); }
    };
    // ---------- נסיעות ----------
    const TEMPLATE = {
        docs: ['דרכון בתוקף (מומלץ לפחות 6 חודשים מיום החזרה)', 'כרטיסי טיסה וצילום שלהם', 'הזמנות לינה מודפסות או שמורות במכשיר', 'ביטוח נסיעות כולל רפואי (ובדיקת כיסוי לפעילויות)', 'בדיקת דרישות כניסה (ויזה, טפסים, חיסונים) באתר רשמי של היעד ושל משרד החוץ'],
        money: ['הודעה לבנק/חברת האשראי על הנסיעה', 'מזומן קטן במטבע המקומי לימים הראשונים', 'כרטיס אשראי בינלאומי ובדיקת עמלות המרה', 'עדכון שער חליפין והתקציב בדף הזה'],
        health: ['חיסונים והמלצות בריאות ליעד (מרפאת מטייל / משרד הבריאות)', 'תרופות קבועות עם מרשם ומינון, בכמות גדולה מהנדרש', 'תיק עזרה ראשונה בסיסי, קרם הגנה, דוחה יתושים'],
        tech: ['מטען ומתאם שקע (בדוק את סוג השקע והמתח של היעד)', 'חבילת גלישה או כרטיס SIM מקומי', 'הורדת מפות לא מקוונות', 'הורדת האפליקציות החשובות והתחברות מראש', 'גיבוי תמונות ומסמכים בענן'],
        learn: ['להתאמן על המילים הכי חיוניות בדף פורטוגזית (תרגול רציף)', 'לשמור ביטויי חירום ובקשות בסיסיות', 'להכין כמה משפטים לתרגול בקול'],
        pack: ['בגדים מותאמים לאקלים בתקופת הנסיעה', 'נעליים נוחות', 'מטריה או מעיל גשם', 'מגבת מהירת ייבוש ותיק יום קטן', 'עותק דיגיטלי של כל המסמכים']
    };
    const GROUPS = { docs: ['📄', 'מסמכים וכניסה'], money: ['💳', 'כסף'], health: ['🩺', 'בריאות'], tech: ['📱', 'טכנולוגיה'], learn: ['🇧🇷', 'שפה'], pack: ['🧳', 'ציוד'] };
    const BRAZIL = { dest: 'ברזיל', cur: 'BRL', info: [['חירום', 'משטרה 190 · אמבולנס (SAMU) 192 · כבאים 193. שמור את המספרים המקומיים לפני הנסיעה ובדוק אותם גם במקור רשמי.'], ['שפה', 'פורטוגזית ברזילאית. באזורי תיירות מדברים לעיתים אנגלית, אבל לא תמיד.'], ['חשמל', 'שקעים מסוג C ו-N, ומתח 127V או 220V לפי האזור (בדוק את המכשירים שלך).'], ['אזור זמן', 'ריו, סאו פאולו וברזיליה: UTC-3 קבוע (בלי שעון קיץ), כלומר 5 שעות אחרי ישראל בחורף ו-6 בקיץ. באמזונס ובמערב ההפרש גדול יותר.'], ['כסף', 'ריאל ברזילאי (R$). כרטיסי אשראי נפוצים; בשווקים ובחופים כדאי מזומן. PIX הוא תשלום מקומי שדורש חשבון מקומי.'], ['טיפ', 'במסעדות לרוב נוסף 10% שירות לחשבון (בדוק לפני שמוסיפים).'], ['בריאות', 'בדוק מול גורם רשמי חיסונים מומלצים (חום צהוב באזורים מסוימים) וביטוח רפואי.'], ['תחבורה', 'Uber ו-99 נפוצות. ברחוב תפעיל זהירות עם הטלפון והתיק, בעיקר בערים הגדולות.'], ['⚠️ חשוב', 'פרטי כניסה, ויזה וחיסונים משתנים. אמת מול משרד החוץ והשגרירות לפני הטיסה. הרשימה כאן היא תזכורת, לא מקור רשמי.']] };
    const cleanT = p => { const t = cleanT0(p), r = rateOf(t, t.bcur); if (t.bcur !== 'ILS' && !(r > 0)) { const raw = p && typeof p === 'object' ? num(p.budget, 0, 100000000, 0) : 0; t.budget = raw; } else t.budget = Math.round(t.bamt * (r > 0 ? r : 1) * 100) / 100; return t; };
    const rateOf = (t, code) => code === 'ILS' ? 1 : code === 'USD' ? (t.cur === 'USD' ? t.rate : t.usd) : code === 'LOC' ? (t.cur === 'ILS' ? 1 : t.rate) : (code === t.cur ? (t.cur === 'ILS' ? 1 : t.rate) : 0);
    const cleanT0 = p => {
        const o = p && typeof p === 'object' ? p : {}, cur = CUR[o.cur] ? o.cur : 'USD', ck = (Array.isArray(o.checklist) ? o.checklist : []).slice(0, 200).map(c => ({ id: str(c && c.id, 40) || G.uid(), g: GROUPS[c && c.g] ? c.g : 'pack', t: str(c && c.t, 160), done: !!(c && c.done) })).filter(c => c.t);
        return { id: str(o.id, 40) || G.uid(), dest: str(o.dest, 60), from: DATE.test(o.from) ? o.from : '', to: DATE.test(o.to) ? o.to : '', cur, rate: num(o.rate, 0.0001, 100000, 1), usd: num(o.usd, 0, 100000, 0), bcur: ['ILS', 'USD', 'LOC'].includes(o.bcur) ? o.bcur : 'ILS', bamt: o.bamt != null ? num(o.bamt, 0, 100000000, 0) : num(o.budget, 0, 100000000, 0), budget: 0, rtAt: DATE.test(o.rtAt) ? o.rtAt : '', rtSrc: o.rtSrc === 'auto' ? 'auto' : 'manual', checklist: ck, info: (Array.isArray(o.info) ? o.info : []).slice(0, 40).map(i => [str(i && i[0], 40), str(i && i[1], 400)]).filter(i => i[0] || i[1]), notes: str(o.notes, 1500), created: DATE.test(o.created) ? o.created : G.localDate() };
    };
    const tripsAll = () => { const v = G.rd('trips', []); return (Array.isArray(v) ? v : []).filter(x => x && typeof x === 'object').map(cleanT); };
    const trips = {
        GROUPS, CUR, TCATS, BRAZIL,
        all: () => tripsAll().sort((a, b) => (b.from || b.created).localeCompare(a.from || a.created)), get: id => tripsAll().find(t => t.id === id) || null,
        save(o) { const t = cleanT(o); if (t.dest.length < 2) return { ok: false, error: 'כתוב יעד.' }; if (t.from && t.to && t.to < t.from) return { ok: false, error: 'תאריך החזרה לפני היציאה.' }; const l = tripsAll(), i = l.findIndex(x => x.id === t.id); if (i >= 0) l[i] = t; else l.push(t); return G.wr('trips', l) ? { ok: true, trip: t } : { ok: false, error: 'השמירה נכשלה.' }; },
        create(dest, o) { o = o || {}; const brazil = /ברזיל|brazil|brasil/i.test(dest), checklist = []; Object.keys(TEMPLATE).forEach(g => TEMPLATE[g].forEach(t => checklist.push({ g, t, done: false }))); return trips.save({ dest, from: o.from, to: o.to, cur: o.cur || (brazil ? 'BRL' : 'USD'), rate: o.rate || 1, usd: o.usd || 0, bcur: o.bcur, bamt: o.bamt != null ? o.bamt : o.budget, checklist, info: brazil ? BRAZIL.info : [] }); },
        remove(id) { G.wr('trips', tripsAll().filter(t => t.id !== id)); const m = read(); m.entries = m.entries.filter(e => e.tripId !== id); return write(m); },
        toggle(id, cid) { const t = trips.get(id); if (!t) return false; const c = t.checklist.find(x => x.id === cid); if (!c) return false; c.done = !c.done; return trips.save(t).ok; },
        addCheck(id, g, text) { const t = trips.get(id); if (!t || str(text, 160).length < 2) return false; t.checklist.push({ id: G.uid(), g, t: text, done: false }); return trips.save(t).ok; },
        removeCheck(id, cid) { const t = trips.get(id); if (!t) return false; t.checklist = t.checklist.filter(c => c.id !== cid); return trips.save(t).ok; },
        // ---- מטבעות (v0.23): שקל, דולר ומטבע מקומי; שערים ידניים (או מהרשת בלחיצה) ----
        rateOf, // (trip, 'ILS'|'USD'|'LOC'|קוד מטבע) -> כמה שקלים ב-1 יחידה, או 0 אם השער לא ידוע
        curs: t => { const l = ['ILS', 'USD']; if (!l.includes(t.cur)) l.push(t.cur); return l; },
        toIls: (t, amt, code) => { const r = rateOf(t, code); return r > 0 ? Math.round(amt * r * 100) / 100 : null; },
        conv(t, ils) { const o = {}; trips.curs(t).forEach(c => { const r = rateOf(t, c); o[c] = r > 0 ? ils / r : null; }); return o; },
        async fetchRates(id, f) {   // מביא שער עדכני מהרשת (open.er-api.com, ללא מפתח). בכשל לא משנה כלום.
            const t = trips.get(id); if (!t) return { ok: false, error: 'הנסיעה לא נמצאה.' };
            try { const ac = typeof AbortController === 'function' ? new AbortController() : null, to = ac ? setTimeout(() => ac.abort(), 9000) : null, res = await (f || window.fetch)('https://open.er-api.com/v6/latest/USD', ac ? { signal: ac.signal } : undefined); if (to) clearTimeout(to);
                const j = await res.json(), r = j && j.rates, ils = r && Number(r.ILS), loc = t.cur === 'USD' ? 1 : t.cur === 'ILS' ? ils : r && Number(r[t.cur]);
                if (!(j && j.result === 'success') || !(ils > 0.5 && ils < 50) || !(loc > 0)) return { ok: false, error: 'התקבלה תשובה לא תקינה מהשירות. השערים לא שונו.' };
                t.usd = Math.round(ils * 10000) / 10000; if (t.cur === 'USD') t.rate = t.usd; else if (t.cur !== 'ILS') t.rate = Math.round(ils / loc * 1000000) / 1000000; t.rtAt = G.localDate(); t.rtSrc = 'auto';
                const sv = trips.save(t); return sv.ok ? { ok: true, trip: sv.trip } : sv; } catch (e) { return { ok: false, error: 'אין חיבור או שהשירות לא זמין. אפשר להזין שער ידנית.' }; }
        },
        addExpense(id, o) { const t = trips.get(id); if (!t) return { ok: false, error: 'הנסיעה לא נמצאה.' }; const amt = num(o.amt, 0.01, 100000000, 0); if (!amt) return { ok: false, error: 'הזן סכום.' }; const code = o.cur == null || o.cur === '' ? t.cur : o.cur; if (!trips.curs(t).includes(code)) return { ok: false, error: 'מטבע לא נתמך בנסיעה הזו.' }; let rate = rateOf(t, code); const ov = num(o.rate, 0, 100000, 0); if (code !== 'ILS' && ov >= 0.0001) rate = ov; if (!(rate > 0)) return { ok: false, error: code === 'USD' ? 'הגדר שער דולר-שקל בהגדרות הנסיעה.' : 'הגדר שער חליפין בנסיעה.' }; return money.add({ date: o.date, amount: Math.round(amt * rate * 100) / 100, tripId: id, tcat: o.tcat, note: o.note, orig: { amt, cur: code, rate } }); },
        expenses: id => read().entries.filter(e => e.tripId === id).sort((a, b) => b.date.localeCompare(a.date)),
        daysTo(t) { if (!t.from) return null; const a = new Date(G.localDate() + 'T12:00:00Z'), b = new Date(t.from + 'T12:00:00Z'); return Math.round((b - a) / 86400000); },
        length(t) { if (!t.from || !t.to) return null; return Math.round((new Date(t.to + 'T12:00:00Z') - new Date(t.from + 'T12:00:00Z')) / 86400000) + 1; },
        stats(id) {
            const t = trips.get(id); if (!t) return null; const es = trips.expenses(id), spent = es.reduce((s, e) => s + e.amount, 0), by = {}; Object.keys(TCATS).forEach(k => { by[k] = 0; }); es.forEach(e => { by[e.tcat || 'other'] += e.amount; });
            const len = trips.length(t), td = G.localDate(), dd = t.from && t.to ? (td < t.from ? 0 : td > t.to ? len : Math.round((new Date(td + 'T12:00:00Z') - new Date(t.from + 'T12:00:00Z')) / 86400000) + 1) : 0, left = len ? Math.max(0, len - dd) : null;
            const orig = es.filter(e => e.orig && e.orig.cur === t.cur).reduce((s, e) => s + e.orig.amt, 0), ck = t.checklist, cd = ck.filter(c => c.done).length;
            return { trip: t, spent, by, orig, n: es.length, len, day: dd, left, remaining: t.budget ? t.budget - spent : null, perDay: dd ? spent / dd : null, allowDay: t.budget && left ? (t.budget - spent) / left : null, projected: dd && len ? spent / dd * len : null, daysTo: trips.daysTo(t), check: { done: cd, total: ck.length, pct: ck.length ? Math.round(cd / ck.length * 100) : 0 } };
        },
        next() { const td = G.localDate(); return trips.all().filter(t => !t.to || t.to >= td).sort((a, b) => (a.from || '9999').localeCompare(b.from || '9999'))[0] || null; }
    };
    window.GOV_MONEY = { money, trips };
})();
