/* מנוע לימוד אוצר מילים ומשפטים (v0.18). בלי DOM כדי שאפשר יהיה לבדוק אותו בנפרד. המאגר: GOV_PT (gov-vocab-data.js). שמירה: gov_vocab.
   חזרות לפי קופסאות (Leitner): תשובה נכונה מקדמת קופסה (פעם אחת ביום לכל מילה, כדי שתרגול רציף לא ינפח), תשובה שגויה מורידה שתי קופסאות. */
(function () {
    'use strict';
    const G = window.GOV, D = window.GOV_PT, KEY = 'vocab', BOX_DAYS = [0, 1, 3, 7, 14, 30], DATE_RE = /^\d{4}-\d{2}-\d{2}$/, ID_RE = /^[a-z0-9]{2,24}$/;
    const today = () => G.localDate();
    const ci = (v, a, b, d) => { v = Number(v); return Number.isInteger(v) && v >= a && v <= b ? v : d; };
    const api = { rnd: Math.random };
    const pick = a => a[Math.floor(api.rnd() * a.length)];
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(api.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // ---------- מצב שמור ----------
    function stat(x) { x = x && typeof x === 'object' ? x : {}; return { b: ci(x.b, 0, 5, 0), ok: ci(x.ok, 0, 1e6, 0), bad: ci(x.bad, 0, 1e6, 0), due: DATE_RE.test(x.due) ? x.due : '', at: DATE_RE.test(x.at) ? x.at : '', adv: DATE_RE.test(x.adv) ? x.adv : '', last: DATE_RE.test(x.last) ? x.last : '' }; }
    function clean(o) {
        o = o && typeof o === 'object' && !Array.isArray(o) ? o : {}; const c = o.cfg && typeof o.cfg === 'object' ? o.cfg : {};
        const cfg = { variant: 'br', batch: ci(c.batch, 10, 15, 12), rate: [0.6, 0.8, 0.9, 1].includes(Number(c.rate)) ? Number(c.rate) : 0.9, sent: ci(c.sent, 5, 15, 8), auto: c.auto !== false, unlearned: c.unlearned === true, dir: ['he2pt', 'pt2he', 'mix'].includes(c.dir) ? c.dir : 'mix' };
        const map = m => { const r = {}; if (m && typeof m === 'object' && !Array.isArray(m)) Object.keys(m).slice(0, 5000).forEach(k => { if (ID_RE.test(k)) r[k] = stat(m[k]); }); return r; };
        const custom = (Array.isArray(o.custom) ? o.custom : []).filter(x => x && typeof x === 'object' && ID_RE.test(String(x.id)) && String(x.he || '').trim() && String(x.pt || '').trim()).slice(0, 500).map(x => ({ id: String(x.id), he: String(x.he).trim().slice(0, 80), pt: String(x.pt).trim().slice(0, 80) }));
        const sessions = (Array.isArray(o.sessions) ? o.sessions : []).filter(x => x && DATE_RE.test(x.date)).slice(-120).map(x => ({ date: x.date, kind: ['learn', 'practice', 'sent'].includes(x.kind) ? x.kind : 'practice', n: ci(x.n, 0, 100000, 0), ok: ci(x.ok, 0, 100000, 0), secs: ci(x.secs, 0, 86400, 0) }));
        return { v: 1, cfg, w: map(o.w), s: map(o.s), custom, sessions };
    }
    let cache = null;
    const state = () => cache || (cache = clean(G.rd(KEY, {})));
    const save = () => { G.wr(KEY, Object.assign({}, cache, { sess: undefined })); return true; };
    api.reload = () => { cache = null; return state(); };
    api.state = state; api.clean = clean;
    api.cfg = () => state().cfg;
    api.setCfg = p => { const s = state(); s.cfg = clean({ cfg: Object.assign({}, s.cfg, p) }).cfg; save(); return s.cfg; };
    api.reset = () => { cache = clean({ cfg: state().cfg, custom: state().custom, sessions: state().sessions }); save(); };

    // ---------- מאגר ----------
    const words = () => D.WORDS.concat(state().custom.map(x => ({ id: x.id, cat: 'mine', he: x.he, pt: x.pt, pp: '', custom: true })));
    const byId = id => words().find(w => w.id === id) || null;
    const ptOf = w => (state().cfg.variant === 'pt' && w.pp) ? w.pp : w.pt;
    const speakText = s => String(s).split(' / ')[0].replace(/\.\.\./g, '');
    const sents = () => D.SENTS;
    const sById = id => D.SENTS.find(s => s.id === id) || null;
    const sPt = s => (state().cfg.variant === 'pt' && s.pp) ? s.pp : s.pt;
    Object.assign(api, { words, byId, ptOf, speakText, sents, sById, sPt, CATS: D.CATS, ORDER: D.ORDER });
    api.addCustom = (he, pt) => { he = String(he || '').trim().slice(0, 80); pt = String(pt || '').trim().slice(0, 80); if (he.length < 1 || pt.length < 1) return null; const s = state(); if (words().some(w => w.he === he || w.pt.toLowerCase() === pt.toLowerCase())) return null; const id = 'c' + G.uid().replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10); s.custom.push({ id, he, pt }); save(); return id; };
    api.removeCustom = id => { const s = state(); if (!s.custom.some(x => x.id === id)) return false; s.custom = s.custom.filter(x => x.id !== id); delete s.w[id]; save(); return true; };

    // ---------- התקדמות ----------
    api.stat = id => state().w[id] || null;
    api.learned = () => words().filter(w => state().w[w.id] && state().w[w.id].at);
    const advance = (s, ok) => {
        const t = today(); s.last = t; if (!s.at) s.at = t;
        if (ok) { s.ok++; if (s.adv !== t) { s.b = Math.min(5, s.b + 1); s.adv = t; } } else { s.bad++; s.b = Math.max(0, s.b - 2); s.adv = ''; }
        s.due = G.addDays(t, BOX_DAYS[s.b]);
    };
    api.answerWord = (id, ok) => { if (!byId(id)) return null; const s = state(); const st = s.w[id] || (s.w[id] = stat()); advance(st, !!ok); if (s.sess) { s.sess.n++; if (ok) s.sess.ok++; } save(); return st; };
    api.markKnown = id => { if (!byId(id)) return null; const s = state(), t = today(), st = s.w[id] || (s.w[id] = stat()); st.at = st.at || t; st.b = Math.max(st.b, 3); st.adv = t; st.last = t; st.due = G.addDays(t, BOX_DAYS[st.b]); save(); return st; };
    api.answerSent = (id, ok) => { if (!sById(id)) return null; const s = state(), st = s.s[id] || (s.s[id] = stat()); advance(st, !!ok); if (s.sess) { s.sess.n++; if (ok) s.sess.ok++; } save(); return st; };
    api.summary = () => {
        const s = state(), t = today(), ws = words(), by = {}; let learned = 0, mastered = 0, due = 0;
        ws.forEach(w => { const st = s.w[w.id], b = by[w.cat] || (by[w.cat] = { cat: w.cat, total: 0, learned: 0, mastered: 0 }); b.total++; if (st && st.at) { learned++; b.learned++; if (st.b >= 4) { mastered++; b.mastered++; } if (st.due && st.due <= t) due++; } });
        const ts = s.sessions.filter(x => x.date === t), sentSeen = Object.keys(s.s).length;
        return { total: ws.length, learned, mastered, due, byCat: D.ORDER.concat(['mine']).filter(c => by[c]).map(c => by[c]), todayMins: Math.round(ts.reduce((a, x) => a + x.secs, 0) / 60), todayN: ts.reduce((a, x) => a + x.n, 0), sentTotal: D.SENTS.length, sentSeen };
    };

    // ---------- בחירה ----------
    api.nextBatch = (n, cat) => {
        const s = state(), un = words().filter(w => !(s.w[w.id] && s.w[w.id].at)); let pool = cat ? un.filter(w => w.cat === cat) : un;
        if (!cat) { const rank = c => { const i = D.ORDER.indexOf(c); return i < 0 ? 99 : i; }; pool = pool.slice().sort((a, b) => rank(a.cat) - rank(b.cat)); }
        return pool.slice(0, n || s.cfg.batch).map(w => w.id);
    };
    function weight(w, st) {
        if (!st || !st.at) return 2;
        const tot = st.ok + st.bad, bad = tot ? st.bad / tot : 0; return 1 + (5 - st.b) * 1.2 + bad * 4 + (st.due && st.due <= today() ? 2 : 0);
    }
    api.pickPractice = (exclude) => {
        const s = state(), ex = new Set(exclude || []), all = words(); let pool = all.filter(w => s.w[w.id] && s.w[w.id].at);
        if (s.cfg.unlearned || pool.length < 8) pool = all;
        const cand = pool.filter(w => !ex.has(w.id)); const list = cand.length ? cand : pool; if (!list.length) return null;
        const ws = list.map(w => weight(w, s.w[w.id])), tot = ws.reduce((a, b) => a + b, 0); let r = api.rnd() * tot;
        for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i].id; } return list[list.length - 1].id;
    };
    api.pickSents = (n, exclude) => {
        const s = state(), ex = new Set(exclude || []); const list = D.SENTS.filter(x => !ex.has(x.id)); const w = x => { const st = s.s[x.id]; return !st ? 3 : 1 + (5 - st.b) + (st.bad && st.bad >= st.ok ? 2 : 0); };
        const out = [], pool = list.slice(); while (out.length < n && pool.length) { const ws = pool.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = api.rnd() * tot, i = 0; for (; i < pool.length - 1; i++) { r -= ws[i]; if (r <= 0) break; } out.push(pool.splice(i, 1)[0].id); }
        return out;
    };

    // ---------- שאלות ----------
    api.mc = (id, dir) => {
        const w = byId(id); if (!w) return null; dir = dir || (api.rnd() < 0.5 ? 'pt2he' : 'he2pt'); const toPt = dir === 'he2pt', val = x => toPt ? ptOf(x) : x.he, correct = val(w), all = words().filter(x => x.id !== id);
        const seen = new Set([correct]), opts = [];
        shuffle(all.filter(x => x.cat === w.cat)).concat(shuffle(all.filter(x => x.cat !== w.cat))).forEach(x => { if (opts.length >= 3) return; const v = val(x); if (seen.has(v) || (!toPt && x.he === w.he)) return; seen.add(v); opts.push({ text: v, id: x.id }); });
        const options = shuffle(opts.concat([{ text: correct, id }])); return { kind: 'mc', id, dir, prompt: toPt ? w.he : ptOf(w), say: speakText(ptOf(w)), options, correct: options.findIndex(o => o.id === id) };
    };
    api.typed = id => { const w = byId(id); if (!w) return null; const acc = [w.pt, w.pp].filter(Boolean).reduce((a, p) => a.concat(String(p).split(' / ')), []).map(x => x.replace(/\.\.\./g, '').trim()).filter(Boolean); return { kind: 'type', id, dir: 'he2pt', prompt: w.he, accept: acc, say: speakText(ptOf(w)) }; };
    api.practiceQ = (id, opt) => {
        opt = opt || {}; const st = state().w[id], b = st ? st.b : 0, r = api.rnd(), tts = opt.tts !== false;
        if (st && b >= 4 && r < 0.6) return api.typed(id);
        if (b <= 1) return api.mc(id, r < 0.3 && tts ? 'listen' : (r < 0.65 ? 'pt2he' : 'he2pt'));
        return api.mc(id, r < 0.25 && tts ? 'listen' : (r < 0.6 ? 'he2pt' : 'pt2he'));
    };
    const noAcc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
    const normPt = s => noAcc(String(s).toLowerCase()).replace(/[-‐‑]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const keepPt = s => String(s).toLowerCase().normalize('NFC').replace(/[-‐‑]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const normHe = s => String(s).replace(/[֑-ׇ]/g, '').replace(/[׳״'"`’]/g, '').replace(/[^א-תa-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const stem = t => (t.length >= 4 && 'והבלמשכ'.includes(t[0])) ? t.slice(1) : t;
    function lev(a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
    function f1(a, b) { const A = normHe(a).split(' ').filter(Boolean).map(stem), B = normHe(b).split(' ').filter(Boolean).map(stem); if (!A.length || !B.length) return 0; const used = new Array(B.length).fill(false); let hit = 0; A.forEach(t => { const j = B.findIndex((x, k) => !used[k] && x === t); if (j >= 0) { used[j] = true; hit++; } }); const p = hit / A.length, r = hit / B.length; return p + r ? 2 * p * r / (p + r) : 0; }
    // בדיקת תשובה כתובה. פורטוגזית: exact (זהה), accent (רק סימני הטעמה, פיסוק או אותיות גדולות), close (טעות כתיב קטנה: לא נספר כשגיאה ולא כהצלחה מלאה), wrong. עברית: לפי חפיפת מילים מול הניסוחים המתקבלים.
    api.check = (text, accepted, lang) => {
        text = String(text || ''); if (!normHe(text) && !normPt(text)) return { res: 'empty' };
        if (lang === 'he') { let best = 0, bestA = accepted[0]; accepted.forEach(a => { const f = f1(text, a); if (f > best) { best = f; bestA = a; } }); return { res: best >= 0.85 ? 'exact' : best >= 0.6 ? 'close' : 'wrong', best: bestA, score: best }; }
        const u = normPt(text), uk = keepPt(text); let best = null, bd = 1e9, kind = 'wrong';
        accepted.forEach(a => { const n = normPt(a); if (u === n) { const exact = keepPt(a) === uk; if (!best || (exact && kind !== 'exact')) { best = a; kind = exact ? 'exact' : 'accent'; bd = 0; } } else if (kind === 'wrong') { const d = lev(u, n); if (d < bd) { bd = d; best = a; } } });
        if (kind !== 'wrong') return { res: kind, best };
        const L = best ? normPt(best).length : 0; return { res: best && bd <= Math.max(1, Math.floor(L * 0.1)) && L >= 4 ? 'close' : 'wrong', best, dist: bd };
    };
    api.sentQ = (id, dir) => {
        const x = sById(id); if (!x) return null; dir = dir === 'he2pt' || dir === 'pt2he' ? dir : (state().cfg.dir === 'mix' ? (api.rnd() < 0.5 ? 'he2pt' : 'pt2he') : state().cfg.dir);
        const pts = [sPt(x), x.pt, x.pp].concat(x.alts).filter((v, i, a) => v && a.indexOf(v) === i), hes = [x.he].concat(x.heAlts);
        return { kind: 'sent', id, dir, prompt: dir === 'he2pt' ? x.he : sPt(x), accept: dir === 'he2pt' ? pts : hes, model: dir === 'he2pt' ? sPt(x) : x.he, more: (dir === 'he2pt' ? pts.filter(p => p !== sPt(x)) : x.heAlts).slice(0, 2), bank: dir === 'he2pt' ? shuffle(sPt(x).replace(/[.,!?¿¡]/g, '').split(/\s+/).filter(Boolean)) : [], say: sPt(x) };
    };

    // ---------- זמן וסשנים ----------
    // זמן פעיל בלבד: בין שתי פעולות ברצף נספרות עד 45 שניות
    api.startSession = kind => { const s = state(); s.sess = { kind, n: 0, ok: 0, secs: 0, last: Date.now() }; return s.sess; };
    api.touch = () => { const s = state(); if (!s.sess) return; const now = Date.now(), d = (now - s.sess.last) / 1000; s.sess.secs += Math.min(45, Math.max(0, d)); s.sess.last = now; };
    api.endSession = () => {
        const s = state(), x = s.sess; if (!x) return null; api.touch(); s.sess = null; const secs = Math.round(x.secs), mins = Math.round(secs / 60);
        if (x.n > 0) { s.sessions.push({ date: today(), kind: x.kind, n: x.n, ok: x.ok, secs }); s.sessions = s.sessions.slice(-120); } save(); return { kind: x.kind, n: x.n, ok: x.ok, secs, mins };
    };
    api.hasSession = () => !!state().sess;
    // הוספה ליומן הלימוד של מודול השפות (רק כשהמשתמש לוחץ): יוצר את השפה "פורטוגזית" אם אינה קיימת
    api.logTime = mins => {
        mins = Math.round(Number(mins)); if (!(mins >= 1) || mins > 1440) return null; const L = G.langs; let lg = L.all().find(l => l.name === 'פורטוגזית' && !l.archived);
        if (!lg) lg = L.save({ name: 'פורטוגזית' }); if (!lg) return null; return L.log.add({ langId: lg.id, mins, act: 'vocab', note: 'תרגול מילים ומשפטים (מודל פורטוגזית)' });
    };

    // ---------- הקראה (דפדפן) ----------
    api.ttsOK = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    api.speak = (text, slow) => {
        if (!api.ttsOK() || !text) return false; try {
            const lang = state().cfg.variant === 'pt' ? 'pt-PT' : 'pt-BR', vs = speechSynthesis.getVoices() || [], v = vs.find(x => String(x.lang).replace('_', '-').toLowerCase() === lang.toLowerCase()) || vs.find(x => String(x.lang).toLowerCase().startsWith('pt'));
            speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(speakText(text)); u.lang = lang; if (v) u.voice = v; u.rate = slow ? 0.55 : state().cfg.rate; speechSynthesis.speak(u); return true;
        } catch (e) { return false; }
    };
    api.hasVoice = () => { try { return api.ttsOK() && (speechSynthesis.getVoices() || []).some(v => String(v.lang).toLowerCase().startsWith('pt')); } catch (e) { return false; } };
    window.GOV_VOCAB = api;
})();
