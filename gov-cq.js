/* השאלון המרכזי ליסודות (v0.20): מכשיר רב-שיטתי. כלי רפלקציה סמלי, ללא תוקף מדעי או פסיכומטרי מוכח.
   שיטות: (1) בחר-הכי/הכי-פחות (BWS), (2) תדירות התנהגות בשלושת החודשים האחרונים, כולל היגדים הפוכים, (3) הכרעה בין זוגות יסודות,
   (4) תרחישים (בחירה כפויה) מתוך מאגר התרחישים, (5) אותו היגד פעמיים: בימים רגילים ובלחץ.
   מעל זה: בדיקות תקפות (רצוי חברתי, עקביות בניסוח חוזר, מהירות, קו ישר, הסכמה, קיצוניות), אי-ודאות בבוטסטראפ,
   הפרדה בין "ליבה" (מניעים והתנהגות מכרעת) ל"סגנון" (הרגלים וטעם), והסבר אילו תשובות הכריעו.
   אחסון: gov_cq דרך GOV.rd/GOV.wr (נכלל בייצוא ובסנכרון הרגילים). אין תלות בשירות חיצוני ואין סודות. */
(function () {
    'use strict';
    const G = window.GOV, BANK = window.GOV_CQ_BANK;
    const KEY = 'cq', EK = ['fire', 'water', 'earth', 'air'];
    const EL = { fire: { l: 'אש', ic: '🔥' }, water: { l: 'מים', ic: '💧' }, earth: { l: 'אדמה', ic: '🪨' }, air: { l: 'אוויר', ic: '💨' } };
    const METH = { bws: 'בחר הכי / הכי פחות', frq: 'תדירות התנהגות', prs: 'הכרעה בין שני מצבים', sjt: 'תרחישים', frm: 'רגיל מול לחץ' };
    const WM = { bws: 0.30, sjt: 0.20, frq: 0.20, prs: 0.20, frm: 0.10 }, NOMINAL = { bws: 12, sjt: 8, frq: 24, prs: 12, frm: 8 };
    const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const scenItems = () => (window.GOV_SCEN && window.GOV_SCEN.ITEMS) || [];
    const sceById = id => scenItems().find(x => x.id === id);

    // ---------- אחסון ----------
    const kinds = { b: i => BANK.bws[i], f: i => BANK.frq[i], p: i => BANK.prs[i], r: i => BANK.frm[i], d: i => BANK.sd[i], a: i => BANK.rt[i], c: i => BANK.rt[i] };
    const validKey = k => { if (typeof k !== 'string' || k.length < 2) return false; if (k[0] === 'j') return !!sceById(k.slice(1)); const i = Number(k.slice(1)); return Number.isInteger(i) && i >= 0 && !!(kinds[k[0]] && kinds[k[0]](i)); };
    const int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
    function cleanAns(k, v) {
        if (k[0] === 'b') { const m = int(v && v.m, 0, 3), l = int(v && v.l, 0, 3); return m != null && l != null && m !== l ? { m, l } : null; }
        if (k[0] === 'p') return int(v, 0, 2);
        if (k[0] === 'j') return int(v, 0, 3);
        if (k[0] === 'r') { const c = int(v && v.c, 1, 5), s = int(v && v.s, 1, 5); return c != null && s != null ? { c, s } : null; }
        return int(v, 1, 5);
    }
    const clean = p => {
        const o = p && typeof p === 'object' ? p : {}, plan = (Array.isArray(o.plan) ? o.plan : []).filter((k, i, a) => validKey(k) && a.indexOf(k) === i), ans = {}, t = {};
        const A = o.ans && typeof o.ans === 'object' ? o.ans : {}, T = o.t && typeof o.t === 'object' ? o.t : {};
        plan.forEach(k => { const v = Object.prototype.hasOwnProperty.call(A, k) ? cleanAns(k, A[k]) : null; if (v != null) ans[k] = v; const ms = Number(T[k]); if (ans[k] != null && Number.isFinite(ms) && ms >= 0 && ms < 3600000) t[k] = Math.round(ms); });
        const hist = (Array.isArray(o.hist) ? o.hist : []).slice(-12).map(h => ({ at: /^\d{4}-\d{2}-\d{2}$/.test(h && h.at) ? h.at : G.localDate(), n: int(h && h.n, 0, 5000) || 0, sh: (Array.isArray(h && h.sh) ? h.sh : []).slice(0, 4).map(x => int(x, 0, 100) || 0) }));
        return { id: String(o.id || G.uid()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || G.uid(), created: /^\d{4}-\d{2}-\d{2}$/.test(o.created) ? o.created : G.localDate(), mode: o.mode === 'full' ? 'full' : 'quick', plan, ans, t, pos: int(o.pos, 0, 5000) || 0, done: o.done === true, doneAt: /^\d{4}-\d{2}-\d{2}$/.test(o.doneAt) ? o.doneAt : '', hist };
    };
    const all = () => { const v = G.rd(KEY, []); return (Array.isArray(v) ? v : []).filter(x => x && typeof x === 'object').map(clean); };
    const saveAll = l => G.wr(KEY, l);
    const get = id => all().find(x => x.id === id) || null;
    const put = a => { const l = all(), i = l.findIndex(x => x.id === a.id); const c = clean(a); if (i >= 0) l[i] = c; else l.push(c); return saveAll(l) ? c : null; };

    // ---------- בניית תוכנית ----------
    const pickBalanced = (idxs, per, getE, r, revOf) => { // איזון בין יסודות, והיגדים הפוכים כרבע
        const by = [[], [], [], []]; shuffle(idxs, r).forEach(i => by[getE(i)].push(i)); let out = [];
        by.forEach(l => { const rev = l.filter(i => revOf && revOf(i)), pos = l.filter(i => !(revOf && revOf(i))), nr = revOf ? Math.max(1, Math.round(per / 4)) : 0; out = out.concat(pos.slice(0, per - nr), rev.slice(0, nr)); });
        return out;
    };
    function buildPlan(mode, id, usedSet) {
        const q = mode === 'quick', r = rng(hash(id)), used = usedSet || new Set(), freeB = i => !used.has('b' + i), freeF = i => !used.has('f' + i), freeP = i => !used.has('p' + i), freeR = i => !used.has('r' + i);
        const bc = BANK.bws.map((x, i) => i).filter(i => BANK.bws[i][0] === 1 && freeB(i)), bs = BANK.bws.map((x, i) => i).filter(i => BANK.bws[i][0] === 0 && freeB(i)), nb = q ? 6 : 12;
        const bws = shuffle(shuffle(bc, r).slice(0, nb).concat(shuffle(bs, r).slice(0, nb)), r).map(i => 'b' + i);
        const fIdx = BANK.frq.map((x, i) => i).filter(freeF), nf = q ? 6 : 10, frq = shuffle(pickBalanced(fIdx, nf, i => BANK.frq[i][0], r, i => BANK.frq[i][2] === 1), r).map(i => 'f' + i);
        const pairs = {}; BANK.prs.forEach((x, i) => { if (freeP(i)) (pairs[x[0] + '-' + x[1]] = pairs[x[0] + '-' + x[1]] || []).push(i); });
        let prs = []; Object.keys(pairs).forEach(k => { prs = prs.concat(shuffle(pairs[k], r).slice(0, q ? 2 : 4)); }); prs = shuffle(prs, r).map(i => 'p' + i);
        const rIdx = BANK.frm.map((x, i) => i).filter(freeR), nr = q ? 2 : 4, frm = shuffle(pickBalanced(rIdx, nr, i => BANK.frm[i][0], r, null), r).map(i => 'r' + i);
        const sc = scenItems(), byD = {}; sc.forEach(s => { if (!used.has('j' + s.id)) (byD[s.d] = byD[s.d] || []).push(s.id); });
        let sjt = []; const ds = shuffle(Object.keys(byD), r); for (let n = 0; sjt.length < (q ? 8 : 16) && ds.length && n < 40; n++) { const d = ds[n % ds.length]; const l = byD[d]; if (l && l.length) sjt.push(l.splice(Math.floor(r() * l.length), 1)[0]); } sjt = sjt.map(s => 'j' + s);
        const nsd = q ? 4 : 8, sdAll = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => !used.has('d' + i)), sdA0 = shuffle(sdAll.filter(i => BANK.sd[i][0] === 1), r), sdB0 = shuffle(sdAll.filter(i => BANK.sd[i][0] !== 1), r), sdI = shuffle(sdA0.slice(0, Math.min(sdA0.length, Math.ceil(nsd / 2))).concat(sdB0).concat(sdA0.slice(Math.ceil(nsd / 2))).slice(0, nsd), r).map(i => 'd' + i);   // לפחות חצי מפריטי הרצייה החברתית הם מהסוג שמזהה אידיאליזציה, כדי שהבדיקה תפעל גם בגרסה המהירה
        const rt = shuffle(BANK.rt.map((x, i) => i).filter(i => !used.has('a' + i)), r).slice(0, q ? 4 : 8);
        const stage2 = shuffle(frq.concat(sdI, rt.map(i => 'a' + i)), r), stage5 = shuffle(sjt.concat(rt.map(i => 'c' + i)), r);
        return bws.concat(stage2, prs, frm, stage5);
    }
    function create(mode) { const id = G.uid(), m = mode === 'full' ? 'full' : 'quick'; return put({ id, mode: m, plan: buildPlan(m, id), ans: {}, t: {}, pos: 0, created: G.localDate() }); }
    // המשך ללא הגבלה: כל לחיצה מוסיפה מנה חדשה מהפריטים שטרם נשאלו (ממוקדת בשני היסודות הצמודים אם התוצאה לא חדה), עד שהמאגר מתרוקן
    function nextChunk(id) {
        const a = get(id); if (!a) return 0; const used = new Set(a.plan), s = score(a), r = rng(hash(id + ':' + a.plan.length)); let add = [];
        const top2 = s && s.ready ? s.rank.slice(0, 2).map(e => EK.indexOf(e)) : null, close = s && s.ready && s.conf.level !== 'clear';
        const freeP = BANK.prs.map((x, i) => i).filter(i => !used.has('p' + i)); let pp = freeP;
        if (close && top2) { const pri = freeP.filter(i => [BANK.prs[i][0], BANK.prs[i][1]].every(e => top2.includes(e))), rest = freeP.filter(i => !pri.includes(i)); pp = shuffle(pri, r).concat(shuffle(rest, r)); } else pp = shuffle(freeP, r);
        add = add.concat(pp.slice(0, 10).map(i => 'p' + i));
        add = add.concat(shuffle(BANK.bws.map((x, i) => i).filter(i => !used.has('b' + i)), r).slice(0, 6).map(i => 'b' + i));
        add = add.concat(pickBalanced(BANK.frq.map((x, i) => i).filter(i => !used.has('f' + i)), 3, i => BANK.frq[i][0], r, i => BANK.frq[i][2] === 1).map(i => 'f' + i));
        add = add.concat(shuffle(BANK.frm.map((x, i) => i).filter(i => !used.has('r' + i)), r).slice(0, 4).map(i => 'r' + i));
        const sc = scenItems().filter(x => !used.has('j' + x.id)); add = add.concat(shuffle(sc, r).slice(0, 8).map(x => 'j' + x.id));
        if (!add.length) return 0; a.plan = a.plan.concat(shuffle(add, r)); a.done = false; put(a); return add.length;
    }
    const remaining = id => { const a = get(id); if (!a) return 0; const used = new Set(a.plan); return BANK.bws.filter((x, i) => !used.has('b' + i)).length + BANK.frq.filter((x, i) => !used.has('f' + i)).length + BANK.prs.filter((x, i) => !used.has('p' + i)).length + BANK.frm.filter((x, i) => !used.has('r' + i)).length + scenItems().filter(x => !used.has('j' + x.id)).length; };

    // ---------- הצגה: סדר אפשרויות מעורבב (קבוע לסשן) ----------
    function view(a, key) {
        const k = key[0], i = k === 'j' ? null : Number(key.slice(1)), r = rng(hash(a.id + key));
        if (k === 'b') { const it = BANK.bws[i], ord = shuffle([0, 1, 2, 3], r); return { type: 'bws', method: 'bws', key, core: it[0] === 1, opts: ord.map(e => ({ e, t: it[2][e] })) }; }
        if (k === 'j') { const it = sceById(key.slice(1)), ord = shuffle([0, 1, 2, 3], r); return { type: 'sjt', method: 'sjt', key, q: it.q, opts: ord.map(e => ({ e, t: it.o[e] })) }; }
        if (k === 'p') { const it = BANK.prs[i], flip = r() < 0.5, A = { e: it[0], t: it[3] }, B = { e: it[1], t: it[4] }; return { type: 'prs', method: 'prs', key, core: it[2] === 1, opts: flip ? [B, A] : [A, B] }; }
        if (k === 'r') { const it = BANK.frm[i]; return { type: 'frm', method: 'frm', key, t: it[2] }; }
        if (k === 'f') { const it = BANK.frq[i]; return { type: 'lik', method: 'frq', key, t: it[3], scale: 'freq' }; }
        if (k === 'a' || k === 'c') { const it = BANK.rt[i]; return { type: 'lik', method: 'frq', key, t: k === 'a' ? it[1] : it[2], scale: 'agree' }; }
        if (k === 'd') { const it = BANK.sd[i]; return { type: 'lik', method: 'sd', key, t: it[1], scale: 'agree' }; }
        return null;
    }

    // ---------- ניקוד ----------
    const ev = (m, vec, opp, w, core, txt, key) => ({ m, vec, opp, w, core, txt, key });
    function units(a) {
        const U = [], v5 = x => (x - 3) / 2;
        Object.keys(a.ans).forEach(key => {
            const k = key[0], x = a.ans[key], i = k === 'j' ? null : Number(key.slice(1)), one = e => { const v = [0, 0, 0, 0]; return v; };
            if (k === 'b') { const it = BANK.bws[i], vec = [0, 0, 0, 0]; vec[x.m] += 1; vec[x.l] -= 1; U.push(ev('bws', vec, [1, 1, 1, 1], it[0] ? 2 : 1, it[0] === 1, { most: it[2][x.m], least: it[2][x.l], em: x.m, el: x.l }, key)); }
            else if (k === 'f') { const it = BANK.frq[i], v = (it[2] ? -1 : 1) * v5(x), vec = [0, 0, 0, 0], opp = [0, 0, 0, 0]; vec[it[0]] = v; opp[it[0]] = 1; U.push(ev('frq', vec, opp, it[1] ? 2 : 1, it[1] === 1, { t: it[3], x, rev: it[2] === 1 }, key)); }
            else if (k === 'a' || k === 'c') { const it = BANK.rt[i], vec = [0, 0, 0, 0], opp = [0, 0, 0, 0]; vec[it[0]] = v5(x); opp[it[0]] = 1; U.push(ev('frq', vec, opp, 1, false, { t: k === 'a' ? it[1] : it[2], x, rev: false }, key)); }
            else if (k === 'p') { const it = BANK.prs[i], vec = [0, 0, 0, 0], opp = [0, 0, 0, 0]; opp[it[0]] = 1; opp[it[1]] = 1; if (x === 0) { vec[it[0]] = 1; vec[it[1]] = -1; } else if (x === 1) { vec[it[1]] = 1; vec[it[0]] = -1; } U.push(ev('prs', vec, opp, it[2] ? 2 : 1, it[2] === 1, { won: x === 2 ? null : (x === 0 ? it[3] : it[4]), lost: x === 2 ? null : (x === 0 ? it[4] : it[3]), ew: x === 2 ? null : (x === 0 ? it[0] : it[1]), el: x === 2 ? null : (x === 0 ? it[1] : it[0]) }, key)); }
            else if (k === 'r') { const it = BANK.frm[i], vec = [0, 0, 0, 0], opp = [0, 0, 0, 0]; vec[it[0]] = v5((x.c + x.s) / 2); opp[it[0]] = 1; U.push(Object.assign(ev('frm', vec, opp, 1, true, { t: it[2], c: x.c, s: x.s }, key), { c: x.c, s: x.s, e: it[0] })); }
            else if (k === 'j') { const vec = [0, 0, 0, 0]; vec[x] = 1; const it = sceById(key.slice(1)); U.push(ev('sjt', vec, [1, 1, 1, 1], 1, true, { q: it.q, t: it.o[x], e: x }, key)); }
        });
        return U;
    }
    const mean = l => l.length ? l.reduce((s, v) => s + v, 0) / l.length : 0;
    function methodU(us) { const u = [0, 0, 0, 0], d = [0, 0, 0, 0]; us.forEach(x => { for (let e = 0; e < 4; e++) { u[e] += x.w * x.vec[e]; d[e] += x.w * x.opp[e]; } }); return u.map((v, e) => d[e] ? v / d[e] : 0); }
    function zs(u) { const m = mean(u), sd = Math.sqrt(mean(u.map(v => (v - m) * (v - m)))) || 0, f = Math.max(sd, 0.12); return u.map(v => (v - m) / f); }
    function combine(us, extraN) {
        const by = {}; us.forEach(x => { (by[x.m] = by[x.m] || []).push(x); });
        const ms = Object.keys(by).filter(m => by[m].length >= 2), Z = {}; let tot = 0; const C = [0, 0, 0, 0];
        ms.forEach(m => { const z = zs(methodU(by[m])); Z[m] = z; const w = WM[m] * Math.min(1, Math.sqrt(by[m].length / NOMINAL[m])); tot += w; z.forEach((v, e) => { C[e] += w * v; }); });
        return { C: tot ? C.map(v => v / tot) : [0, 0, 0, 0], Z, n: ms.reduce((s, m) => s + by[m].length, 0) };
    }
    const softmax = (C, tau) => { const m = Math.max.apply(null, C), ex = C.map(v => Math.exp(tau * (v - m))), s = ex.reduce((a, b) => a + b, 0); return ex.map(v => v / s * 100); };
    function roundShares(sh) { const fl = sh.map(Math.floor); let rest = 100 - fl.reduce((a, b) => a + b, 0); sh.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(x => { if (rest > 0) { fl[x[1]]++; rest--; } }); return fl; }
    function ranks(z) { const idx = z.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]), r = [0, 0, 0, 0]; let i = 0; while (i < 4) { let j = i; while (j + 1 < 4 && Math.abs(idx[j + 1][0] - idx[i][0]) < 1e-9) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; }
    function spearman(z1, z2) { const a = ranks(z1), b = ranks(z2), ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < 4; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; }

    function quality(a, us, conv) {
        const flags = [], L = [], keys = Object.keys(a.ans), ts = keys.map(k => a.t[k]).filter(v => v != null).sort((x, y) => x - y), med = ts.length ? ts[Math.floor(ts.length / 2)] : null;
        if (med != null && ts.length >= 15 && med < 1800) flags.push({ k: 'speed', l: 'מהירות גבוהה מאוד', d: 'זמן חציוני של ' + (med / 1000).toFixed(1) + ' שניות לשאלה. ייתכן שלא קראת כל שאלה.', w: 2 });
        const lik = keys.filter(k => k[0] === 'f' || k[0] === 'a' || k[0] === 'c').map(k => ({ x: a.ans[k], rev: k[0] === 'f' && BANK.frq[Number(k.slice(1))][2] === 1 }));
        if (lik.length >= 12) {
            const xs = lik.map(o => o.x), m = mean(xs), sd = Math.sqrt(mean(xs.map(v => (v - m) ** 2)));
            if (sd < 0.55) flags.push({ k: 'line', l: 'תשובות כמעט זהות', d: 'כמעט כל היגדי התדירות קיבלו את אותו ציון (סטיית תקן ' + sd.toFixed(2) + ').', w: 2 });
            const hi = xs.filter(v => v >= 4).length / xs.length; if (hi > 0.72) flags.push({ k: 'acq', l: 'נטייה להסכים עם הכול', d: Math.round(hi * 100) + '% מהתשובות היו "לעיתים קרובות" או יותר, גם בהיגדים הפוכים.', w: 1 });
            const ex = xs.filter(v => v === 1 || v === 5).length / xs.length; if (ex > 0.62) flags.push({ k: 'ext', l: 'תשובות קיצוניות', d: Math.round(ex * 100) + '% מהתשובות בקצוות הסולם.', w: 1 });
        }
        const sd = keys.filter(k => k[0] === 'd').map(k => ({ x: a.ans[k], sd: BANK.sd[Number(k.slice(1))][0] === 1 })), sdA = sd.filter(o => o.sd), sdC = sd.filter(o => !o.sd);
        if (sdA.length >= 2 && mean(sdA.map(o => o.x)) >= 4.2) flags.push({ k: 'sd', l: 'רצוי חברתי', d: 'הסכמת עם היגדים שכמעט אף אחד לא יכול לקיים במלואם (ממוצע ' + mean(sdA.map(o => o.x)).toFixed(1) + ' מתוך 5). התוצאה עלולה להציג אותך טוב יותר מדי.', w: 2 });
        else if (sdC.length >= 2 && mean(sdC.map(o => o.x)) <= 1.8 && sdA.length && mean(sdA.map(o => o.x)) >= 3.4) flags.push({ k: 'sd2', l: 'כנות חלקית', d: 'דחית גם היגדי כנות שרוב האנשים מסכימים להם.', w: 1 });
        const pairs = []; for (let i = 0; i < BANK.rt.length; i++) if (a.ans['a' + i] != null && a.ans['c' + i] != null) pairs.push(Math.abs(a.ans['a' + i] - a.ans['c' + i]));
        let cons = null; if (pairs.length >= 3) { cons = pairs.filter(d => d <= 1).length / pairs.length; if (cons < 0.67) flags.push({ k: 'cons', l: 'חוסר עקביות בניסוח חוזר', d: 'רק ' + Math.round(cons * 100) + '% מההיגדים שנשאלו פעמיים בניסוח שונה קיבלו ציון קרוב.', w: 2 }); }
        if (conv != null && conv < 0.15) flags.push({ k: 'conv', l: 'השיטות לא מסכימות ביניהן', d: 'דירוג היסודות בשיטות שונות שונה מאוד. אולי המצב שלך שונה בין מצבים, או שהתשובות לא יציבות.', w: 1 });
        const pts = flags.reduce((s, f) => s + f.w, 0), lvl = pts === 0 ? 'high' : pts <= 2 ? 'mid' : 'low';
        return { flags, level: lvl, cons, medMs: med };
    }
    function scoreUnits(us, seedStr) { return combine(us); }

    function score(x) {
        const a = typeof x === 'string' ? get(x) : x; if (!a) return null; const us = units(a), n = us.length;
        if (n < 20) return { ready: false, n, need: 20 };
        const cb = combine(us), conv = (() => { const ms = Object.keys(cb.Z); if (ms.length < 2) return null; let s = 0, c = 0; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { s += spearman(cb.Z[ms[i]], cb.Z[ms[j]]); c++; } return s / c; })();
        const q = quality(a, us, conv), tau = q.level === 'low' ? 0.55 : q.level === 'mid' ? 0.8 : 0.95, sh = roundShares(softmax(cb.C, tau));
        // בוטסטראפ על פריטים בתוך כל שיטה
        const r = rng(hash(a.id + ':boot' + n)), B = 150, draws = [], top = [0, 0, 0, 0], by = {}; us.forEach(u => { (by[u.m] = by[u.m] || []).push(u); });
        for (let b = 0; b < B; b++) { const re = []; Object.keys(by).forEach(m => { const l = by[m]; for (let i = 0; i < l.length; i++) re.push(l[Math.floor(r() * l.length)]); }); const c = combine(re), s = softmax(c.C, tau); draws.push(s); const mx = s.indexOf(Math.max.apply(null, s)); top[mx]++; }
        const ci = EK.map((e, i) => { const v = draws.map(d => d[i]).sort((p, q2) => p - q2); return [Math.round(v[Math.floor(B * 0.05)]), Math.round(v[Math.floor(B * 0.95)])]; });
        const rankIdx = sh.map((v, i) => [v, i, cb.C[i]]).sort((p, q2) => q2[0] - p[0] || q2[2] - p[2]).map(o => o[1]), rank = rankIdx.map(i => EK[i]), pTop = top.map(v => v / B);
        const lvl = pTop[rankIdx[0]] >= 0.85 ? 'clear' : pTop[rankIdx[0]] >= 0.6 ? 'probable' : 'blended';
        const shares = {}, ciO = {}, pT = {}; EK.forEach((e, i) => { shares[e] = sh[i]; ciO[e] = ci[i]; pT[e] = Math.round(pTop[i] * 100); });
        // שיטות
        const methods = Object.keys(cb.Z).map(m => { const z = cb.Z[m], p = softmax(z, 0.9), cnt = by[m].length; return { m, l: METH[m], n: cnt, sh: roundShares(p), top: EK[z.indexOf(Math.max.apply(null, z))] }; });
        const agreeTop = methods.filter(m => m.top === rank[0]).length;
        // ליבה מול סגנון
        const cu = us.filter(u => u.core), su = us.filter(u => !u.core), prof = l => l.length >= 10 ? (() => { const c = combine(l); return c.n >= 6 ? roundShares(softmax(c.C, tau)) : null; })() : null;
        const core = prof(cu), style = prof(su);
        // מה הכריע
        const dom = rankIdx[0], sup = [], against = [];
        us.forEach(u => { const c = u.w * u.vec[dom]; if (c > 0.2) sup.push({ c, u }); else if (c < -0.2) against.push({ c, u }); });
        const txt = u => u.m === 'bws' ? (u.vec[dom] > 0 ? 'בחרת כ"הכי כמוני": ' + u.txt.most : 'בחרת כ"הכי פחות כמוני": ' + u.txt.least) : u.m === 'frq' ? (u.txt.t + ' (תדירות ' + u.txt.x + ' מתוך 5' + (u.txt.rev ? ', היגד הפוך' : '') + ')') : u.m === 'prs' ? (u.vec[dom] > 0 ? 'העדפת: ' + u.txt.won : 'לא העדפת: ' + u.txt.lost) : u.m === 'sjt' ? (u.txt.q + ' ← ' + u.txt.t) : u.txt.t;
        sup.sort((p, q2) => q2.c - p.c); against.sort((p, q2) => p.c - q2.c);
        const drivers = { dom: EK[dom], support: sup.slice(0, 5).map(o => ({ m: o.u.m, core: o.u.core, t: txt(o.u) })), against: against.slice(0, 3).map(o => ({ m: o.u.m, core: o.u.core, t: txt(o.u) })) };
        // רגיל מול לחץ
        const fr = us.filter(u => u.m === 'frm'); let shift = null;
        if (fr.length >= 4) { const cc = [0, 0, 0, 0], ss = [0, 0, 0, 0], nn = [0, 0, 0, 0]; fr.forEach(u => { cc[u.e] += (u.c - 3) / 2; ss[u.e] += (u.s - 3) / 2; nn[u.e]++; }); const cm = cc.map((v, i) => nn[i] ? v / nn[i] : 0), sm = ss.map((v, i) => nn[i] ? v / nn[i] : 0), c0 = mean(cm), s0 = mean(sm); shift = EK.map((e, i) => ({ e, calm: Math.round((cm[i] - c0) * 50), stress: Math.round((sm[i] - s0) * 50), d: Math.round(((sm[i] - s0) - (cm[i] - c0)) * 50), n: nn[i] })); }
        return { ready: true, n, shares, ci: ciO, pTop: pT, rank, dom: rank[0], second: rank[1], conf: { level: lvl, p: pT[rank[0]] }, methods, agreeTop, nMethods: methods.length, convergence: conv, quality: q, core, style, coreStyleGap: core && style ? EK.map((e, i) => ({ e, d: core[i] - style[i] })) : null, drivers, shift, tau };
    }
    function finish(id) {
        const a = get(id); if (!a) return null; const s = score(a); a.done = true; a.doneAt = G.localDate();
        if (s && s.ready) a.hist = a.hist.concat([{ at: a.doneAt, n: s.n, sh: EK.map(e => s.shares[e]) }]).slice(-12);
        return put(a);
    }
    const usable = a => !!a && (a.done || !!a.doneAt) && Object.keys(a.ans).length >= 20;
    function latest() { return all().filter(usable).sort((p, q2) => (q2.doneAt + q2.id).localeCompare(p.doneAt + p.id))[0] || null; }
    function answer(id, key, val, ms) { const a = get(id); if (!a || !a.plan.includes(key)) return false; const v = cleanAns(key, val); if (v == null) return false; a.ans[key] = v; if (Number.isFinite(ms)) a.t[key] = Math.round(ms); return !!put(a); }
    window.GOV_CQ = { EK, EL, METH, BANK, all, get, put, create, nextChunk, remaining, view, units, score, finish, usable, latest, answer, remove: id => saveAll(all().filter(x => x.id !== id)), _: { buildPlan, rng, hash, combine, softmax } };
})();
