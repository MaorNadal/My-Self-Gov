/* ממשל אישי - ליבה משותפת לכל הדפים: אחסון, תאריכים, ישויות, ציון חודשי, נעילה וגיבוי.
   כל המפתחות ב-localStorage מתחילים ב-gov_ . אין תלות בשרת. כל הקריאות מנקות ומאמתות נתונים (נתונים פגומים או מיובאים לא שוברים את הדפים). */
(function () {
    'use strict';
    const PREFIX = 'gov_';
    const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-\d{2}$/;
    const MIN_PROMISES = 3, MIN_DAILY_DAYS = 5;                 // ספי נתונים מינימליים לפני שניתן ציון
    const W = { promises: 60, daily: 25, self: 15 };            // משקלי הציון החודשי

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pad = n => String(n).padStart(2, '0');
    const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

    // ---------- אחסון ----------
    function rd(k, fb) { try { const v = JSON.parse(localStorage.getItem(PREFIX + k)); return v === null || v === undefined ? fb : v; } catch (e) { return fb; } }
    const changed = () => { try { window.dispatchEvent(new Event('gov:changed')); } catch (e) {} };   // מפעיל סנכרון אוטומטי לענן (gov-sync.js)
    function wr(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); changed(); return true; } catch (e) { alert('השמירה נכשלה: האחסון בדפדפן מלא או חסום.'); return false; } }
    function del(k) { try { localStorage.removeItem(PREFIX + k); changed(); } catch (e) {} }
    function keysWith(prefix) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX + prefix)) out.push(k.slice(PREFIX.length)); } } catch (e) {} return out; }

    // ---------- תאריכים ----------
    function localDate(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    const monthOf = ds => String(ds).slice(0, 7);
    function addDays(ds, n) { const [y, m, d] = ds.split('-').map(Number); return localDate(new Date(y, m - 1, d + n)); }
    function addMonths(mk, n) { const [y, m] = mk.split('-').map(Number); const dt = new Date(y, m - 1 + n, 1); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1); }
    function monthLabel(mk) { const [y, m] = mk.split('-').map(Number); return HEB_MONTHS[m - 1] + ' ' + y; }
    function daysInMonth(mk) { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); }

    // ---------- מטא ----------
    const STATUS = {
        open: { l: 'טרם התחילה', c: '#94a3b8' }, progress: { l: 'בביצוע', c: '#38bdf8' }, done: { l: 'בוצעה', c: '#34d399' },
        failed: { l: 'לא בוצעה', c: '#f87171' }, dropped: { l: 'הוסרה בנימוק', c: '#a78bfa' }
    };
    const PRIORITY = { 1: 'נמוכה', 2: 'רגילה', 3: 'מכרעת' };
    function gradeFor(v) {   // אותה סקאלה כמו ב-QB Master Class
        const T = [[95, 'A+', '#34d399'], [90, 'A', '#34d399'], [85, 'A-', '#4ade80'], [80, 'B+', '#a3e635'], [75, 'B', '#a3e635'], [70, 'B-', '#facc15'], [65, 'C+', '#facc15'], [60, 'C', '#fb923c'], [55, 'C-', '#fb923c'], [50, 'D+', '#f87171'], [45, 'D', '#f87171'], [40, 'D-', '#f87171']];
        const x = Math.max(0, Math.min(100, v)), hit = T.find(t => x >= t[0]);
        return hit ? { l: hit[1], c: hit[2] } : { l: 'F', c: '#ef4444' };
    }

    // ---------- אוספים כלליים (רשימה של אובייקטים עם id) ----------
    function collection(key, clean) {
        const all = () => { const v = rd(key, []); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && !Array.isArray(x)).map(clean) : []; };
        return {
            all,
            get: id => all().find(x => x.id === id) || null,
            save(item) { const c = clean(item), l = all(), i = l.findIndex(x => x.id === c.id); if (i >= 0) l[i] = c; else l.push(c); return wr(key, l) ? c : null; },
            remove(id) { return wr(key, all().filter(x => x.id !== id)); }
        };
    }
    const base = o => (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    const dateOr = (v, d) => DATE_RE.test(v || '') ? v : d;

    const portfolios = collection('portfolios', p => { const o = base(p); return { id: str(o.id, 40) || uid(), name: str(o.name, 40) || 'תיק חדש', icon: str(o.icon, 8) || '📁', minister: str(o.minister, 40), style: str(o.style, 60), mission: str(o.mission, 500), builtin: o.builtin === true }; });
    const promises = collection('promises', p => {
        const o = base(p), status = STATUS[o.status] ? o.status : 'open';
        return { id: str(o.id, 40) || uid(), month: MONTH_RE.test(o.month || '') ? o.month : monthOf(localDate()), pid: str(o.pid, 40), text: str(o.text, 300), why: str(o.why, 300), measure: str(o.measure, 300),
            priority: clampInt(o.priority, 1, 3, 2), status, progress: status === 'done' ? 100 : clampInt(o.progress, 0, 100, 0), created: dateOr(o.created, localDate()), doneAt: dateOr(o.doneAt, ''), dropReason: str(o.dropReason, 300), carried: o.carried === true };
    });
    const issues = collection('issues', p => { const o = base(p); return { id: str(o.id, 40) || uid(), title: str(o.title, 200), pid: str(o.pid, 40), severity: clampInt(o.severity, 1, 3, 2), status: o.status === 'resolved' ? 'resolved' : 'open', created: dateOr(o.created, localDate()), resolvedAt: dateOr(o.resolvedAt, ''), note: str(o.note, 400) }; });
    const ideas = collection('ideas', p => { const o = base(p); return { id: str(o.id, 40) || uid(), pid: str(o.pid, 40), text: str(o.text, 300), status: ['new', 'adopted', 'rejected'].includes(o.status) ? o.status : 'new', created: dateOr(o.created, localDate()) }; });

    // משימות יומיות: מפתח לכל תאריך
    const daily = {
        get(ds) { const v = rd('daily_' + ds, []); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && x.text).map(x => ({ id: str(x.id, 40) || uid(), text: str(x.text, 200), done: x.done === true, pid: str(x.pid, 40) })) : []; },
        set(ds, list) { if (!DATE_RE.test(ds)) return false; if (!list.length) { del('daily_' + ds); return true; } return wr('daily_' + ds, list); }
    };

    // ממשלה חודשית (ראש ממשלה + דוקטרינה)
    const cleanTerm = v => { const o = base(v); return { kind: ['self', 'real', 'fictional'].includes(o.kind) ? o.kind : 'self', name: str(o.name, 60), doctrine: str(o.doctrine, 500), created: dateOr(o.created, '') }; };
    const term = { get(mk) { const v = rd('term_' + mk, null); return v && typeof v === 'object' ? cleanTerm(v) : null; }, set(mk, o) { const c = cleanTerm(o); if (!c.created) c.created = localDate(); return MONTH_RE.test(mk) && wr('term_' + mk, c); } };

    // סיכום והערכה חודשית (כולל "סגירת חודש" שמקפיאה צילום מצב)
    function cleanSnap(s) {
        if (!s || typeof s !== 'object') return null;
        return {
            total: (s.total == null || !isFinite(s.total)) ? null : clampInt(s.total, 0, 100, null),
            parts: (Array.isArray(s.parts) ? s.parts : []).slice(0, 6).map(p => ({ id: str(p && p.id, 20), v: (p && p.v != null && isFinite(p.v)) ? clampInt(p.v, 0, 100, null) : null, w: clampInt(p && p.w, 0, 100, 0) })),
            promises: (Array.isArray(s.promises) ? s.promises : []).slice(0, 200).map(p => ({ text: str(p && p.text, 300), status: STATUS[p && p.status] ? p.status : 'open', progress: clampInt(p && p.progress, 0, 100, 0), priority: clampInt(p && p.priority, 1, 3, 2), pid: str(p && p.pid, 40), dropReason: str(p && p.dropReason, 300) })),
            pm: str(s.pm, 80), dropped: clampInt(s.dropped, 0, 500, 0)
        };
    }
    const cleanReview = v => {
        const o = base(v);
        return { selfScore: (o.selfScore == null || o.selfScore === '') ? null : clampInt(o.selfScore, 0, 100, null), well: str(o.well, 800), bad: str(o.bad, 800), lessons: str(o.lessons, 800), closed: o.closed === true, closedAt: dateOr(o.closedAt, ''), snapshot: cleanSnap(o.snapshot) };
    };
    const review = {
        get: mk => cleanReview(rd('review_' + mk, null)),
        set: (mk, o) => MONTH_RE.test(mk) && wr('review_' + mk, cleanReview(o)),
        isClosed: mk => cleanReview(rd('review_' + mk, null)).closed,
        closedMonths: () => keysWith('review_').map(k => k.slice(7)).filter(m => MONTH_RE.test(m) && cleanReview(rd('review_' + m, null)).closed).sort()
    };
    const profile = { get() { const o = base(rd('profile', {})); return { name: str(o.name, 40) }; }, set(o) { return wr('profile', { name: str(base(o).name, 40) }); } };


    // ---------- יחסי חוץ ואמנות ----------
    // אמנה = התחייבות הדדית עם אדם / קבוצה / גוף. אמנה שנסגרה (קוימה/הופרה/הסתיימה) נעולה: זה תיעוד, לא טיוטה.
    const TREATY_STATUS = { active: { l: 'בתוקף', c: '#38bdf8' }, fulfilled: { l: 'קוימה', c: '#34d399' }, breached: { l: 'הופרה', c: '#f87171' }, ended: { l: 'הסתיימה', c: '#94a3b8' } };
    const PARTY_KIND = { person: { l: 'אדם', i: '👤' }, group: { l: 'קבוצה', i: '👥' }, org: { l: 'גוף / ארגון', i: '🏢' } };
    const LEVEL = { 1: 'נמוך', 2: 'בינוני', 3: 'גבוה' };
    const treatyCol = collection('treaties', p => { const o = base(p); return {
        id: str(o.id, 40) || uid(), party: str(o.party, 60), kind: PARTY_KIND[o.kind] ? o.kind : 'person', title: str(o.title, 140), terms: str(o.terms, 600),
        cost: str(o.cost, 300), costLevel: clampInt(o.costLevel, 1, 3, 2), status: TREATY_STATUS[o.status] ? o.status : 'active', due: dateOr(o.due, ''), pid: str(o.pid, 40),
        created: dateOr(o.created, localDate()), closedAt: dateOr(o.closedAt, ''), note: str(o.note, 400) }; });
    const treaties = {
        all: treatyCol.all, get: treatyCol.get,
        save(item) { const ex = item && item.id ? treatyCol.get(item.id) : null; if (ex && ex.status !== 'active') return null; return treatyCol.save(item); },
        remove(id) { const ex = treatyCol.get(id); if (ex && ex.status !== 'active') return false; return treatyCol.remove(id); },
        close(id, status, note) {
            const t = treatyCol.get(id); if (!t) return { ok: false, error: 'האמנה לא נמצאה.' };
            if (t.status !== 'active') return { ok: false, error: 'האמנה כבר נסגרה ואי אפשר לשנות אותה.' };
            if (!['fulfilled', 'breached', 'ended'].includes(status)) return { ok: false, error: 'סטטוס לא חוקי.' };
            note = str(note, 400);
            if (status === 'breached' && note.length < 10) return { ok: false, error: 'הפרת אמנה דורשת תיעוד: מה קרה ולמה (לפחות 10 תווים).' };
            t.status = status; t.closedAt = localDate(); t.note = note;
            return treatyCol.save(t) ? { ok: true } : { ok: false, error: 'השמירה נכשלה.' };
        }
    };

    // ---------- קבינט: החלטות ----------
    // זרימה: פתוחה לדיון → הוכרעה (נעולה, עם נימוק ותאריך בדיקה) → נבדקה בדיעבד (פעם אחת, לא ניתנת לשכתוב) | בוטלה (בנימוק).
    // בדיקה בדיעבד מפרידה בין "איכות ההחלטה לפי מה שידעת" לבין "איך זה יצא": תוצאה רעה אינה הוכחה להחלטה גרועה, ולהפך.
    const DECISION_STATUS = { open: { l: 'פתוחה לדיון', c: '#fbbf24' }, decided: { l: 'הוכרעה', c: '#34d399' }, revoked: { l: 'בוטלה', c: '#a78bfa' } };
    const cleanImpact = i => { const o = base(i); return { kind: o.kind === 'treaty' ? 'treaty' : 'promise', ref: str(o.ref, 40), effect: o.effect === 'harms' ? 'harms' : 'supports' }; };
    const cleanOption = v => { const o = base(v); return { id: str(o.id, 40) || uid(), text: str(o.text, 200), pros: str(o.pros, 300), cons: str(o.cons, 300), impacts: (Array.isArray(o.impacts) ? o.impacts : []).slice(0, 12).map(cleanImpact).filter(i => i.ref) }; };
    const cleanRating = v => (v == null || v === '' || !isFinite(v)) ? null : clampInt(v, 1, 5, null);
    const cleanDecision = p => {
        const o = base(p), options = (Array.isArray(o.options) ? o.options : []).slice(0, 6).map(cleanOption).filter(x => x.text);
        return { id: str(o.id, 40) || uid(), title: str(o.title, 160), context: str(o.context, 800), pid: str(o.pid, 40), status: DECISION_STATUS[o.status] ? o.status : 'open',
            created: dateOr(o.created, localDate()), decidedAt: dateOr(o.decidedAt, ''), reviewAt: dateOr(o.reviewAt, ''), options, chosen: options.some(x => x.id === o.chosen) ? o.chosen : '',
            rationale: str(o.rationale, 800), doubts: str(o.doubts, 600), revokeReason: str(o.revokeReason, 300),
            outcome: str(o.outcome, 800), outcomeRating: cleanRating(o.outcomeRating), processRating: cleanRating(o.processRating), reviewedAt: dateOr(o.reviewedAt, '') };
    };
    const decCol = collection('decisions', cleanDecision);
    const decisions = {
        all: decCol.all, get: decCol.get,
        save(item) { const ex = item && item.id ? decCol.get(item.id) : null; if (ex && ex.status !== 'open') return null; return decCol.save(item); },
        remove(id) { const ex = decCol.get(id); if (ex && ex.status === 'decided') return false; return decCol.remove(id); },
        decide(id, chosen, rationale, doubts, reviewAt) {
            const d = decCol.get(id); if (!d) return { ok: false, error: 'ההחלטה לא נמצאה.' };
            if (d.status !== 'open') return { ok: false, error: 'ההחלטה כבר אינה פתוחה.' };
            if (d.options.length < 2) return { ok: false, error: 'החלטה דורשת לפחות שתי אפשרויות. בלי אלטרנטיבה אין החלטה.' };
            if (!d.options.some(x => x.id === chosen)) return { ok: false, error: 'לא נבחרה אפשרות.' };
            if (str(rationale, 800).length < 15) return { ok: false, error: 'הנימוק קצר מדי (לפחות 15 תווים).' };
            if (!DATE_RE.test(reviewAt || '') || reviewAt <= localDate()) return { ok: false, error: 'תאריך הבדיקה בדיעבד חייב להיות עתידי.' };
            d.status = 'decided'; d.chosen = chosen; d.rationale = rationale; d.doubts = doubts; d.reviewAt = reviewAt; d.decidedAt = localDate();
            return decCol.save(d) ? { ok: true } : { ok: false, error: 'השמירה נכשלה.' };
        },
        revoke(id, reason) {
            const d = decCol.get(id); if (!d) return { ok: false, error: 'ההחלטה לא נמצאה.' };
            if (d.status !== 'decided') return { ok: false, error: 'אפשר לבטל רק החלטה שהוכרעה.' };
            if (d.reviewedAt) return { ok: false, error: 'החלטה שנבדקה בדיעבד אינה ניתנת לביטול.' };
            if (str(reason, 300).length < 10) return { ok: false, error: 'ביטול החלטה דורש נימוק (לפחות 10 תווים).' };
            d.status = 'revoked'; d.revokeReason = reason;
            return decCol.save(d) ? { ok: true } : { ok: false, error: 'השמירה נכשלה.' };
        },
        review(id, o) {
            const d = decCol.get(id); if (!d) return { ok: false, error: 'ההחלטה לא נמצאה.' };
            if (d.status !== 'decided') return { ok: false, error: 'אפשר לבדוק בדיעבד רק החלטה שהוכרעה.' };
            if (d.reviewedAt) return { ok: false, error: 'ההחלטה כבר נבדקה. בדיקה בדיעבד נעשית פעם אחת, כדי שלא ישוכתב.' };
            if (d.reviewAt > localDate()) return { ok: false, error: 'עוד לא הגיע מועד הבדיקה (' + d.reviewAt + ').' };
            o = base(o);
            if (str(o.outcome, 800).length < 10) return { ok: false, error: 'תאר מה קרה בפועל (לפחות 10 תווים).' };
            const oR = cleanRating(o.outcomeRating), pR = cleanRating(o.processRating);
            if (oR == null || pR == null) return { ok: false, error: 'יש לדרג גם את התוצאה וגם את איכות התהליך (1-5).' };
            d.outcome = o.outcome; d.outcomeRating = oR; d.processRating = pR; d.reviewedAt = localDate();
            return decCol.save(d) ? { ok: true } : { ok: false, error: 'השמירה נכשלה.' };
        }
    };

    // ---------- מחיר הפרה / השפעה של אפשרות ----------
    // אינדיקציה שקופה, לא המלצה: כמה הבטחות/אמנות פעילות האפשרות מקדמת או פוגעת בהן, וסכום "חומרת ההפרה" (1-3 לכל אמנה שנפגעת).
    // רק פריטים שעדיין רלוונטיים נספרים: אמנה בתוקף, או הבטחה שטרם בוצעה/נכשלה/הוסרה.
    function impactItem(i) {
        i = cleanImpact(i);
        if (i.kind === 'treaty') {
            const t = treatyCol.get(i.ref); if (!t) return { kind: 'treaty', effect: i.effect, label: '(אמנה שנמחקה)', missing: true, counts: false, level: 0, cost: '' };
            return { kind: 'treaty', effect: i.effect, label: t.party + ': ' + t.title, missing: false, counts: t.status === 'active', level: t.costLevel, cost: t.cost };
        }
        const p = promises.get(i.ref); if (!p) return { kind: 'promise', effect: i.effect, label: '(הבטחה שנמחקה)', missing: true, counts: false, level: 0, cost: '' };
        return { kind: 'promise', effect: i.effect, label: p.text, missing: false, counts: p.status === 'open' || p.status === 'progress', level: p.priority, cost: '' };
    }
    function optionImpact(opt) {
        const items = ((opt && opt.impacts) || []).map(impactItem), live = items.filter(x => x.counts);
        return { items, supports: live.filter(x => x.effect === 'supports').length, harms: live.filter(x => x.effect === 'harms').length,
            treatyCost: live.filter(x => x.effect === 'harms' && x.kind === 'treaty').reduce((n, x) => n + x.level, 0),
            promiseCost: live.filter(x => x.effect === 'harms' && x.kind === 'promise').reduce((n, x) => n + x.level, 0) };
    }

    // ---------- ציון חודשי ----------
    // 60% ביצוע הבטחות (משוקלל לפי עדיפות) • 25% עקביות יומית • 15% הערכה עצמית.
    // רכיב בלי מספיק נתונים לא נספר (והמשקלים מנורמלים). בלי רכיב אובייקטיבי אחד לפחות אין ציון כלל.
    function score(mk) {
        const all = promises.all().filter(p => p.month === mk), active = all.filter(p => p.status !== 'dropped');
        const PW = { 1: 1, 2: 2, 3: 3 };
        let tw = 0, sum = 0;
        active.forEach(p => { const w = PW[p.priority] || 2; tw += w; sum += w * (p.status === 'done' ? 100 : p.status === 'failed' ? 0 : p.progress); });
        const pr = active.length >= MIN_PROMISES && tw ? sum / tw : null;
        const n = daysInMonth(mk), t = localDate();
        let planned = 0, doneN = 0, days = 0, ratio = 0;
        for (let d = 1; d <= n; d++) {
            const ds = mk + '-' + pad(d); if (ds > t) break;
            const l = daily.get(ds); if (!l.length) continue;
            const dn = l.filter(x => x.done).length; days++; planned += l.length; doneN += dn; ratio += dn / l.length;
        }
        const dl = days >= MIN_DAILY_DAYS ? ratio / days * 100 : null;
        const rv = review.get(mk), self = rv.selfScore;
        const parts = [{ id: 'promises', w: W.promises, v: pr }, { id: 'daily', w: W.daily, v: dl }, { id: 'self', w: W.self, v: self }];
        const have = parts.filter(p => p.v != null), tW = have.reduce((a, p) => a + p.w, 0);
        const total = have.some(p => p.id !== 'self') && tW ? Math.round(have.reduce((a, p) => a + p.w * p.v, 0) / tW) : null;
        return { total, parts, promisesN: active.length, droppedN: all.length - active.length, allN: all.length, doneN: active.filter(p => p.status === 'done').length, dailyDays: days, dailyPlanned: planned, dailyDone: doneN, min: { promises: MIN_PROMISES, daily: MIN_DAILY_DAYS } };
    }

    // ---------- נעילה (שער סיסמה בצד הלקוח בלבד: אינו הצפנה) ----------
    const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: k => { try { sessionStorage.removeItem(k); } catch (e) {} } };
    const lock = {
        isSet: () => !!rd('lock', null),
        supported: () => !!(window.crypto && window.crypto.subtle),
        async hash(pin, salt) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); },
        async set(pin) { if (!lock.supported()) return false; const salt = uid(); const ok = wr('lock', { salt, h: await lock.hash(pin, salt) }); if (ok) ss.set('gov_unlocked', '1'); return ok; },
        async check(pin) { const l = rd('lock', null); if (!l || !l.salt) return true; const ok = (await lock.hash(pin, l.salt)) === l.h; if (ok) ss.set('gov_unlocked', '1'); return ok; },
        unlocked: () => !rd('lock', null) || ss.get('gov_unlocked') === '1',
        remove() { del('lock'); ss.del('gov_unlocked'); },
        lockNow() { ss.del('gov_unlocked'); location.reload(); }
    };

    // ---------- גיבוי ושחזור (הנעילה לעולם לא נכללת) ----------
    function exportAll() {
        const out = {};
        try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX) && k !== PREFIX + 'lock' && k !== PREFIX + 'sync') out[k] = localStorage.getItem(k); } } catch (e) {}
        if (!Object.keys(out).length) { alert('אין נתונים לגיבוי עדיין.'); return; }
        const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'gov_backup_' + localDate() + '.json'; a.click(); URL.revokeObjectURL(url);
    }
    function importAll(file, cb) {
        const r = new FileReader();
        r.onerror = () => cb(0, 'לא ניתן לקרוא את הקובץ.');
        r.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad');
                let n = 0;
                Object.entries(data).forEach(([k, v]) => { if (k.startsWith(PREFIX) && k !== PREFIX + 'lock' && k !== PREFIX + 'sync' && typeof v === 'string') { JSON.parse(v); localStorage.setItem(k, v); n++; } });
                if (n) changed();
                cb(n, n ? null : 'לא נמצאו נתוני ממשל אישי בקובץ.');
            } catch (e) { cb(0, 'קובץ לא תקין. ודא שזה קובץ גיבוי שיוצא מהמערכת.'); }
        };
        r.readAsText(file);
    }

    // ---------- תיקי ברירת מחדל ----------
    const DEFAULT_PORTFOLIOS = [
        ['finance', '💰', 'תיק האוצר', 'אריה קורן', 'שמרן ומדויק'], ['health', '💪', 'תיק הבריאות והספורט', 'נועה ברק', 'מעודדת אך דורשת'],
        ['education', '📚', 'תיק החינוך והלמידה', 'פרופ׳ שרה לביא', 'סקרנית ושיטתית'], ['career', '💼', 'תיק הקריירה והעבודה', 'יונתן שפירא', 'פרקטי ותחרותי'],
        ['society', '🤝', 'תיק היחסים והחברה', 'מיכל אדמון', 'אמפתית וישירה'], ['foreign', '🌐', 'תיק החוץ', 'השגריר דוד רום', 'דיפלומט זהיר'],
        ['style', '👔', 'תיק הסגנון והמראה', 'לילך אורן', 'מקפידה על פרטים'], ['time', '⏱️', 'תיק הזמן והארגון', 'עמית גל', 'קפדן'],
        ['mind', '🧠', 'תיק הנפש והרוח', 'ד״ר רות חן', 'רגועה ושואלת שאלות'], ['home', '🏠', 'תיק הבית והסביבה', 'אורי נחמיאס', 'מעשי']
    ];
    try { if (localStorage.getItem(PREFIX + 'portfolios') === null) wr('portfolios', DEFAULT_PORTFOLIOS.map(d => ({ id: d[0], icon: d[1], name: d[2], minister: d[3], style: d[4], mission: '', builtin: true }))); } catch (e) {}

    window.GOV = { esc, uid, pad, localDate, monthOf, addDays, addMonths, monthLabel, daysInMonth, HEB_MONTHS, DATE_RE, MONTH_RE, STATUS, PRIORITY, gradeFor, portfolios, promises, issues, ideas, daily, term, review, profile, score, lock, exportAll, importAll, rd, wr, TREATY_STATUS, PARTY_KIND, LEVEL, DECISION_STATUS, treaties, decisions, impactItem, optionImpact };
})();
