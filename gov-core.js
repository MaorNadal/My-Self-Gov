/* ממשל אישי - ליבה משותפת לכל הדפים: אחסון, תאריכים, ישויות, ציון חודשי, נעילה וגיבוי.
   כל המפתחות ב-localStorage מתחילים ב-gov_ . אין תלות בשרת. כל הקריאות מנקות ומאמתות נתונים (נתונים פגומים או מיובאים לא שוברים את הדפים). */
(function () {
    'use strict';
    const PREFIX = 'gov_';
    const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-\d{2}$/;
    const MIN_PROMISES = 3, MIN_DAILY_DAYS = 5;                 // ספי נתונים מינימליים לפני שניתן ציון
    const W = { promises: 60, daily: 25, self: 15 }, ISSUES_SHARE = 20, OPS_WEIGHT = 2;   // כשיש סוגיות ארוכות טווח הן 20% מהציון והשאר שומרים על היחס ביניהם (48/20/12/20); בלעדיהן 60/25/15. תמיד סכום 100
    const SECRET_KEYS = [PREFIX + 'lock', PREFIX + 'sync', PREFIX + 'ai', PREFIX + 'vault'];   // לעולם לא מיוצאים, לא מיובאים ולא מסונכרנים (נעילה, הגדרות ענן, מפתח Gemini)            // משקלי הציון החודשי

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pad = n => String(n).padStart(2, '0');
    const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    // תצוגת טקסט חופשי: שומרת ירידות שורה ורווחים כפולים (בלי להפעיל HTML)
    const nl = v => esc(v).replace(/\r?\n/g, '<br>').replace(/ {2}/g, ' &nbsp;');
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
    // קריטריון הצלחה מובנה להבטחה: ספירה מול יעד (10 ספרים), או חזרתיות (כל 21 יום). none = ידני/משימות.
    const cleanCrit = v => { const o = base(v), type = ['count', 'recurring'].includes(o.type) ? o.type : 'none';
        return { type, target: clampInt(o.target, 1, 100000, 1), unit: str(o.unit, 20), every: clampInt(o.every, 1, 365, 7), base: clampInt(o.base, 0, 100000, 0), prevLast: dateOr(o.prevLast, ''),   // base = הספירה שהצטברה בחודשים קודמים (גלגול); prevLast = הביצוע האחרון בחודש קודם
            log: (Array.isArray(o.log) ? o.log : []).slice(-400).map(x => { const q = base(x); return { at: dateOr(q.at, localDate()), value: clampInt(q.value, 1, 100000, 1) }; }) }; };
    // הערכת ביטול: ביטול אינו בהכרח שלילי. סולם 1-5: 1 שגויה ומזיקה ... 3 ניטרלית ... 5 נכונה ומועילה מאוד. by: pm (ראש הממשלה = המשתמש) או ai
    const DROP_SCALE = { 1: { l: 'שגויה ומזיקה', c: '#f87171' }, 2: { l: 'כנראה שגויה', c: '#fb923c' }, 3: { l: 'ניטרלית / לא ברור', c: '#fbbf24' }, 4: { l: 'נכונה', c: '#a3e635' }, 5: { l: 'נכונה ומועילה מאוד', c: '#34d399' } };
    const DROP_MIN = 40, DROP_CATS = { solved: 'הבעיה נפתרה מעצמה', irrelevant: 'איבדה רלוונטיות', priorities: 'שינוי סדרי עדיפויות', impossible: 'לא ניתנת לביצוע', other: 'אחר' };
    const cleanRestores = v => (Array.isArray(v) ? v : []).slice(-20).map(x => { const q = base(x); return { at: dateOr(q.at, localDate()), note: str(q.note, 600) }; });
    const cleanReviews = v => (Array.isArray(v) ? v : []).slice(-20).map(x => { const q = base(x); return { at: dateOr(q.at, localDate()), by: q.by === 'ai' ? 'ai' : 'pm', rating: clampInt(q.rating, 1, 5, 3), note: str(q.note, 1500), model: str(q.model, 60) }; });
    function addReview(entity, col, o) {
        if (!entity) return ERR0('הפריט לא נמצא.'); if (entity.status !== 'dropped') return ERR0('אפשר להעריך רק פריט שבוטל.');
        o = base(o); const by = o.by === 'ai' ? 'ai' : 'pm', rating = clampInt(o.rating, 1, 5, 0), note = str(o.note, 1500);
        if (!rating) return ERR0('בחר דירוג בסולם 1-5.'); if (by === 'pm' && note.length < 10) return ERR0('הערכה דורשת נימוק (לפחות 10 תווים): למה ההחלטה נכונה או שגויה לאור מה שקרה.');
        entity.reviews = (entity.reviews || []).concat([{ at: localDate(), by, rating, note, model: by === 'ai' ? str(o.model, 60) : '' }]); return col.save(entity) ? { ok: true } : ERR0('השמירה נכשלה.');
    }
    const promises = collection('promises', p => {
        const o = base(p), status = STATUS[o.status] ? o.status : 'open';
        return { id: str(o.id, 40) || uid(), month: MONTH_RE.test(o.month || '') ? o.month : monthOf(localDate()), pid: str(o.pid, 40), text: str(o.text, 300), why: str(o.why, 300), measure: str(o.measure, 300),
            priority: clampInt(o.priority, 1, 3, 2), status, crit: cleanCrit(o.crit), progress: status === 'done' ? 100 : clampInt(o.progress, 0, 100, 0), created: dateOr(o.created, localDate()), doneAt: dateOr(o.doneAt, ''), dropReason: str(o.dropReason, 400), dropCat: DROP_CATS[o.dropCat] ? o.dropCat : '', droppedAt: dateOr(o.droppedAt, ''), dropIssueId: str(o.dropIssueId, 40), restores: cleanRestores(o.restores), reviews: cleanReviews(o.reviews), carried: o.carried === true };
    });
    function critStatus(p) {
        const c = p.crit; if (!c || c.type === 'none') return null; const td = localDate();
        if (c.type === 'count') { const month = c.log.reduce((a, x) => a + x.value, 0), total = c.base + month; return { type: 'count', total, month, base: c.base, target: c.target, unit: c.unit, pct: Math.min(100, Math.round(total / c.target * 100)) }; }
        const inM = c.log.filter(x => x.at.slice(0, 7) === p.month), dates = [...new Set(inM.map(x => x.at))].sort(), expected = Math.ceil(daysInMonth(p.month) / c.every), last = c.log.length ? c.log.map(x => x.at).sort().pop() : (c.prevLast || '');
        const next = last ? addDays(last, c.every) : (p.created > p.month + '-01' ? p.created : p.month + '-01');
        return { type: 'recurring', done: dates.length, expected, every: c.every, last, next, due: td >= next && p.month === monthOf(td), overdue: td > next && p.month === monthOf(td), pct: Math.min(100, Math.round(dates.length / expected * 100)) };
    }
    // ---------- עזרי חזרתיות וזמן ----------
    const DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];                       // 0 = יום ראשון
    const dowOf = ds => new Date(ds + 'T00:00:00').getDay();
    const cleanDays = v => [...new Set((Array.isArray(v) ? v : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/, timeOr = (v, d) => TIME_RE.test(v || '') ? v : d;
    const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const idList = (v, n) => [...new Set((Array.isArray(v) ? v : []).map(x => str(x, 40)).filter(Boolean))].slice(0, n);
    const ERR0 = m => ({ ok: false, error: m });

    // ---------- סוגיות: עולות על הפרק, מקושרות להבטחות ולמשימות, ונסגרות רק בנימוק ----------
    const ISSUE_STATUS = { open: { l: 'עומדת על הפרק', c: '#fbbf24' }, handling: { l: 'בטיפול', c: '#38bdf8' }, resolved: { l: 'נסגרה', c: '#34d399' } , dropped: { l: 'בוטלה', c: '#a78bfa' } };
    const HORIZON = { month: 'חודשית', half: 'חצי שנתית', year: 'שנתית', date: 'עד תאריך יעד', ongoing: 'קבועה (ללא יעד)' };
    const issuesCol = collection('issues', p => { const o = base(p); return { id: str(o.id, 40) || uid(), title: str(o.title, 200), pid: str(o.pid, 40), severity: clampInt(o.severity, 1, 3, 2), status: ISSUE_STATUS[o.status] ? o.status : 'open',
        detail: str(o.detail, 1500), promiseIds: idList(o.promiseIds, 10), created: dateOr(o.created, localDate()), resolvedAt: dateOr(o.resolvedAt, ''), note: str(o.note, 800),
        dropReason: str(o.dropReason, 400), dropCat: DROP_CATS[o.dropCat] ? o.dropCat : '', droppedAt: dateOr(o.droppedAt, ''), restores: cleanRestores(o.restores), reviews: cleanReviews(o.reviews), kind: o.kind === 'distraction' ? 'distraction' : 'issue', horizon: HORIZON[o.horizon] ? o.horizon : 'month', target: dateOr(o.target, '') }; });
    const issues = {
        all: issuesCol.all, get: issuesCol.get,
        save(item) {
            const ex = item && item.id ? issuesCol.get(item.id) : null; if (ex && (ex.status === 'resolved' || ex.status === 'dropped')) return null;
            const o = Object.assign({}, item), created = (ex && ex.created) || localDate();
            if (o.horizon === 'half') o.target = addDays(created, 182); else if (o.horizon === 'year') o.target = addDays(created, 365); else if (o.horizon === 'month' || !HORIZON[o.horizon]) { o.horizon = 'month'; o.target = ''; }
            else if (o.horizon === 'ongoing') o.target = '';
            else if (o.horizon === 'date' && !(DATE_RE.test(o.target || '') && o.target > created)) return null;   // תאריך יעד חייב להיות אחרי יצירת הסוגיה
            return issuesCol.save(o);
        },
        allTasks(id) { const x = issuesCol.get(id); if (!x) return []; const seen = new Set(), out = []; liveTasks().forEach(t => { if ((t.issueId === id || t.promiseIds.some(p => x.promiseIds.includes(p))) && !seen.has(t.id)) { seen.add(t.id); out.push(t); } }); return out; },
        progress(id) { const ts = issues.allTasks(id), d = ts.filter(t => t.done).length; return { n: ts.length, done: d, pct: ts.length ? Math.round(d / ts.length * 100) : null }; },
        remove(id) { tasks.all().filter(t => t.issueId === id).forEach(t => { t.issueId = ''; tasksCol.save(t); }); return issuesCol.remove(id); },
        setStatus(id, st) { const x = issuesCol.get(id); if (!x || x.status === 'resolved' || x.status === 'dropped' || !['open', 'handling'].includes(st)) return false; x.status = st; return !!issuesCol.save(x); },
        link(id, promiseId, on) { const x = issuesCol.get(id); if (!x || x.status === 'resolved' || x.status === 'dropped') return false; x.promiseIds = on ? x.promiseIds.concat([promiseId]) : x.promiseIds.filter(v => v !== promiseId); return !!issuesCol.save(x); },
        resolve(id, note) {
            const x = issuesCol.get(id); if (!x) return ERR0('הסוגיה לא נמצאה.'); if (x.status === 'resolved') return ERR0('הסוגיה כבר נסגרה.'); if (x.status === 'dropped') return ERR0('הסוגיה בוטלה.');
            note = str(note, 400); if (note.length < 10) return ERR0('סגירת סוגיה דורשת תיעוד: מה טופל ואיך (לפחות 10 תווים).');
            const openT = issues.allTasks(id).filter(t => !t.done).length; if (openT) return ERR0('יש ' + openT + ' משימות פתוחות בסוגיה (כולל משימות של הבטחות מקושרות). השלם אותן או נתק אותן קודם.');
            x.status = 'resolved'; x.resolvedAt = localDate(); x.note = note; return issuesCol.save(x) ? { ok: true } : ERR0('השמירה נכשלה.');
        },
        dropEffects(id) {   // תצוגה מקדימה: מה יבוטל איתה (לא משנה דבר)
            const x = issuesCol.get(id); if (!x) return { promises: [], tasks: [] };
            const ps = x.promiseIds.map(pid => promises.get(pid)).filter(p => p && ['open', 'progress'].includes(p.status) && !review.isClosed(p.month) && !issuesCol.all().some(i => i.id !== id && ['open', 'handling'].includes(i.status) && i.promiseIds.includes(p.id)));
            return { promises: ps, tasks: cancelOrphans({ issueId: id, promiseIds: ps.map(p => p.id) }, '', true) };
        },
        drop(id, reason, cat) {   // ביטול סוגיה: החלטה מנומקת (סיבה + נימוק של 40 תווים לפחות), לא מחיקה. נשמרת בהיסטוריה. מחיקה (remove) היא הדרך היחידה להעלים סוגיה (נפתחה בטעות)
            const x = issuesCol.get(id); if (!x) return ERR0('הסוגיה לא נמצאה.'); if (x.status === 'resolved') return ERR0('סוגיה שנסגרה לא מבטלים.'); if (x.status === 'dropped') return ERR0('הסוגיה כבר בוטלה.');
            if (!DROP_CATS[cat]) return ERR0('בחר סיבת ביטול.'); reason = str(reason, 400); if (reason.length < DROP_MIN) return ERR0('ביטול דורש נימוק של לפחות ' + DROP_MIN + ' תווים (כמה מילים על מה קרה ולמה מוותרים). אם נפתחה בטעות, מחק אותה.');
            const fx = issues.dropEffects(id), cut = fx.promises.map(p => p.id);
            x.status = 'dropped'; x.droppedAt = localDate(); x.dropReason = reason; x.dropCat = cat; if (!issuesCol.save(x)) return ERR0('השמירה נכשלה.');
            // מדורג: הבטחות פתוחות שקושרו לסוגיה (ושאינן קשורות גם לסוגיה פעילה אחרת, ובחודש שלא נסגר) מבוטלות אוטומטית; ומשימות שנשארו בלי שום שיוך פעיל מסומנות כמבוטלות (לא נמחקות)
            fx.promises.forEach(p => { p.status = 'dropped'; p.droppedAt = localDate(); p.dropIssueId = id; p.dropCat = cat; p.dropReason = 'בוטלה אוטומטית עקב ביטול הסוגיה "' + x.title + '". הנימוק וההערכה בדף הסוגיה.'; promises.save(p); });
            const nt = cancelOrphans({ issueId: id, promiseIds: cut }, 'בוטלה עם הסוגיה "' + x.title + '"');
            return { ok: true, promises: cut.length, tasks: nt };
        },
        restore(id, note) {   // ביטול הביטול: מחזיר את הסוגיה, את ההבטחות והמשימות שבוטלו איתה (ההיסטוריה וההערכות נשמרות ביומן)
            const x = issuesCol.get(id); if (!x || x.status !== 'dropped') return ERR0('אפשר לשחזר רק סוגיה שבוטלה.'); note = str(note, 600); if (note.length < 20) return ERR0('שחזור דורש נימוק (לפחות 20 תווים): מה השתנה ולמה הסוגיה חוזרת.');
            const ps = promises.all().filter(p => p.dropIssueId === id && p.status === 'dropped' && !review.isClosed(p.month));
            x.restores = x.restores.concat([{ at: localDate(), note: note + ' (בוטלה ב-' + x.droppedAt + (DROP_CATS[x.dropCat] ? ', סיבה: ' + DROP_CATS[x.dropCat] : '') + ': ' + x.dropReason + ')' }]);
            x.status = 'open'; x.droppedAt = ''; x.dropReason = ''; x.dropCat = ''; if (!issuesCol.save(x)) return ERR0('השמירה נכשלה.');
            ps.forEach(p => { p.status = 'open'; p.dropIssueId = ''; p.dropReason = ''; p.dropCat = ''; p.droppedAt = ''; promises.save(p); });
            const ids = ['issue:' + id].concat(ps.map(p => 'promise:' + p.id)); let nt = 0;
            tasksCol.all().filter(t => t.cancelled && ids.includes(t.cancelRef)).forEach(t => { t.cancelled = false; t.cancelledAt = ''; t.cancelReason = ''; t.cancelRef = ''; tasksCol.save(t); nt++; });
            ps.forEach(p => syncPromise(p.id)); return { ok: true, promises: ps.length, tasks: nt };
        },
        review(id, o) { return addReview(issuesCol.get(id), issuesCol, o); }
    };
    const ideas = collection('ideas', p => { const o = base(p); return { id: str(o.id, 40) || uid(), pid: str(o.pid, 40), text: str(o.text, 300), status: ['new', 'adopted', 'rejected'].includes(o.status) ? o.status : 'new', created: dateOr(o.created, localDate()) }; });

    // משימות יומיות: מפתח לכל תאריך
    const daily = {
        get(ds) { const v = rd('daily_' + ds, []); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && x.text).map(x => ({ id: str(x.id, 40) || uid(), text: str(x.text, 200), done: x.done === true, pid: str(x.pid, 40) })) : []; },
        set(ds, list) { if (!DATE_RE.test(ds)) return false; if (!list.length) { del('daily_' + ds); return true; } return wr('daily_' + ds, list); }
    };

    // ממשלה חודשית (ראש ממשלה + דוקטרינה)
    const METHODS = { self: 'מינוי עצמי', election: 'בחירות (משאל)', rotation: 'רוטציה', inherited: 'המשכיות מהממשלה הקודמת', other: 'אחר' };
    const cleanTerm = v => { const o = base(v); return { kind: ['self', 'real', 'fictional'].includes(o.kind) ? o.kind : 'self', name: str(o.name, 60), doctrine: str(o.doctrine, 500), created: dateOr(o.created, ''), method: METHODS[o.method] ? o.method : 'self', startAt: dtOr(o.startAt, ''), endAt: dtOr(o.endAt, '') }; };
    const term = { get(mk) { const v = rd('term_' + mk, null); if (!v || typeof v !== 'object') return null; const c = cleanTerm(v), d = termDefaults(mk, c.created); return Object.assign(c, { startAt: c.startAt || d.startAt, endAt: c.endAt || d.endAt }); },
        set(mk, o) { if (!MONTH_RE.test(mk)) return false; const c = cleanTerm(o); if (!c.created) c.created = localDate(); const d = termDefaults(mk, c.created); if (!c.startAt) c.startAt = c.created === localDate() ? localDate() + 'T' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) + ':00' : d.startAt; if (!c.endAt) c.endAt = d.endAt; if (c.endAt <= c.startAt) return false; return wr('term_' + mk, c); },
        state: (now) => termState(now), METHODS };

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
    // ---------- אנשים וקשרים ----------
    // אינדקס קרבה = 50 + Σ(השפעת אירוע × 4 × דעיכה), דעיכה בחצי-חיים של 180 יום, חסום ל-0..100. מוצג רק מ-3 אירועים (דירוג רק אחרי מספר מקרים).
    // זה יומן חד-צדדי של המשתמש: הוא אינו מודד מה האדם השני מרגיש.
    const REL = { partner: { l: 'בן/בת זוג', i: '💞' }, family: { l: 'משפחה', i: '🏠' }, friend: { l: 'חבר/ה', i: '🤝' }, colleague: { l: 'עבודה', i: '💼' }, mentor: { l: 'מנטור/ית', i: '🎓' }, other: { l: 'אחר', i: '👤' } };
    const MIN_EVENTS = 3, HALF_LIFE_DAYS = 180, EVENT_K = 2.5;   // סולם השפעה 1-5 חיובי/שלילי: 5×2.5 = 12.5 (כמו 3×4 בעבר)
    const cleanNotes = v => (Array.isArray(v) ? v : []).slice(-5).map(x => { const o = base(x); return { at: dateOr(o.at, localDate()), text: str(o.text, 1800), by: str(o.by, 40) }; }).filter(x => x.text);
    const peopleCol = collection('people', p => { const o = base(p), r = Number(o.rhythmDays); return {
        id: str(o.id, 40) || uid(), name: str(o.name, 40), relation: REL[o.relation] ? o.relation : 'other', notes: str(o.notes, 400),
        rhythmDays: (o.rhythmDays != null && o.rhythmDays !== '' && isFinite(r) && r >= 1) ? clampInt(r, 1, 365, null) : null,
        created: dateOr(o.created, localDate()), archived: o.archived === true, aiNotes: cleanNotes(o.aiNotes) }; });
    const relEvCol = collection('relevents', p => { const o = base(p); return { id: str(o.id, 40) || uid(), personId: str(o.personId, 40), date: dateOr(o.date, localDate()), text: str(o.text, 300), impact: clampInt(o.impact, -5, 5, 0), treatyId: str(o.treatyId, 40), auto: o.auto === true }; });
    const people = {
        all: peopleCol.all, get: peopleCol.get, save: peopleCol.save,
        remove(id) { wr('relevents', relEvCol.all().filter(e => e.personId !== id)); return peopleCol.remove(id); }   // האמנות נשארות (עם שם הצד), רק האירועים של האדם נמחקים
    };
    const relEvents = {
        all: relEvCol.all, get: relEvCol.get, save: relEvCol.save,
        remove(id) { const e = relEvCol.get(id); if (e && e.auto) return false; return relEvCol.remove(id); }   // אירוע אוטומטי משקף רישום אמנה ונעול
    };
    const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
    function closenessAt(evs, asOf) { let sum = 0; evs.forEach(e => { if (e.date > asOf) return; sum += e.impact * EVENT_K * Math.pow(0.5, Math.max(0, dayDiff(asOf, e.date)) / HALF_LIFE_DAYS); }); return Math.max(0, Math.min(100, Math.round(50 + sum))); }
    function closeness(pid) {
        const evs = relEvCol.all().filter(e => e.personId === pid).sort((a, b) => a.date.localeCompare(b.date)), n = evs.length, today = localDate();
        const dates = [...new Set(evs.map(e => e.date))].filter(d => evs.filter(e => e.date <= d).length >= MIN_EVENTS);
        return { n, min: MIN_EVENTS, score: n >= MIN_EVENTS ? closenessAt(evs, today) : null, trend: dates.map(d => ({ date: d, score: closenessAt(evs, d) })),
            lastContact: n ? evs[n - 1].date : '', positive: evs.filter(e => e.impact > 0).length, negative: evs.filter(e => e.impact < 0).length };
    }
    function contactStatus(p) {
        const last = relEvCol.all().filter(e => e.personId === p.id).reduce((m, e) => e.date > m ? e.date : m, ''), days = dayDiff(localDate(), last || p.created);
        return { last, days, rhythm: p.rhythmDays, overdue: !!(p.rhythmDays && !p.archived && days > p.rhythmDays) };
    }
    const relationAlerts = () => peopleCol.all().map(p => ({ p, s: contactStatus(p) })).filter(x => x.s.overdue);

    // ---------- יחסי חוץ ואמנות (מתועדות בכל מצב) ----------
    // לכל אמנה יומן append-only: יצירה, עדכוני התקדמות (עם אחוז), עריכות (מה השתנה), סגירה (קוימה/הופרה/הסתיימה) והערות, גם אחרי הסגירה.
    // אין פעולה שמוחקת או משנה רשומת יומן. אמנה שנסגרה נעולה לעריכה, אך ממשיכה לקבל הערות (למשל "היחסים התאוששו").
    const LOG_KINDS = ['created', 'update', 'edited', 'closed', 'note'];
    const cleanLog = v => (Array.isArray(v) ? v : []).slice(-300).map(x => { const o = base(x); return { id: str(o.id, 40) || uid(), at: dateOr(o.at, localDate()), kind: LOG_KINDS.includes(o.kind) ? o.kind : 'note', text: str(o.text, 300),
        progress: (o.progress == null || o.progress === '' || !isFinite(o.progress)) ? null : clampInt(o.progress, 0, 100, null), status: TREATY_STATUS[o.status] ? o.status : '' }; });
    const cleanTreaty = p => { const o = base(p); return {
        id: str(o.id, 40) || uid(), party: str(o.party, 60), personId: str(o.personId, 40), kind: PARTY_KIND[o.kind] ? o.kind : 'person', title: str(o.title, 140), terms: str(o.terms, 600),
        cost: str(o.cost, 300), costLevel: clampInt(o.costLevel, 1, 3, 2), status: TREATY_STATUS[o.status] ? o.status : 'active', due: dateOr(o.due, ''), pid: str(o.pid, 40),
        progress: clampInt(o.progress, 0, 100, 0), created: dateOr(o.created, localDate()), closedAt: dateOr(o.closedAt, ''), note: str(o.note, 400), log: cleanLog(o.log),
        recur: cleanDays(o.recur), rec: cleanRec(o.rec, dateOr(o.created, localDate())), checks: [...new Set((Array.isArray(o.checks) ? o.checks : []).filter(d => DATE_RE.test(d || '')))].sort().slice(-400) }; };
    const treatyCol = collection('treaties', cleanTreaty);
    // מחויבות קבועה של אמנה: ימים בשבוע (recur) או חזרתיות כללית (rec: כל N ימים/שבועות/חודשים); אותו מנגנון כמו בשגרות
    const tHas = t => t.rec.kind !== 'weekdays' || t.recur.length > 0;
    const tOn = (t, ds) => t.rec.kind === 'weekdays' ? t.recur.includes(dowOf(ds)) : routines.recOn({ rec: t.rec, days: [] }, ds);
    const tLabel = t => t.rec.kind === 'weekdays' ? dayLbl(t.recur) : routines.recLabel({ rec: t.rec, days: [] });
    const EDIT_LABELS = { party: 'הצד', personId: 'הקישור לאדם', kind: 'סוג הצד', title: 'הכותרת', terms: 'התנאים', cost: 'מחיר ההפרה', costLevel: 'חומרת ההפרה', due: 'המועד', pid: 'התיק', recur: 'התדירות' };
    const ERR = m => ({ ok: false, error: m });
    function treatyTimeline(t) {
        const log = t.log.slice();
        if (!log.some(x => x.kind === 'created')) log.unshift({ id: 'syn-c', at: t.created, kind: 'created', text: 'נוצרה אמנה מול ' + t.party, progress: null, status: '', synthetic: true });
        if (t.status !== 'active' && !log.some(x => x.kind === 'closed')) log.push({ id: 'syn-x', at: t.closedAt || t.created, kind: 'closed', text: t.note || '', progress: null, status: t.status, synthetic: true });
        return log.sort((a, b) => a.at.localeCompare(b.at));
    }
    const treaties = {
        all: treatyCol.all, get: treatyCol.get,
        save(item) {
            const ex = item && item.id ? treatyCol.get(item.id) : null;
            if (ex && ex.status !== 'active') return null;
            const nx = Object.assign({}, item, { status: 'active' }), c = cleanTreaty(nx);
            if (!ex) nx.log = [{ kind: 'created', at: localDate(), text: 'נוצרה אמנה מול ' + c.party + (c.due ? ' (מועד ' + c.due + ')' : ''), progress: c.progress }];
            else {
                nx.log = ex.log.slice(); nx.progress = ex.progress; nx.checks = ex.checks;          // התקדמות משתנה רק דרך addUpdate, כדי שכל שינוי יתועד
                const sig = (o, f) => f === 'recur' ? JSON.stringify([o.recur, o.rec ? [o.rec.kind, o.rec.n, o.rec.unit, o.rec.dom, o.rec.anchor] : null]) : String(o[f]);
                const ch = Object.keys(EDIT_LABELS).filter(f => sig(ex, f) !== sig(c, f));
                if (ch.length) nx.log.push({ kind: 'edited', at: localDate(), text: 'עודכנו: ' + ch.map(f => EDIT_LABELS[f]).join(', ') + (ch.includes('due') ? ` (מועד: ${ex.due || 'ללא'} ← ${c.due || 'ללא'})` : '') + (ch.includes('costLevel') ? ` (חומרת הפרה: ${LEVEL[ex.costLevel]} ← ${LEVEL[c.costLevel]})` : '') });
            }
            return treatyCol.save(nx);
        },
        remove(id) { const ex = treatyCol.get(id); if (ex && ex.status !== 'active') return false; return treatyCol.remove(id); },
        addTask(id, o) {   // משימה מתוך אמנה: חד-פעמית (עם תאריך ושעה), או קבועה (ימים בשבוע + שעה)
            const t = treatyCol.get(id); if (!t || t.status !== 'active') return ERR('אפשר להוסיף משימות רק לאמנה בתוקף.'); o = base(o);
            const text = str(o.text, 200); if (text.length < 2) return ERR('נסח את המשימה (לפחות 2 תווים).');
            const days = cleanDays(o.days), rec = o.rec && o.rec.kind && o.rec.kind !== 'weekdays' ? cleanRec(o.rec, localDate()) : null; let made;
            if (rec) made = routines.save({ text, pid: o.pid || t.pid, rec, time: o.time, treatyId: id });
            else if (days.length) made = routines.save({ text, pid: o.pid || t.pid, days, time: o.time, treatyId: id });
            else { if (!DATE_RE.test(o.due || '')) return ERR('בחר תאריך למשימה, או ימים לשגרה קבועה.'); made = tasks.save({ text, pid: o.pid || t.pid, due: o.due, time: o.time, treatyId: id }); }
            if (!made) return ERR('השמירה נכשלה.');
            t.log = t.log.concat([{ kind: 'note', at: localDate(), text: 'נוצרה ' + ((rec || days.length) ? 'משימה קבועה (' + (rec ? routines.recLabel({ rec, days: [] }) : dayLbl(days)) + (timeOr(o.time, '') ? ' ' + o.time : '') + ')' : 'משימה (' + o.due + (timeOr(o.time, '') ? ' ' + o.time : '') + ')') + ': ' + text }]);
            return treatyCol.save(t) ? { ok: true } : ERR('השמירה נכשלה.');
        },
        dueOn: ds => treatyCol.all().filter(t => t.status === 'active' && tOn(t, ds) && t.created <= ds),
        hasRec: t => tHas(t), recLabel: t => tLabel(t), recOn: tOn,
        check(id, ds) {   // סימון ביצוע של מחויבות קבועה: היום או עד 7 ימים אחורה, ורק ביום שבו היא חלה
            const t = treatyCol.get(id); if (!t || t.status !== 'active') return ERR('האמנה לא פעילה.');
            if (!DATE_RE.test(ds || '') || ds > localDate() || ds < addDays(localDate(), -7)) return ERR('אפשר לסמן היום או עד 7 ימים אחורה.');
            if (!tOn(t, ds)) return ERR('המחויבות לא חלה ביום הזה.');
            t.checks = t.checks.includes(ds) ? t.checks.filter(x => x !== ds) : t.checks.concat([ds]); return treatyCol.save(t) ? { ok: true } : ERR('השמירה נכשלה.');
        },
        compliance(t) {
            if (!tHas(t)) return null; const end = t.closedAt || localDate(), y = addDays(localDate(), -1); let sched = 0, done = 0;
            for (let d = t.created; d <= end; d = addDays(d, 1)) { if (!tOn(t, d)) continue; const ok = t.checks.includes(d); if (d <= y || ok) { sched++; if (ok) done++; } }
            return { scheduled: sched, done, pct: sched >= 3 ? Math.round(done / sched * 100) : null };
        },
        addUpdate(id, text, progress) {
            const t = treatyCol.get(id); if (!t) return ERR('האמנה לא נמצאה.');
            if (t.status !== 'active') return ERR('אמנה שנסגרה אינה מקבלת עדכוני התקדמות. אפשר להוסיף הערה.');
            text = str(text, 300); if (text.length < 3) return ERR('תאר את העדכון (לפחות 3 תווים).');
            const pr = (progress == null || progress === '') ? t.progress : clampInt(progress, 0, 100, t.progress);
            t.progress = pr; t.log = t.log.concat([{ kind: 'update', at: localDate(), text, progress: pr }]);
            return treatyCol.save(t) ? { ok: true } : ERR('השמירה נכשלה.');
        },
        addNote(id, text) {
            const t = treatyCol.get(id); if (!t) return ERR('האמנה לא נמצאה.');
            text = str(text, 300); if (text.length < 3) return ERR('כתוב הערה (לפחות 3 תווים).');
            t.log = t.log.concat([{ kind: 'note', at: localDate(), text }]);
            return treatyCol.save(t) ? { ok: true } : ERR('השמירה נכשלה.');
        },
        close(id, status, note) {
            const t = treatyCol.get(id); if (!t) return ERR('האמנה לא נמצאה.');
            if (t.status !== 'active') return ERR('האמנה כבר נסגרה ואי אפשר לשנות אותה.');
            if (!['fulfilled', 'breached', 'ended'].includes(status)) return ERR('סטטוס לא חוקי.');
            note = str(note, 400);
            if (status === 'breached' && note.length < 10) return ERR('הפרת אמנה דורשת תיעוד: מה קרה ולמה (לפחות 10 תווים).');
            t.status = status; t.closedAt = localDate(); t.note = note; if (status === 'fulfilled') t.progress = 100;
            t.log = t.log.concat([{ kind: 'closed', at: localDate(), text: note, status, progress: t.progress }]);
            if (!treatyCol.save(t)) return ERR('השמירה נכשלה.');
            routines.all().filter(r => r.treatyId === id && !r.endedAt).forEach(r => routines.stop(r.id, 'האמנה נסגרה'));
            // אירוע אוטומטי ביומן היחסים של האדם המקושר: הפרה פוגעת בקרבה לפי חומרתה, קיום תורם פחות (קיום הוא ברירת המחדל הצפויה).
            let eventAdded = false;
            if (t.personId && peopleCol.get(t.personId) && (status === 'breached' || status === 'fulfilled')) {
                eventAdded = !!relEvCol.save({ personId: t.personId, date: localDate(), treatyId: t.id, auto: true, impact: status === 'breached' ? -[0, 2, 3, 5][t.costLevel] : [0, 1, 2, 3][t.costLevel], text: `אמנה "${t.title}" ${status === 'breached' ? 'הופרה' : 'קוימה'}` });
            }
            return { ok: true, eventAdded };
        }
    };

    // ---------- קבינט: החלטות ----------
    // זרימה: פתוחה לדיון → הוכרעה (נעולה, עם נימוק ותאריך בדיקה) → נבדקה בדיעבד (פעם אחת, לא ניתנת לשכתוב) | בוטלה (בנימוק).
    // בדיקה בדיעבד מפרידה בין "איכות ההחלטה לפי מה שידעת" לבין "איך זה יצא": תוצאה רעה אינה הוכחה להחלטה גרועה, ולהפך.
    const DECISION_STATUS = { open: { l: 'פתוחה לדיון', c: '#fbbf24' }, decided: { l: 'הוכרעה', c: '#34d399' }, revoked: { l: 'בוטלה', c: '#a78bfa' } };
    const cleanImpact = i => { const o = base(i); return { kind: o.kind === 'treaty' ? 'treaty' : 'promise', ref: str(o.ref, 40), effect: o.effect === 'harms' ? 'harms' : 'supports' }; };
    const cleanOption = v => { const o = base(v); return { id: str(o.id, 40) || uid(), text: str(o.text, 200), pros: str(o.pros, 300), cons: str(o.cons, 300), impacts: (Array.isArray(o.impacts) ? o.impacts : []).slice(0, 12).map(cleanImpact).filter(i => i.ref) }; };
    const cleanRating = v => (v == null || v === '' || !isFinite(v)) ? null : clampInt(v, 1, 5, null);
    // צילום מצב של ההשפעה בשעת ההכרעה: נשמר כדי שהתצוגה לא תשתנה בדיעבד כשאמנה נסגרת או הבטחה מושלמת.
    const cleanSnapshot = v => (Array.isArray(v) ? v : []).slice(0, 6).map(x => { const o = base(x); return { optionId: str(o.optionId, 40), supports: clampInt(o.supports, 0, 99, 0), harms: clampInt(o.harms, 0, 99, 0), treatyCost: clampInt(o.treatyCost, 0, 999, 0), promiseCost: clampInt(o.promiseCost, 0, 999, 0),
        items: (Array.isArray(o.items) ? o.items : []).slice(0, 12).map(i => { const q = base(i); return { kind: q.kind === 'treaty' ? 'treaty' : 'promise', effect: q.effect === 'harms' ? 'harms' : 'supports', label: str(q.label, 160), counts: q.counts === true, level: clampInt(q.level, 0, 3, 0), cost: str(q.cost, 300), missing: q.missing === true }; }) }; }).filter(x => x.optionId);
    const cleanDecision = p => {
        const o = base(p), options = (Array.isArray(o.options) ? o.options : []).slice(0, 6).map(cleanOption).filter(x => x.text);
        return { id: str(o.id, 40) || uid(), title: str(o.title, 160), context: str(o.context, 800), pid: str(o.pid, 40), status: DECISION_STATUS[o.status] ? o.status : 'open',
            created: dateOr(o.created, localDate()), decidedAt: dateOr(o.decidedAt, ''), reviewAt: dateOr(o.reviewAt, ''), options, chosen: options.some(x => x.id === o.chosen) ? o.chosen : '',
            rationale: str(o.rationale, 800), doubts: str(o.doubts, 600), revokeReason: str(o.revokeReason, 300),
            outcome: str(o.outcome, 800), outcomeRating: cleanRating(o.outcomeRating), processRating: cleanRating(o.processRating), reviewedAt: dateOr(o.reviewedAt, ''),
            impactSnapshot: cleanSnapshot(o.impactSnapshot), aiNotes: cleanNotes(o.aiNotes) };
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
            d.impactSnapshot = d.options.map(o => { const q = optionImpact(o); return { optionId: o.id, supports: q.supports, harms: q.harms, treatyCost: q.treatyCost, promiseCost: q.promiseCost, items: q.items }; });
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
        addAiNote(id, text, by) {
            const d = decCol.get(id); if (!d) return ERR('ההחלטה לא נמצאה.');
            if (d.status !== 'open') return ERR('אפשר לצרף ייעוץ רק להחלטה פתוחה.');
            text = str(text, 1800); if (text.length < 20) return ERR('התשובה קצרה מדי.');
            d.aiNotes = d.aiNotes.concat([{ at: localDate(), text, by: str(by, 40) }]).slice(-5);
            return decCol.save(d) ? { ok: true } : ERR('השמירה נכשלה.');
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
    // סוגיות ארוכות טווח (חצי שנתית/שנתית/עד תאריך): ציון קצב = אחוז משימות שבוצעו ביחס לחלק הזמן שחלף עד תאריך היעד. נדרשות 3 משימות לפחות.
    function issuesScore(mk) {
        const t = localDate(), endM = mk + '-' + pad(daysInMonth(mk)), asOf = t < endM ? t : endM; let sw = 0, sum = 0;
        issuesCol.all().filter(i => i.kind === 'issue' && i.horizon !== 'month' && (i.target || i.horizon === 'ongoing') && i.created <= asOf && i.status !== 'dropped' && (i.status !== 'resolved' || (i.resolvedAt && i.resolvedAt.slice(0, 7) >= mk))).forEach(i => {
            let v, conf = 1; if (i.status === 'resolved') v = !i.target || i.resolvedAt <= i.target ? 100 : 70;
            else if (i.horizon === 'ongoing') {   // קבועה: אין יעד ולכן אין "קצב". נמדדת לפי המשימות הרלוונטיות לחודש: שמועדן בחודש, שבוצעו בו, או שפתוחות ובאיחור
                const rel = issues.allTasks(i.id).filter(t => (t.due || t.created).slice(0, 7) === mk || (t.done && (t.doneAt || '').slice(0, 7) === mk) || (!t.done && t.due && t.due < asOf)); if (rel.length < 1) return; v = Math.round(rel.filter(t => t.done).length / rel.length * 100); conf = Math.min(1, rel.length / 3); }   // גם משימה אחת בחודש נספרת, במשקל יחסי (עד 3 משימות = משקל מלא)
            else { const p = issues.progress(i.id); if (p.n < 3 || dayDiff(asOf, i.created) < 14) return;   // סוגיה חדשה (פחות מ-14 יום) עדיין לא נמדדת: אחרת היא מקבלת 100 "בחינם" בתחילת הדרך
                const span = Math.max(1, dayDiff(i.target, i.created)), exp = Math.min(1, Math.max(0, dayDiff(asOf, i.created) / span));
                v = asOf >= i.target ? p.pct : exp <= 0.05 ? 100 : Math.min(100, Math.round(p.pct / (exp * 100) * 100)); }
            sw += i.severity * conf; sum += i.severity * conf * v; });
        // מבצעים ורפורמות: יחידה גבוהה מסוגיה. משקל = 2 × חשיבות (2/4/6) לעומת חומרת סוגיה (1/2/3). נמדדים לפי שלבים שבוצעו
        opsCol.all().filter(op => op.status !== 'dropped' && op.created <= asOf && (op.status !== 'done' || (op.doneAt && op.doneAt.slice(0, 7) >= mk))).forEach(op => {
            let v, conf = 1; const w0 = OPS_WEIGHT * op.importance;
            if (op.status === 'done') v = !op.target || op.doneAt <= op.target ? 100 : 70;
            else { const n = op.stages.length, pct = n ? op.stages.filter(s => s.done).length / n * 100 : 0, age = dayDiff(asOf, op.created); if (n < 2 || age < 14) return;
                if (op.target) { const span = Math.max(1, dayDiff(op.target, op.created)), exp = Math.min(1, Math.max(0, age / span)); v = asOf >= op.target ? Math.round(pct) : exp <= 0.05 ? 100 : Math.min(100, Math.round(pct / (exp * 100) * 100)); }
                else { v = Math.round(pct); conf = Math.min(1, age / 30); } }   // בלי יעד: האחוז שהושלם, ובמשקל עולה עם הגיל (30 יום = מלא)
            sw += w0 * conf; sum += w0 * conf * v; });
        return sw ? Math.round(sum / sw) : null;
    }
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
            const l = dayItems(ds); if (!l.length) continue;
            const dn = l.filter(x => x.done).length; days++; planned += l.length; doneN += dn; ratio += dn / l.length;
        }
        const dl = days >= MIN_DAILY_DAYS ? ratio / days * 100 : null;
        const rv = review.get(mk), self = rv.selfScore;
        const iv = issuesScore(mk), k = iv != null ? (100 - ISSUES_SHARE) / 100 : 1;
        const nominal = [{ id: 'promises', w: W.promises * k, v: pr }, { id: 'daily', w: W.daily * k, v: dl }, { id: 'self', w: W.self * k, v: self }, { id: 'issues', w: iv != null ? ISSUES_SHARE : 0, v: iv }];
        const have = nominal.filter(p => p.v != null), tW = have.reduce((a, p) => a + p.w, 0);   // רכיב חסר מוסר והמשקלים מנורמלים מחדש ל-100
        const parts = nominal.map(p => ({ id: p.id, v: p.v, w: p.v != null && tW ? Math.round(p.w / tW * 100) : (p.id === 'issues' ? ISSUES_SHARE : Math.round(p.w)) }));
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
        lockNow() { const V = window.GOV_VAULT; (V ? V.lock() : Promise.resolve()).then(() => { ss.del('gov_unlocked'); location.reload(); }); }
    };

    // ---------- משימות (מקושרות להבטחה ו/או סוגיה; התקדמות ההבטחה נגזרת מהן) ----------
    const tasksCol = collection('tasks', p => { const o = base(p), ids = idList([o.promiseId].concat(Array.isArray(o.promiseIds) ? o.promiseIds : []), 8), created = dateOr(o.created, localDate()), mode = o.mode === 'by' ? 'by' : 'on';
        return { id: str(o.id, 40) || uid(), text: str(o.text, 200), promiseId: ids[0] || '', promiseIds: ids, issueId: str(o.issueId, 40), pid: str(o.pid, 40),
            due: dateOr(o.due, ''), time: timeOr(o.time, ''), mode: mode === 'by' && dateOr(o.due, '') ? 'by' : 'on', from: dateOr(o.from, created),   // mode 'by': פתוחה לביצוע בכל יום בטווח from..due עד שתבוצע
            treatyId: str(o.treatyId, 40), done: o.done === true, doneAt: dateOr(o.doneAt, ''), created,
            cancelled: o.cancelled === true, cancelledAt: dateOr(o.cancelledAt, ''), cancelReason: str(o.cancelReason, 300), cancelRef: str(o.cancelRef, 60) }; });
    const liveTasks = () => tasksCol.all().filter(t => !t.cancelled);
    function cancelOrphans(o, reason, dry) {   // מסמן כמבוטלות (לא מוחק) משימות פתוחות שנשארו בלי שיוך פעיל אחרי ביטול סוגיה/הבטחה
        let n = 0; const gone = o.promiseIds || [], would = [];
        tasksCol.all().forEach(t => {
            if (t.done || t.cancelled) return;
            if (!((o.issueId && t.issueId === o.issueId) || t.promiseIds.some(p => gone.includes(p)))) return;
            const keepP = t.promiseIds.some(pid => { const p = promises.get(pid); return p && p.status !== 'dropped' && !gone.includes(pid); });
            const is = t.issueId && t.issueId !== o.issueId ? issuesCol.get(t.issueId) : null, keepI = !!(is && ['open', 'handling'].includes(is.status));
            if (keepP || keepI) return; if (dry) { would.push(t); return; } t.cancelled = true; t.cancelledAt = localDate(); t.cancelReason = str(reason, 300); t.cancelRef = o.issueId ? 'issue:' + o.issueId : 'promise:' + (gone[0] || ''); tasksCol.save(t); n++;
        }); return dry ? would : n;
    }
    function syncPromise(id) {   // התקדמות = אחוז משימות שבוצעו. לא נוגע בהבטחה שהוכרעה (בוצעה/נכשלה/הוסרה) או בחודש שנסגר.
        const p = id && promises.get(id); if (!p || ['done', 'failed', 'dropped'].includes(p.status) || review.isClosed(p.month)) return;
        const ts = liveTasks().filter(t => t.promiseIds.includes(id)), cs = critStatus(p); if (!ts.length && !cs) return;
        const pr = ts.length ? Math.round(ts.filter(t => t.done).length / ts.length * 100) : cs.pct, st = pr > 0 ? 'progress' : 'open';   // משימות קודמות לקריטריון
        if (p.progress !== pr || p.status !== st) { p.progress = pr; p.status = st; promises.save(p); }
    }
    promises.logCrit = function (id, value, date) {
        const p = promises.get(id), td = localDate(); date = date || td; if (!p) return ERR0('ההבטחה לא נמצאה.'); if (review.isClosed(p.month)) return ERR0('החודש נסגר.');
        if (['done', 'failed', 'dropped'].includes(p.status)) return ERR0('ההבטחה כבר הוכרעה.'); if (p.crit.type === 'none') return ERR0('להבטחה אין קריטריון הצלחה.');
        if (!DATE_RE.test(date) || date > td || date.slice(0, 7) !== p.month) return ERR0('תאריך לא חוקי.');
        const v = p.crit.type === 'recurring' ? 1 : clampInt(value, 1, 100000, 0); if (!v) return ERR0('הזן כמות חיובית.');
        if (p.crit.type === 'recurring' && p.crit.log.some(x => x.at === date)) return ERR0('כבר סומן ביצוע בתאריך הזה.');
        p.crit.log = p.crit.log.concat([{ at: date, value: v }]); promises.save(p); syncPromise(id); return { ok: true };
    };
    promises.dropEffects = function (id) { const p = promises.get(id); return { tasks: p ? cancelOrphans({ promiseIds: [id] }, '', true) : [] }; };
    promises.drop = function (id, reason, cat) {   // הסרה בנימוק (לא מחיקה): סיבה + 40 תווים לפחות; נשמרת בהיסטוריה ומקבלת הערכה בדיעבד
        const p = promises.get(id); if (!p) return ERR0('ההבטחה לא נמצאה.'); if (p.status === 'dropped') return ERR0('ההבטחה כבר הוסרה.'); if (review.isClosed(p.month)) return ERR0('החודש נסגר.');
        if (!DROP_CATS[cat]) return ERR0('בחר סיבת הסרה.'); reason = str(reason, 400); if (reason.length < DROP_MIN) return ERR0('הסרה דורשת נימוק של לפחות ' + DROP_MIN + ' תווים.');
        p.status = 'dropped'; p.dropReason = reason; p.dropCat = cat; p.droppedAt = localDate(); if (!promises.save(p)) return ERR0('השמירה נכשלה.');
        return { ok: true, tasks: cancelOrphans({ promiseIds: [id] }, 'בוטלה עם ההבטחה "' + p.text + '"') };
    };
    promises.restore = function (id, note) {
        const p = promises.get(id); if (!p || p.status !== 'dropped') return ERR0('אפשר לשחזר רק הבטחה שהוסרה.'); if (p.dropIssueId) return ERR0('הבטחה זו בוטלה אוטומטית עם סוגיה. שחזר את הסוגיה (היא תחזיר גם אותה).'); if (review.isClosed(p.month)) return ERR0('החודש נסגר.');
        note = str(note, 600); if (note.length < 20) return ERR0('שחזור דורש נימוק (לפחות 20 תווים).');
        p.restores = p.restores.concat([{ at: localDate(), note: note + ' (הוסרה ב-' + p.droppedAt + ': ' + p.dropReason + ')' }]); p.status = 'open'; p.dropReason = ''; p.dropCat = ''; p.droppedAt = ''; if (!promises.save(p)) return ERR0('השמירה נכשלה.');
        let nt = 0; tasksCol.all().filter(t => t.cancelled && t.cancelRef === 'promise:' + id).forEach(t => { t.cancelled = false; t.cancelledAt = ''; t.cancelReason = ''; t.cancelRef = ''; tasksCol.save(t); nt++; });
        syncPromise(id); return { ok: true, tasks: nt };
    };
    promises.review = function (id, o) { const p = promises.get(id); if (p && p.dropIssueId) return ERR0('הבטחה זו בוטלה אוטומטית עם סוגיה. ההערכה נעשית בדף הסוגיה.'); return addReview(p, promises, o); };   // מותר גם בחודש סגור: זו הערכה בדיעבד, לא שינוי בהבטחה
    promises.undoCrit = function (id) { const p = promises.get(id); if (!p || review.isClosed(p.month) || ['done', 'failed', 'dropped'].includes(p.status) || !p.crit.log.length) return false; p.crit.log = p.crit.log.slice(0, -1); promises.save(p); syncPromise(id); return true; };
    const syncAll = (...lists) => [...new Set([].concat(...lists))].forEach(syncPromise);
    const tasks = {
        all: liveTasks, get: tasksCol.get, cancelled: () => tasksCol.all().filter(t => t.cancelled),
        save(item) {
            const ex = item && item.id ? tasksCol.get(item.id) : null, o = Object.assign({}, item);
            if (o.mode === 'by') { if (!DATE_RE.test(o.due || '')) return null; const from = DATE_RE.test(o.from || '') ? o.from : ((ex && ex.from) || localDate()); if (from > o.due) return null; o.from = from; }
            if (ex && ex.cancelled) return null;   // משימה מבוטלת נעולה
            const c = tasksCol.save(o); if (c) syncAll(c.promiseIds, ex ? ex.promiseIds : []); return c;
        },
        remove(id) { const t = tasksCol.get(id), r = tasksCol.remove(id); if (t) syncAll(t.promiseIds); return r; },
        toggle(id) { const t = tasksCol.get(id); if (!t || t.cancelled) return null; t.done = !t.done; t.doneAt = t.done ? localDate() : ''; const c = tasksCol.save(t); syncAll(t.promiseIds); return c; },
        link(id, promiseId, on) { const t = tasksCol.get(id); if (!t || t.cancelled || !promises.get(promiseId)) return false; const ids = on ? t.promiseIds.concat([promiseId]) : t.promiseIds.filter(v => v !== promiseId); t.promiseIds = ids; const c = tasksCol.save(t); syncAll([promiseId], t.promiseIds); return !!c; },
        forPromise: id => liveTasks().filter(t => t.promiseIds.includes(id)),
        forIssue: id => liveTasks().filter(t => t.issueId === id),
        forPortfolio: pid => liveTasks().filter(t => t.pid ? t.pid === pid : !!(t.promiseId && (promises.get(t.promiseId) || {}).pid === pid))
    };

    // ---------- רשימה צדדית (רצונות לזמן הפנוי): סרטים, טיולים, מקומות... מחוץ לסדר העדיפויות. לא נכנסת לציון, לא מתערבבת עם משימות; כשמבצעים - מופיעה ברשימה נפרדת ב"פעולות היום" ----------
    const wishCol = collection('wish', p => { const o = base(p); return { id: str(o.id, 40) || uid(), cat: str(o.cat, 40) || 'כללי', text: str(o.text, 200), note: str(o.note, 300), done: o.done === true, doneAt: dateOr(o.doneAt, ''), created: dateOr(o.created, localDate()) }; });
    const wish = {
        all: wishCol.all, get: wishCol.get, remove: wishCol.remove,
        cats: () => [...new Set(wishCol.all().map(w => w.cat))].sort((a, b) => a.localeCompare(b, 'he')),
        save(item) { const o = base(item); if (str(o.text, 200).length < 2) return null; return wishCol.save(o); },
        toggle(id) { const w = wishCol.get(id); if (!w) return null; w.done = !w.done; w.doneAt = w.done ? localDate() : ''; return wishCol.save(w); },
        doneOn: d => wishCol.all().filter(w => w.done && w.doneAt === d)
    };
    promises.carry = function (id, toMonth) {   // גלגול: ההבטחה ממשיכה עם הספירה שהצטברה (base) ומוסיפה ספירה של החודש החדש; משימות פתוחות וסוגיות מקושרות עוברות איתה
        const p = promises.get(id); if (!p || !MONTH_RE.test(toMonth || '')) return null; const cs = critStatus(p), c = p.crit;
        const nc = c.type === 'count' ? { type: 'count', target: c.target, unit: c.unit, every: c.every, base: cs.total, log: [] } : c.type === 'recurring' ? { type: 'recurring', target: c.target, unit: c.unit, every: c.every, base: 0, prevLast: cs.last || c.prevLast || '', log: [] } : null;
        const n = promises.save({ month: toMonth, text: p.text, pid: p.pid, priority: p.priority, measure: p.measure, why: p.why, carried: true, crit: nc || undefined }); if (!n) return null;
        liveTasks().filter(t => !t.done && t.promiseIds.includes(id)).forEach(t => { t.promiseId = n.id; t.promiseIds = [n.id].concat(t.promiseIds); tasksCol.save(t); });
        issuesCol.all().filter(i => ['open', 'handling'].includes(i.status) && i.promiseIds.includes(id)).forEach(i => { i.promiseIds = i.promiseIds.concat([n.id]); issuesCol.save(i); });
        syncPromise(n.id); return n;
    };
    // ---------- שגרות (משימות בסיס): עוברות בירושה מממשלה לממשלה; שינוי בתדירות יוצר גרסה חדשה מהיום ----------
    // תדירות: weekdays = ימים קבועים בשבוע • interval = כל N ימים/שבועות מתאריך עוגן (שבועיים, שלושה שבועות...) • monthly = כל N חודשים ביום קבוע בחודש (נחתך לסוף חודש קצר)
    const REC_KINDS = { weekdays: 'ימים קבועים בשבוע', interval: 'כל N ימים / שבועות', monthly: 'כל N חודשים ביום קבוע' };
    const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
    const cleanRec = (v, since) => { const o = base(v), kind = REC_KINDS[o.kind] ? o.kind : 'weekdays'; return { kind, n: clampInt(o.n, 1, kind === 'monthly' ? 12 : 90, 1), unit: o.unit === 'week' ? 'week' : 'day', dom: clampInt(o.dom, 1, 31, 1), anchor: dateOr(o.anchor, since) }; };
    const cleanRlog = v => (Array.isArray(v) ? v : []).slice(-60).map(x => { const o = base(x); return { at: dateOr(o.at, localDate()), text: str(o.text, 200) }; }).filter(x => x.text);
    const routinesCol = collection('routines', p => { const o = base(p), since = dateOr(o.since, localDate()); return { id: str(o.id, 40) || uid(), text: str(o.text, 200), pid: str(o.pid, 40), days: cleanDays(o.days), time: timeOr(o.time, ''), treatyId: str(o.treatyId, 40),
        rec: cleanRec(o.rec, since), since, endedAt: dateOr(o.endedAt, ''), log: cleanRlog(o.log) }; });
    const dayLbl = d => d.length === 7 ? 'כל יום' : d.length ? 'ימים ' + d.map(x => DOW[x]).join('׳, ') + '׳' : 'ללא ימים';
    const nWord = (n, one, two, many) => n === 1 ? one : n === 2 ? two : n + ' ' + many;
    function recLabel(r) {
        const c = r.rec;
        if (c.kind === 'interval') { if (c.unit === 'day' && c.n === 1) return 'כל יום'; return 'כל ' + (c.unit === 'week' ? nWord(c.n, 'שבוע', 'שבועיים', 'שבועות') : nWord(c.n, 'יום', 'יומיים', 'ימים')) + ' (החל מ-' + c.anchor + ')'; }
        if (c.kind === 'monthly') return 'כל ' + nWord(c.n, 'חודש', 'חודשיים', 'חודשים') + ' ביום ' + c.dom + ' בחודש' + (c.n > 1 ? ' (החל מ-' + c.anchor.slice(0, 7) + ')' : '');
        return dayLbl(r.days);
    }
    function recOn(r, ds) {   // האם השגרה אמורה להתקיים בתאריך הזה (לפי התדירות בלבד)
        const c = r.rec;
        if (c.kind === 'weekdays') return r.days.includes(dowOf(ds));
        if (ds < c.anchor) return false;
        if (c.kind === 'interval') { const step = c.n * (c.unit === 'week' ? 7 : 1); return dayDiff(ds, c.anchor) % step === 0; }
        const m = monthsBetween(c.anchor, ds); return m >= 0 && m % c.n === 0 && Number(ds.slice(8)) === Math.min(c.dom, daysInMonth(ds.slice(0, 7)));
    }
    const recSig = (rec, days) => JSON.stringify([rec.kind, rec.n, rec.unit, rec.dom, rec.anchor, rec.kind === 'weekdays' ? days : []]);
    const routines = {
        all: routinesCol.all, get: routinesCol.get, dayLabel: dayLbl, recLabel, recOn, REC_KINDS,
        active: () => routinesCol.all().filter(r => !r.endedAt),
        nextDue(r, from) { from = from || localDate(); for (let i = 0; i < 800; i++) { const d = addDays(from, i); if (r.endedAt && d > r.endedAt) return ''; if (d >= r.since && recOn(r, d)) return d; } return ''; },
        save(item) {
            const c = base(item), ex = c.id ? routinesCol.get(c.id) : null, days = cleanDays(c.days), text = str(c.text, 200), td = localDate();
            const rec = c.rec ? cleanRec(c.rec, td) : cleanRec({ kind: 'weekdays' }, td);
            if (text.length < 2 || (rec.kind === 'weekdays' && !days.length)) return null;
            const mk = { text, pid: c.pid, days: rec.kind === 'weekdays' ? days : [], time: c.time, rec };
            if (!ex) return routinesCol.save(Object.assign(mk, { treatyId: c.treatyId, since: td, log: [{ at: td, text: 'נקבעה שגרה: ' + recLabel(mk) + (timeOr(c.time, '') ? ' בשעה ' + c.time : '') }] }));
            if (ex.endedAt) return null;
            if (recSig(ex.rec, ex.days) !== recSig(rec, mk.days) && ex.since < td) {   // היסטוריה לא משוכתבת: הגרסה הישנה מסתיימת אתמול, וגרסה חדשה מתחילה היום
                ex.endedAt = addDays(td, -1); ex.log = ex.log.concat([{ at: td, text: 'הוחלפה בגרסה חדשה: ' + recLabel(mk) }]); routinesCol.save(ex);
                return routinesCol.save(Object.assign(mk, { treatyId: ex.treatyId, since: td, log: [{ at: td, text: 'המשך השגרה "' + ex.text + '": ' + recLabel(mk) }] }));
            }
            const ch = []; if (ex.text !== text) ch.push('הנוסח'); if (ex.pid !== str(c.pid, 40)) ch.push('התיק'); if (recSig(ex.rec, ex.days) !== recSig(rec, mk.days)) ch.push('התדירות'); if (ex.time !== timeOr(c.time, '')) ch.push('השעה');
            return routinesCol.save(Object.assign({}, ex, mk, { log: ch.length ? ex.log.concat([{ at: td, text: 'עודכנו: ' + ch.join(', ') }]) : ex.log }));
        },
        stop(id, reason) { const r = routinesCol.get(id); reason = str(reason, 200); if (!r || r.endedAt || reason.length < 5) return false; r.endedAt = localDate(); r.log = r.log.concat([{ at: localDate(), text: 'הופסקה: ' + reason }]); return !!routinesCol.save(r); },
        dueOn: ds => routinesCol.all().filter(r => r.since <= ds && (!r.endedAt || ds <= r.endedAt) && recOn(r, ds)),
        doneIds: ds => { const v = rd('rdone_' + ds, []); return Array.isArray(v) ? v.map(x => str(x, 40)) : []; },
        forDay(ds) { const d = routines.doneIds(ds); return routines.dueOn(ds).map(r => ({ r, done: d.includes(r.id) })); },
        setDone(ds, id, on) { if (!DATE_RE.test(ds) || ds > localDate()) return false; const d = routines.doneIds(ds).filter(x => x !== id); if (on) d.push(id); if (!d.length) { del('rdone_' + ds); return true; } return wr('rdone_' + ds, d); }
    };
    const dayItems = ds => daily.get(ds).concat(routines.forDay(ds).map(x => ({ done: x.done })));   // לציון העקביות היומית

    // ---------- מבצעים ורפורמות: יחידה גבוהה מסוגיה, עם שלבים, שמאגדת סוגיות והבטחות. משקלה בציון 2 × חשיבות (ראו issuesScore) ----------
    const OP_STATUS = { active: { l: 'פעיל', c: '#38bdf8' }, done: { l: 'הושלם', c: '#34d399' }, dropped: { l: 'בוטל', c: '#a78bfa' } };
    const cleanStages = v => (Array.isArray(v) ? v : []).slice(0, 30).map(x => { const q = typeof x === 'string' ? { text: x } : base(x), done = q.done === true; return { id: str(q.id, 40) || uid(), text: str(q.text, 200), done, doneAt: done ? dateOr(q.doneAt, localDate()) : '', due: dateOr(q.due, '') }; }).filter(s2 => s2.text.length >= 2);
    const opsCol = collection('ops', p => { const o = base(p); return { id: str(o.id, 40) || uid(), title: str(o.title, 200), pid: str(o.pid, 40), importance: clampInt(o.importance, 1, 3, 2), why: str(o.why, 500), status: OP_STATUS[o.status] ? o.status : 'active',
        stages: cleanStages(o.stages), issueIds: idList(o.issueIds, 20), promiseIds: idList(o.promiseIds, 20), target: dateOr(o.target, ''), created: dateOr(o.created, localDate()), doneAt: dateOr(o.doneAt, ''), note: str(o.note, 800),
        dropReason: str(o.dropReason, 400), dropCat: DROP_CATS[o.dropCat] ? o.dropCat : '', droppedAt: dateOr(o.droppedAt, ''), restores: cleanRestores(o.restores), reviews: cleanReviews(o.reviews) }; });
    const ops = {
        all: opsCol.all, get: opsCol.get, STATUS: OP_STATUS, MIN_STAGES: 2, WEIGHT: OPS_WEIGHT,
        save(item) {
            const ex = item && item.id ? opsCol.get(item.id) : null; if (ex && ex.status !== 'active') return null;
            const o = Object.assign({}, ex || {}, item), created = (ex && ex.created) || localDate(); o.created = created;
            if (str(o.title, 200).length < 3) return null; if (cleanStages(o.stages).length < 2) return null;   // מבצע בלי שלבים הוא סוגיה
            if (o.target && !(DATE_RE.test(o.target) && o.target > created)) return null;
            o.status = 'active'; return opsCol.save(o);
        },
        remove: opsCol.remove,
        setStage(id, sid, on) { const x = opsCol.get(id); if (!x || x.status !== 'active') return false; const s2 = x.stages.find(q => q.id === sid); if (!s2) return false; s2.done = !!on; s2.doneAt = on ? localDate() : ''; return !!opsCol.save(x); },
        addStage(id, text, due) { const x = opsCol.get(id); if (!x || x.status !== 'active' || str(text, 200).length < 2 || x.stages.length >= 30) return false; x.stages = x.stages.concat([{ id: uid(), text, done: false, doneAt: '', due: due || '' }]); return !!opsCol.save(x); },
        link(id, kind, refId, on) {
            const x = opsCol.get(id); if (!x || x.status !== 'active' || !['issue', 'promise'].includes(kind)) return false; if (on && !(kind === 'issue' ? issuesCol.get(refId) : promises.get(refId))) return false;
            const f = kind === 'issue' ? 'issueIds' : 'promiseIds'; x[f] = on ? x[f].concat([refId]) : x[f].filter(v => v !== refId); return !!opsCol.save(x);
        },
        progress(id) {
            const x = opsCol.get(id); if (!x) return null; const d = x.stages.filter(s2 => s2.done).length, is = x.issueIds.map(i => issuesCol.get(i)).filter(Boolean), ps = x.promiseIds.map(i => promises.get(i)).filter(Boolean);
            return { n: x.stages.length, done: d, pct: x.stages.length ? Math.round(d / x.stages.length * 100) : 0, issues: is.length, issuesResolved: is.filter(i => i.status === 'resolved').length, promises: ps.length, promisesDone: ps.filter(p => p.status === 'done').length };
        },
        complete(id, note) {
            const x = opsCol.get(id); if (!x) return ERR0('המבצע לא נמצא.'); if (x.status !== 'active') return ERR0('המבצע כבר לא פעיל.');
            const left = x.stages.filter(s2 => !s2.done).length; if (left) return ERR0('נותרו ' + left + ' שלבים שלא בוצעו. השלם אותם או בטל את המבצע.');
            note = str(note, 400); if (note.length < 10) return ERR0('סגירת מבצע דורשת סיכום: מה הושג (לפחות 10 תווים).');
            x.status = 'done'; x.doneAt = localDate(); x.note = note; if (!opsCol.save(x)) return ERR0('השמירה נכשלה.');
            return { ok: true, openIssues: x.issueIds.map(i => issuesCol.get(i)).filter(i => i && ['open', 'handling'].includes(i.status)).length };
        },
        dropEffects(id) { const x = opsCol.get(id); return { issues: x ? x.issueIds.map(i => issuesCol.get(i)).filter(i => i && ['open', 'handling'].includes(i.status)) : [] }; },   // ביטול מבצע לא מבטל את הסוגיות וההבטחות שבו: יש להן חיים משלהן
        drop(id, reason, cat) {
            const x = opsCol.get(id); if (!x) return ERR0('המבצע לא נמצא.'); if (x.status === 'done') return ERR0('מבצע שהושלם לא מבטלים.'); if (x.status === 'dropped') return ERR0('המבצע כבר בוטל.');
            if (!DROP_CATS[cat]) return ERR0('בחר סיבת ביטול.'); reason = str(reason, 400); if (reason.length < DROP_MIN) return ERR0('ביטול דורש נימוק של לפחות ' + DROP_MIN + ' תווים. אם נפתח בטעות, מחק אותו.');
            x.status = 'dropped'; x.droppedAt = localDate(); x.dropReason = reason; x.dropCat = cat; return opsCol.save(x) ? { ok: true } : ERR0('השמירה נכשלה.');
        },
        restore(id, note) {
            const x = opsCol.get(id); if (!x || x.status !== 'dropped') return ERR0('אפשר לשחזר רק מבצע שבוטל.'); note = str(note, 600); if (note.length < 20) return ERR0('שחזור דורש נימוק (לפחות 20 תווים).');
            x.restores = x.restores.concat([{ at: localDate(), note: note + ' (בוטל ב-' + x.droppedAt + (DROP_CATS[x.dropCat] ? ', סיבה: ' + DROP_CATS[x.dropCat] : '') + ': ' + x.dropReason + ')' }]);
            x.status = 'active'; x.droppedAt = ''; x.dropReason = ''; x.dropCat = ''; return opsCol.save(x) ? { ok: true } : ERR0('השמירה נכשלה.');
        },
        review(id, o) { return addReview(opsCol.get(id), opsCol, o); }
    };

    // ---------- פגישות ואירועים ----------
    const eventsCol = collection('events', p => { const o = base(p); const st = timeOr(o.start, ''), en = timeOr(o.end, ''); return { id: str(o.id, 40) || uid(), title: str(o.title, 140), date: dateOr(o.date, localDate()),
        start: st, end: (st && en && toMin(en) > toMin(st)) ? en : '', place: str(o.place, 100), pid: str(o.pid, 40), personId: str(o.personId, 40), notes: str(o.notes, 400), done: o.done === true }; });
    const events = { all: eventsCol.all, get: eventsCol.get, remove: eventsCol.remove, save(item) { const o = base(item); if (str(o.title, 140).length < 2) return null; return eventsCol.save(item); },
        on: ds => eventsCol.all().filter(e => e.date === ds).sort((a, b) => (a.start || '99').localeCompare(b.start || '99')),
        upcoming: (from, to) => eventsCol.all().filter(e => e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99')) };

    // ---------- יומן ניצול זמן ----------
    const timeCol = collection('timelog', p => { const o = base(p), st = timeOr(o.start, '00:00'), en = timeOr(o.end, '00:00'); return { id: str(o.id, 40) || uid(), date: dateOr(o.date, localDate()), start: st, end: en, mins: Math.max(0, toMin(en) - toMin(st)),
        text: str(o.text, 140), pid: str(o.pid, 40), promiseId: str(o.promiseId, 40), taskId: str(o.taskId, 40), issueId: str(o.issueId, 40) }; });
    const timelog = {
        all: timeCol.all, get: timeCol.get, remove: timeCol.remove,
        on: ds => timeCol.all().filter(x => x.date === ds).sort((a, b) => a.start.localeCompare(b.start)),
        add(o) {   // אי אפשר לחפוף: אי אפשר להיות בשני מקומות בו-זמנית
            o = base(o); const st = o.start, en = o.end;
            if (!DATE_RE.test(o.date || '') || o.date > localDate()) return ERR0('תאריך לא חוקי (לא בעתיד).');
            if (!TIME_RE.test(st || '') || !TIME_RE.test(en || '') || toMin(en) <= toMin(st)) return ERR0('שעת סיום חייבת להיות אחרי שעת ההתחלה.');
            if (str(o.text, 140).length < 2) return ERR0('תאר מה עשית (לפחות 2 תווים).');
            if (o.issueId) { const di = issuesCol.get(o.issueId); if (!di || di.kind !== 'distraction') return ERR0('הסחה חייבת להיות מקושרת לסוגיה מסוג הסחה/פעולה פסולה.'); }
            const clash = timelog.on(o.date).find(x => toMin(st) < toMin(x.end) && toMin(en) > toMin(x.start)); if (clash) return ERR0('חפיפה עם "' + clash.text + '" (' + clash.start + '-' + clash.end + ').');
            const c = timeCol.save(o); return c ? { ok: true, item: c } : ERR0('השמירה נכשלה.');
        },
        distractions(from, to) {   // דקות לכל הסחה בטווח
            const m = {}; timeCol.all().filter(x => x.issueId && x.date >= from && x.date <= to).forEach(x => { const r = m[x.issueId] = m[x.issueId] || { mins: 0, n: 0, last: '' }; r.mins += x.mins; r.n++; if (x.date > r.last) r.last = x.date; }); return m;
        },
        lastDistraction: id => timeCol.all().filter(x => x.issueId === id).reduce((a, x) => x.date > a ? x.date : a, ''),
        byPortfolio(from, to) { const m = {}; timeCol.all().filter(x => x.date >= from && x.date <= to).forEach(x => { m[x.pid || ''] = (m[x.pid || ''] || 0) + x.mins; }); return m; }
    };

    // ---------- כהונת הממשלה: מועד הקמה/סיום, דרך בחירה, וממשלת מעבר ----------
    const dtOr = (v, d) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v || '') ? v : d;
    function termDefaults(mk, created) { return { startAt: (created || mk + '-01') + 'T00:00:00', endAt: mk + '-' + pad(daysInMonth(mk)) + 'T23:59:59' }; }
    const termState = (now) => {
        const nowS = (now || new Date()); const ns = localDate(nowS) + 'T' + pad(nowS.getHours()) + ':' + pad(nowS.getMinutes()) + ':' + pad(nowS.getSeconds()), mk = monthOf(localDate(nowS));
        const cur = term.get(mk);
        if (cur) return { state: ns < cur.startAt ? 'pending' : ns <= cur.endAt ? 'active' : 'caretaker', mk, term: cur };
        const prev = keysWith('term_').map(k => k.slice(5)).filter(m => MONTH_RE.test(m) && m < mk).sort().pop();
        return prev ? { state: 'caretaker', mk: prev, term: term.get(prev) } : { state: 'none', mk, term: null };
    };

    // ---------- שרים: כהונות, פעילות, אישיות (בדיונית) וקושי משרד ----------
    const TRAITS = [['drive', 'נחישות'], ['creative', 'יצירתיות'], ['integrity', 'יושרה'], ['resilience', 'חוסן'], ['team', 'שיתוף פעולה']];
    function traitsOf(seed) { let a = (Number(seed) || 1) >>> 0; const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; const o = {}; TRAITS.forEach(([k]) => { o[k] = 1 + Math.floor(r() * 99); }); return o; }
    const minCol = collection('ministers', p => { const o = base(p); return { id: str(o.id, 40) || uid(), pid: str(o.pid, 40), name: str(o.name, 40), style: str(o.style, 60), from: dateOr(o.from, localDate()), to: dateOr(o.to, ''), seed: clampInt(o.seed, 1, 2147483646, 1 + Math.floor(Math.random() * 2147483000)) }; });
    const inRange = (d, m) => d && d >= m.from && d <= (m.to || '9999-12-31');
    const ministers = {
        all: minCol.all, get: minCol.get, traitsOf, TRAITS,
        ensure() {   // מסנכרן כהונות מול התיקים: החלפת שר סוגרת כהונה ופותחת חדשה
            const ps = portfolios.all(), td = localDate();
            minCol.all().filter(m => !m.to).forEach(m => { const p = ps.find(x => x.id === m.pid); if (!p || p.minister !== m.name) { m.to = td; minCol.save(m); } });
            ps.forEach(p => { if (p.minister && !minCol.all().some(m => m.pid === p.id && !m.to)) minCol.save({ pid: p.id, name: p.minister, style: p.style, from: td }); });
        },
        stats(m) {
            const end = m.to || localDate(), T = liveTasks(), proms = promises.all(), mine = t => t.pid ? t.pid === m.pid : !!(t.promiseId && (proms.find(p => p.id === t.promiseId) || {}).pid === m.pid);
            const td = T.filter(t => t.done && mine(t) && inRange(t.doneAt, m)).length, pd = proms.filter(p => p.pid === m.pid && p.status === 'done' && inRange(p.doneAt, m)).length;
            const ids = ideas.all().filter(i => i.pid === m.pid && inRange(i.created, m)), ia = ids.filter(i => i.status === 'adopted').length;
            const ds = decisions.all().filter(d => d.pid === m.pid && (inRange(d.created, m) || inRange(d.decidedAt, m))), rv = ds.filter(d => d.reviewedAt);
            const is = issues.all().filter(i => i.pid === m.pid && i.status === 'resolved' && inRange(i.resolvedAt, m)).length;
            const actions = td + pd + ids.length + ds.length + is, points = td + pd * 3 + ids.length * 0.5 + ia + ds.length * 1.5 + is * 2, days = Math.max(1, dayDiff(end, m.from) + 1);
            return { tasksDone: td, promisesDone: pd, ideas: ids.length, adopted: ia, decisions: ds.length, issuesResolved: is, actions, points: Math.round(points * 10) / 10, days,
                perMonth: actions >= 5 ? Math.round(points / Math.max(days, 7) * 30 * 10) / 10 : null,
                avgProcess: rv.length >= 2 ? Math.round(rv.reduce((a, d) => a + d.processRating, 0) / rv.length * 10) / 10 : null };
        },
        ranking() { return minCol.all().map(m => ({ m, s: ministers.stats(m) })).filter(x => x.s.perMonth != null).sort((a, b) => b.s.perMonth - a.s.perMonth); }
    };
    function difficulty(pid) {   // היוריסטיקה שקופה של "עומס ואתגר" בתיק (לא מדד מדעי)
        const is = issues.all().filter(i => i.pid === pid), proms = promises.all().filter(p => p.pid === pid && p.status !== 'dropped'), td = localDate();
        const openI = is.filter(i => i.status !== 'resolved' && i.status !== 'dropped').reduce((a, i) => a + i.severity, 0), failed = proms.filter(p => p.status === 'failed').length, activeP = proms.filter(p => !['done', 'failed'].includes(p.status)).length;
        const overdue = liveTasks().filter(t => !t.done && t.due && t.due < td && (t.pid ? t.pid === pid : !!(t.promiseId && (promises.get(t.promiseId) || {}).pid === pid))).length;
        const items = is.length + proms.length, load = openI + failed * 2 + activeP + overdue * 1.5;
        return { items, load: Math.round(load * 10) / 10, score: items >= 5 ? Math.max(1, Math.min(10, Math.round(1 + load * 9 / (load + 8)))) : null, openI, failed, activeP, overdue, doneRate: proms.length >= 3 ? Math.round(proms.filter(p => p.status === 'done').length / proms.length * 100) : null };
    }
    const lastPm = x => { const r = (x.reviews || []).filter(v => v.by === 'pm').pop(); return r ? r.rating : null; };
    function dropStats() {   // כמה ביטולים, כמה הוערכו, ומה הציון הממוצע של ראש הממשלה. ביטול טוב אינו כישלון
        const all = issuesCol.all().filter(i => i.status === 'dropped').map(i => ({ kind: 'issue', x: i })).concat(promises.all().filter(p => p.status === 'dropped').map(p => ({ kind: 'promise', x: p }))).concat(opsCol.all().filter(o => o.status === 'dropped').map(o => ({ kind: 'op', x: o })));
        const rated = all.map(a => lastPm(a.x)).filter(v => v != null);
        return { n: all.length, rated: rated.length, avg: rated.length >= 2 ? Math.round(rated.reduce((a, v) => a + v, 0) / rated.length * 10) / 10 : null, good: rated.filter(v => v >= 4).length, bad: rated.filter(v => v <= 2).length };
    }
    function historyItems() {   // כל מה שהושלם/הוכרע: לא נעלם, עובר להיסטוריה
        const out = [], eom = m => m + '-' + pad(daysInMonth(m));
        tasksCol.all().filter(t => t.done && !t.cancelled).forEach(t => out.push({ kind: 'task', id: t.id, text: t.text, at: t.doneAt || t.created, pid: t.pid || ((promises.get(t.promiseId) || {}).pid) || '', ref: t.promiseId || t.issueId || t.treatyId || '' }));
        tasksCol.all().filter(t => t.cancelled).forEach(t => out.push({ kind: 'task', id: t.id, text: t.text, at: t.cancelledAt || t.created, status: 'cancelled', note: t.cancelReason, pid: t.pid || ((promises.get(t.promiseId) || {}).pid) || '', ref: t.promiseId || t.issueId || '' }));
        wishCol.all().filter(w => w.done).forEach(w => out.push({ kind: 'wish', id: w.id, text: w.text, at: w.doneAt || w.created, note: w.cat }));
        promises.all().filter(p => ['done', 'failed', 'dropped'].includes(p.status)).forEach(p => out.push({ kind: 'promise', id: p.id, text: p.text, at: p.doneAt || eom(p.month), pid: p.pid, status: p.status, note: p.dropReason, rating: p.status === 'dropped' ? lastPm(p) : null }));
        issuesCol.all().filter(i => i.status === 'resolved' || i.status === 'dropped').forEach(i => out.push({ kind: i.kind === 'distraction' ? 'distraction' : 'issue', id: i.id, text: i.title, status: i.status, rating: lastPm(i), at: (i.status === 'dropped' ? i.droppedAt : i.resolvedAt) || i.created, pid: i.pid, note: i.status === 'dropped' ? i.dropReason : i.note }));
        opsCol.all().filter(o => o.status !== 'active').forEach(o => out.push({ kind: 'op', id: o.id, text: o.title, status: o.status, rating: lastPm(o), at: (o.status === 'dropped' ? o.droppedAt : o.doneAt) || o.created, pid: o.pid, note: o.status === 'dropped' ? o.dropReason : o.note }));
        treatyCol.all().filter(t => t.status !== 'active').forEach(t => out.push({ kind: 'treaty', id: t.id, text: t.party + ': ' + t.title, at: t.closedAt || t.created, status: t.status, note: t.note }));
        return out.sort((a, b) => b.at.localeCompare(a.at));
    }
    const hashSeed = n => { let h = 2166136261; String(n).split('').forEach(c => { h = Math.imul(h ^ c.charCodeAt(0), 16777619); }); return (h >>> 0) % 2147483000 + 1; };
    function pmProfile(name) {   // פרופיל ראש ממשלה לפי שם: כהונות, ציונים, הבטחות, ואישיות דמיונית יציבה
        const hs = history().filter(x => x.pm === name), sc = hs.filter(x => x.closed && x.score != null).map(x => x.score);
        return { name, terms: hs.length, first: hs.length ? hs[hs.length - 1].mk : '', last: hs.length ? hs[0].mk : '', avg: sc.length ? Math.round(sc.reduce((a, v) => a + v, 0) / sc.length) : null, best: sc.length ? Math.max(...sc) : null, worst: sc.length ? Math.min(...sc) : null,
            done: hs.reduce((a, x) => a + x.done, 0), total: hs.reduce((a, x) => a + x.total, 0), traits: traitsOf(hashSeed(name)), history: hs };
    }
    function history() {   // כל הממשלות שהיו: ראש ממשלה, תאריכים, דרך בחירה, ציון, הישגים ושרים
        return keysWith('term_').map(k => k.slice(5)).filter(m => MONTH_RE.test(m)).sort().reverse().map(mk => {
            const t = term.get(mk), rv = review.get(mk), sn = rv.snapshot, ps = promises.all().filter(p => p.month === mk && p.status !== 'dropped'), sc = sn ? sn.total : (mk === monthOf(localDate()) ? score(mk).total : null);
            const a = mk + '-01', b = mk + '-' + pad(daysInMonth(mk));
            return { mk, term: t, pm: t.kind === 'self' ? (t.name || profile.get().name || 'אני') : (t.name || 'ללא שם'), closed: rv.closed, score: sc, done: ps.filter(p => p.status === 'done').length, total: ps.length, wins: ps.filter(p => p.status === 'done').map(p => p.text).slice(0, 5),
                ministers: minCol.all().filter(m => m.from <= b && (m.to || '9999-12-31') >= a) };
        });
    }

    // ---------- פרופיל יכולות: כרטיס אישי (דירוג לכל תחום + אישיות) וקורות חיים מתפתחים ----------
    // דירוג ברירת מחדל (auto) נגזר מהרשומות עצמן; אפשר לדרוס ידנית (manual) או לקבל הערכת AI (ai) לכל תחום בנפרד. הדירוג מבוסס על מה שהוזן ולכן סובייקטיבי: מדד הצהרתי, לא מבחן.
    const CAP_DOMAINS = {
        skills: { l: 'כישורים מקצועיים', ic: '🛠️', w: 3, c: '#38bdf8', hint: 'רמה: 1 מתחיל, 2 בסיסי, 3 מוכשר, 4 מומחה, 5 עילית' },
        experience: { l: 'ניסיון ותעסוקה', ic: '💼', w: 3, c: '#818cf8', hint: 'רמה: משקל התפקיד (1 קטן ... 5 בכיר/משמעותי מאוד)' },
        education: { l: 'השכלה ותארים', ic: '🎓', w: 2, c: '#a78bfa', hint: 'רמה: 1 תעודה, 2 לימודים/פרה-אקדמי, 3 תואר ראשון, 4 תואר שני, 5 דוקטורט ומעלה' },
        courses: { l: 'קורסים והכשרות', ic: '📚', w: 2, c: '#34d399', hint: 'רמה: עומק והיקף הקורס (1 הרצאה בודדת ... 5 הכשרה ממושכת ומקיפה)' },
        languages: { l: 'שפות', ic: '🗣️', w: 2, c: '#fbbf24', hint: 'רמה: 1 מבין מעט, 2 בסיסי, 3 שיחה שוטפת, 4 רהוט, 5 שפת אם/דובר מושלם' },
        certs: { l: 'רישיונות והסמכות', ic: '📜', w: 1, c: '#f472b6', hint: 'רמה: חשיבות ההסמכה. אפשר להגדיר תפוגה: הסמכה שפגה לא נספרת' },
        soft: { l: 'כישורים בין-אישיים', ic: '🤝', w: 2, c: '#fb923c', hint: 'הובלה, תקשורת, משא ומתן, הרצאות. רמה 1-5' },
        community: { l: 'קהילה והתנדבות', ic: '🌱', w: 1, c: '#4ade80', hint: 'רמה: היקף והשפעה (1 חד-פעמי ... 5 מחויבות ממושכת עם השפעה)' },
        achievements: { l: 'הישגים ופרסים', ic: '🏆', w: 1, c: '#facc15', hint: 'רמה: משקל ההישג (1 קטן ... 5 יוצא דופן)' },
        physical: { l: 'כושר ונתונים פיזיים', ic: '💪', w: 2, c: '#f87171', hint: 'מדידה עם ערך ויחידה (למשל "ריצת 5 ק״מ" 27 דקות). המדידה האחרונה בכל מדד נספרת; רמה 1-5 לפי הערכתך מול המטרה שלך' }
    };
    const CAP_TRAITS = { o: 'פתיחות וסקרנות', c: 'מצפוניות ומשמעת', e: 'מוחצנות', a: 'נעימות ושיתוף פעולה', s: 'יציבות רגשית' };
    const CAP_TIERS = [[85, 'עילית', '#facc15'], [70, 'מצטיין', '#34d399'], [55, 'מוצק', '#38bdf8'], [40, 'מתפתח', '#a78bfa'], [0, 'בתחילת הדרך', '#94a3b8']];
    const capTier = v => { const t = CAP_TIERS.find(x => v >= x[0]); return { l: t[1], c: t[2] }; };
    const numOrNull = v => (v === '' || v == null || !Number.isFinite(Number(v))) ? null : Number(v);
    const capsCol = collection('caps', p => { const o = base(p); return { id: str(o.id, 40) || uid(), domain: CAP_DOMAINS[o.domain] ? o.domain : 'skills', title: str(o.title, 160), org: str(o.org, 120), level: clampInt(o.level, 1, 5, 3),
        start: dateOr(o.start, ''), end: dateOr(o.end, ''), current: o.current === true, detail: str(o.detail, 600), hours: clampInt(o.hours, 0, 100000, 0), expires: dateOr(o.expires, ''), value: numOrNull(o.value), unit: str(o.unit, 20) }; });
    const cleanCapCfg = v => { const o = base(v), pick = (src, keys, f) => { const r = {}; Object.keys(base(src)).filter(k => keys.includes(k)).forEach(k => { const x = f(src[k]); if (x != null) r[k] = x; }); return r; };
        const rate = x => { const q = base(x), n = numOrNull(q.v); return n == null || n < 0 || n > 100 ? null : { v: Math.round(n), why: str(q.why, 400), at: dateOr(q.at, localDate()) }; }, dk = Object.keys(CAP_DOMAINS), tk = Object.keys(CAP_TRAITS);
        return { modes: pick(o.modes, dk, x => ['auto', 'manual', 'ai'].includes(x) ? x : null), manual: pick(o.manual, dk, x => { const n = numOrNull(x); return n == null || n < 0 || n > 100 ? null : Math.round(n); }), ai: pick(o.ai, dk, rate),
            traits: pick(o.traits, tk, x => { const n = numOrNull(x); return n == null || n < 0 || n > 100 ? null : Math.round(n); }), traitsAi: pick(o.traitsAi, tk, rate), summary: { text: str(base(o.summary).text, 900), at: dateOr(base(o.summary).at, '') } }; };
    const capCfg = () => cleanCapCfg(rd('capcfg', {})), capCfgSave = c => wr('capcfg', cleanCapCfg(c));
    const capItems = (d, asOf) => { let l = capsCol.all().filter(e => e.domain === d && (!e.start || e.start <= asOf));
        if (d === 'physical') { const m = {}; l.slice().sort((a, b) => (a.start || '').localeCompare(b.start || '')).forEach(e => { m[e.title.toLowerCase()] = e; }); l = Object.values(m); }
        return l; };
    const capEff = (e, asOf) => e.expires && e.expires < asOf ? 0 : e.end && !e.current && dayDiff(asOf, e.end) > 1826 ? e.level * 0.7 : e.level;   // הסמכה שפגה: 0; משהו שהסתיים לפני יותר מ-5 שנים: 70%
    function capAuto(d, asOf) {   // עומק (ממוצע 3 הרשומות החזקות) × רוחב (מגיע למלא בשלוש רשומות פעילות ומעלה)
        asOf = asOf || localDate(); const v = capItems(d, asOf).map(e => capEff(e, asOf)).filter(x => x > 0).sort((a, b) => b - a); if (!v.length) return null;
        const top = v.slice(0, 3), depth = top.reduce((a, b) => a + b, 0) / top.length / 5 * 100; return Math.round(depth * (0.6 + 0.4 * Math.min(1, v.length / 3)));
    }
    function capEffective(d) {
        const c = capCfg(), a = capAuto(d), m = c.modes[d] || 'auto';
        if (m === 'manual' && c.manual[d] != null) return { v: c.manual[d], src: 'manual', auto: a, mode: m };
        if (m === 'ai' && c.ai[d]) return { v: c.ai[d].v, src: 'ai', auto: a, mode: m, why: c.ai[d].why, at: c.ai[d].at };
        return { v: a, src: 'auto', auto: a, mode: m };
    }
    function capOverall(asOfAuto) {   // כמו OVR: ממוצע משוקלל של התחומים שיש בהם דירוג; דורש לפחות 3 תחומים
        const rows = Object.keys(CAP_DOMAINS).map(d => ({ d, v: asOfAuto ? capAuto(d, asOfAuto) : capEffective(d).v })).filter(x => x.v != null); if (rows.length < 3) return null;
        const tw = rows.reduce((a, x) => a + CAP_DOMAINS[x.d].w, 0); return Math.round(rows.reduce((a, x) => a + CAP_DOMAINS[x.d].w * x.v, 0) / tw);
    }
    function capSeries() {   // איך הדירוג הכולל גדל לאורך השנים (לפי נוסחת ברירת המחדל, על רשומות עם תאריך)
        const ys = capsCol.all().map(e => e.start && Number(e.start.slice(0, 4))).filter(Boolean), td = localDate(), y1 = Number(td.slice(0, 4)); if (!ys.length) return [];
        const out = []; for (let y = Math.min(...ys); y <= y1; y++) { const asOf = y === y1 ? td : y + '-12-31', v = capOverall(asOf); out.push({ label: String(y), v }); } return out;
    }
    function capTraits() {
        const c = capCfg(), parts = score(monthOf(localDate())).parts, pr = parts.find(x => x.id === 'promises'), dl = parts.find(x => x.id === 'daily'), av = [pr, dl].filter(x => x && x.v != null).map(x => x.v);
        const auto = { c: av.length ? Math.round(av.reduce((a, b) => a + b, 0) / av.length) : null };   // היחיד שאפשר לגזור מהתנהגות במערכת: ביצוע הבטחות ועקביות יומית
        return Object.keys(CAP_TRAITS).map(k => { const m = c.traits[k], a = c.traitsAi[k], x = auto[k]; return { k, l: CAP_TRAITS[k], v: m != null ? m : a ? a.v : x != null ? x : null, src: m != null ? 'manual' : a ? 'ai' : x != null ? 'auto' : null, manual: m, ai: a || null, auto: x == null ? null : x }; });
    }
    function capStats() {
        const E = capsCol.all(), td = localDate(), iv = E.filter(e => e.domain === 'experience' && e.start).map(e => [e.start, e.end && !e.current ? e.end : td]).sort((a, b) => a[0].localeCompare(b[0])); let days = 0, cs = null, ce = null;
        iv.forEach(([a, b]) => { if (cs === null) { cs = a; ce = b; } else if (a <= ce) { if (b > ce) ce = b; } else { days += dayDiff(ce, cs); cs = a; ce = b; } }); if (cs !== null) days += dayDiff(ce, cs);
        return { langs: E.filter(e => e.domain === 'languages').length, courseHours: E.filter(e => e.domain === 'courses').reduce((a, e) => a + e.hours, 0), expYears: Math.round(days / 365.25 * 10) / 10, certsActive: E.filter(e => e.domain === 'certs' && (!e.expires || e.expires >= td)).length, entries: E.length };
    }
    function capTimeline(withGov) {
        const l = capsCol.all().filter(e => e.domain !== 'physical').map(e => ({ id: e.id, domain: e.domain, title: e.title, org: e.org, start: e.start, end: e.end, current: e.current, level: e.level, detail: e.detail, hours: e.hours, expires: e.expires, gov: false }));
        if (withGov) ops.all().filter(o => o.status === 'done').forEach(o => l.push({ id: 'op_' + o.id, domain: 'achievements', title: 'מבצע שהושלם: ' + o.title, org: 'ממשל אישי', start: o.doneAt, end: '', current: false, level: o.importance + 2, detail: o.note, hours: 0, expires: '', gov: true }));
        return l.sort((a, b) => (b.start || '').localeCompare(a.start || ''));
    }
    function capAiData() {
        const L = ['פרופיל יכולות של המשתמש (רשומות לפי תחום):'], E = capsCol.all();
        Object.keys(CAP_DOMAINS).forEach(d => { const r = E.filter(e => e.domain === d); L.push(CAP_DOMAINS[d].l + ' (דירוג אוטומטי ' + (capAuto(d) == null ? 'אין' : capAuto(d)) + '): ' + (r.length ? r.slice(0, 25).map(e => e.title + (e.org ? ' (' + e.org + ')' : '') + ' רמה ' + e.level + (e.start ? ', ' + e.start.slice(0, 7) : '') + (e.end ? '-' + e.end.slice(0, 7) : e.current ? '-היום' : '') + (e.value != null ? ', ' + e.value + ' ' + e.unit : '') + (e.hours ? ', ' + e.hours + ' שעות' : '')).join('; ') : 'אין רשומות')); });
        const tr = capTraits(); L.push('אישיות (הערכה עצמית 0-100): ' + tr.map(t => t.l + ' ' + (t.manual != null ? t.manual : 'לא הוזן')).join(', ')); return L.join('\n');
    }
    function capApplyAi(j) {   // j: { domains: {key:{rating,why}}, traits: {key:{rating,why}}, summary }
        const c = capCfg(), td = localDate(), o = base(j); let n = 0;
        Object.entries(base(o.domains)).forEach(([k, x]) => { const r = numOrNull(base(x).rating); if (CAP_DOMAINS[k] && r != null && r >= 0 && r <= 100 && capItems(k, td).length) { c.ai[k] = { v: Math.round(r), why: str(base(x).why, 400), at: td }; n++; } });
        Object.entries(base(o.traits)).forEach(([k, x]) => { const r = numOrNull(base(x).rating); if (CAP_TRAITS[k] && r != null && r >= 0 && r <= 100) { c.traitsAi[k] = { v: Math.round(r), why: str(base(x).why, 400), at: td }; n++; } });
        if (str(o.summary, 900)) c.summary = { text: str(o.summary, 900), at: td };
        return n || c.summary.text ? (capCfgSave(c) ? { ok: true, n } : { ok: false }) : { ok: false };
    }
    const caps = {
        DOMAINS: CAP_DOMAINS, TRAITS: CAP_TRAITS, tier: capTier, all: capsCol.all, get: capsCol.get, remove: capsCol.remove, cfg: capCfg,
        save(item) { const c = base(item), d = CAP_DOMAINS[c.domain] ? c.domain : null; if (!d || str(c.title, 160).length < 2) return null; if (c.start && c.end && c.end < c.start) return null; if (d === 'physical' && numOrNull(c.value) == null) return null; return capsCol.save(c); },
        auto: capAuto, effective: capEffective, overall: () => capOverall(), series: capSeries, traits: capTraits, stats: capStats, timeline: capTimeline, aiData: capAiData, applyAi: capApplyAi,
        history: title => capsCol.all().filter(e => e.domain === 'physical' && e.title.toLowerCase() === String(title).toLowerCase()).sort((a, b) => (a.start || '').localeCompare(b.start || '')),
        setMode(d, m) { if (!CAP_DOMAINS[d] || !['auto', 'manual', 'ai'].includes(m)) return false; const c = capCfg(); c.modes[d] = m; return capCfgSave(c); },
        setManual(d, v) { const n = numOrNull(v); if (!CAP_DOMAINS[d] || n == null || n < 0 || n > 100) return false; const c = capCfg(); c.manual[d] = Math.round(n); c.modes[d] = 'manual'; return capCfgSave(c); },
        setTrait(k, v) { if (!CAP_TRAITS[k]) return false; const c = capCfg(), n = numOrNull(v); if (n == null) delete c.traits[k]; else if (n < 0 || n > 100) return false; else c.traits[k] = Math.round(n); return capCfgSave(c); }
    };

    // ---------- סימולטור קריירה ולימודים: מטרה = רשימת דרישות (תחום + שם + רמה נדרשת); הסימולטור משווה לפרופיל היכולות ומחשב מוכנות, פערים ומסלול ----------
    // הערכות הזמן הן היוריסטיקה גסה (שעות לרמה לפי תחום), לא תחזית. המשתמש קובע שעות פנויות בשבוע ורואה כמה זמן ייקח ואם היעד ריאלי.
    const CAREER_KINDS = { career: 'קריירה / תפקיד', study: 'לימודים / תואר', job: 'משרה ספציפית', skill: 'מיומנות / שפה' };
    const HRS_PER_LEVEL = { skills: 120, experience: 300, education: 400, courses: 40, languages: 180, certs: 60, soft: 80, community: 50, achievements: 100, physical: 60 };
    const cleanReq = v => (Array.isArray(v) ? v : []).slice(0, 25).map(x => { const o = base(x); return { id: str(o.id, 40) || uid(), domain: CAP_DOMAINS[o.domain] ? o.domain : 'skills', title: str(o.title, 120), need: clampInt(o.need, 1, 5, 3), weight: clampInt(o.weight, 1, 3, 2) }; }).filter(r => r.title.length >= 2);
    const careersCol = collection('careers', p => { const o = base(p); return { id: str(o.id, 40) || uid(), title: str(o.title, 160), kind: CAREER_KINDS[o.kind] ? o.kind : 'career', why: str(o.why, 400), target: dateOr(o.target, ''), reqs: cleanReq(o.reqs), opId: str(o.opId, 40), created: dateOr(o.created, localDate()), ai: str(o.ai, 900) }; });
    function careerMatch(r) {   // הרשומה הטובה ביותר בתחום שהשם שלה תואם (הכלה דו-כיוונית, בלי רגישות לאותיות)
        const t = r.title.toLowerCase().trim(), td = localDate();
        const hit = capsCol.all().filter(e => e.domain === r.domain && e.title.trim() && (e.title.toLowerCase().includes(t) || t.includes(e.title.toLowerCase().trim()))).map(e => ({ e, v: capEff(e, td) })).sort((a, b) => b.v - a.v)[0];
        return hit && hit.v > 0 ? { id: hit.e.id, title: hit.e.title, level: Math.round(hit.v * 10) / 10 } : null;
    }
    function careerSim(id, hpw, order) {
        const c = careersCol.get(id); if (!c) return null; hpw = Math.max(1, Math.min(60, Number(hpw) || 5)); order = order === 'easy' ? 'easy' : 'important';
        const rows = c.reqs.map(r => { const m = careerMatch(r), cur = m ? m.level : 0, gap = Math.max(0, r.need - cur), hours = Math.round(gap * HRS_PER_LEVEL[r.domain]); return { req: r, match: m, cur, gap, hours, met: gap === 0, ratio: Math.min(1, cur / r.need) }; });
        const tw = rows.reduce((a, x) => a + x.req.weight, 0), ready = tw ? Math.round(rows.reduce((a, x) => a + x.req.weight * x.ratio, 0) / tw * 100) : null;
        const steps = rows.filter(x => !x.met).sort((a, b) => order === 'easy' ? a.hours - b.hours : b.req.weight - a.req.weight || a.hours - b.hours);
        let acc = 0; steps.forEach(x => { acc += x.hours; x.cumHours = acc; x.eta = addDays(localDate(), Math.ceil(acc / hpw * 7)); });
        const total = acc, td = localDate(), etaAll = steps.length ? steps[steps.length - 1].eta : td, wk = c.target ? Math.max(0, dayDiff(c.target, td)) / 7 : null;
        return { career: c, rows, ready, steps, totalHours: total, hpw, eta: etaAll, weeks: Math.round(total / hpw * 10) / 10, feasible: c.target ? etaAll <= c.target : null, neededHpw: c.target && wk > 0 ? Math.ceil(total / wk * 10) / 10 : null, strongest: rows.filter(x => x.match).sort((a, b) => b.ratio * b.req.weight - a.ratio * a.req.weight).slice(0, 3) };
    }
    const careers = {
        KINDS: CAREER_KINDS, HRS: HRS_PER_LEVEL, all: careersCol.all, get: careersCol.get, remove: careersCol.remove, sim: careerSim, match: careerMatch,
        save(item) { const c = base(item); if (str(c.title, 160).length < 3) return null; const ex = c.id ? careersCol.get(c.id) : null; if (c.target && !(DATE_RE.test(c.target) && c.target > localDate())) return null; return careersCol.save(Object.assign({}, ex || {}, c)); },
        applyAiReqs(id, j) {   // j: { reqs:[{domain,title,need,weight}], note }
            const c = careersCol.get(id), o = base(j); if (!c) return { ok: false }; const add = cleanReq(o.reqs).filter(r => !c.reqs.some(q => q.domain === r.domain && q.title.toLowerCase() === r.title.toLowerCase())); if (!add.length) return { ok: false };
            c.reqs = c.reqs.concat(add).slice(0, 25); if (str(o.note, 900)) c.ai = str(o.note, 900); return careersCol.save(c) ? { ok: true, n: add.length } : { ok: false };
        },
        toOperation(id, hpw, order) {   // הופך את המסלול למבצע עם שלבים (שלב לכל פער) ויעד אחרי התאריך המשוער
            const s = careerSim(id, hpw, order); if (!s) return ERR0('המטרה לא נמצאה.'); const c = s.career;
            if (c.opId && ops.get(c.opId) && ops.get(c.opId).status === 'active') return ERR0('כבר קיים מבצע פעיל למטרה הזו.');
            if (s.steps.length < 2) return ERR0('נדרשים לפחות 2 פערים כדי לבנות מבצע (אחרת זו משימה או סוגיה).');
            const o = ops.save({ title: 'מסלול: ' + c.title, importance: 2, why: 'נבנה מסימולטור הקריירה. ' + s.totalHours + ' שעות משוערות בקצב ' + s.hpw + ' שעות בשבוע.', target: c.target && c.target > s.eta ? c.target : (s.eta > localDate() ? s.eta : ''),
                stages: s.steps.map(x => ({ text: (x.req.domain === 'languages' ? 'שפה: ' : '') + x.req.title + ': מרמה ' + x.cur + ' ל-' + x.req.need + ' (כ-' + x.hours + ' שעות)', due: x.eta })) });
            if (!o) return ERR0('יצירת המבצע נכשלה.'); c.opId = o.id; careersCol.save(c); return { ok: true, opId: o.id };
        }
    };

    // ---------- "במה התקדמתי": סיכום עובדתי של מה שקרה בטווח (לא ציון). מקור אחד גם לדף הסיכום וגם ל-AI ----------
    function progressRange(from, to) {
        const td = localDate(), end = to < td ? to : td, inR = d => !!d && d >= from && d <= to, tp = t => t.pid || ((promises.get(t.promiseId) || {}).pid) || '';
        const T = tasksCol.all(), tDone = T.filter(t => t.done && !t.cancelled && inR(t.doneAt)), tCanc = T.filter(t => t.cancelled && inR(t.cancelledAt));
        const pDone = promises.all().filter(p => p.status === 'done' && inR(p.doneAt)), pDrop = promises.all().filter(p => p.status === 'dropped' && inR(p.droppedAt));
        const iRes = issuesCol.all().filter(i => i.status === 'resolved' && inR(i.resolvedAt)), iDrop = issuesCol.all().filter(i => i.status === 'dropped' && inR(i.droppedAt));
        const stages = []; opsCol.all().forEach(o => o.stages.forEach(q => { if (q.done && inR(q.doneAt)) stages.push({ op: o, s: q }); }));
        const oDone = opsCol.all().filter(o => o.status === 'done' && inR(o.doneAt)), id = ideas.all().filter(i => inR(i.created)), wDone = wishCol.all().filter(w => w.done && inR(w.doneAt));
        const dc = decisions.all().filter(d => inR(d.decidedAt)), mins = timeCol.all().filter(x => inR(x.date)).reduce((a, x) => a + x.mins, 0);
        let dPlan = 0, dDone = 0, rPlan = 0, rDone = 0;
        for (let ds = from, k = 0; ds <= end && k < 370; ds = addDays(ds, 1), k++) { const l = daily.get(ds); dPlan += l.length; dDone += l.filter(x => x.done).length; const r = routines.forDay(ds); rPlan += r.length; rDone += r.filter(x => x.done).length; }
        const byP = {}, bump = (pid, k) => { const r = byP[pid || ''] = byP[pid || ''] || { tasks: 0, promises: 0, issues: 0, stages: 0 }; r[k]++; };
        tDone.forEach(t => bump(tp(t), 'tasks')); pDone.forEach(p => bump(p.pid, 'promises')); iRes.forEach(i => bump(i.pid, 'issues')); stages.forEach(x => bump(x.op.pid, 'stages'));
        const hl = [].concat(pDone.map(p => ({ kind: 'promise', text: p.text, at: p.doneAt })), oDone.map(o => ({ kind: 'op', text: o.title, at: o.doneAt })), stages.map(x => ({ kind: 'stage', text: x.op.title + ' › ' + x.s.text, at: x.s.doneAt })),
            iRes.map(i => ({ kind: 'issue', text: i.title, at: i.resolvedAt })), wDone.map(w => ({ kind: 'wish', text: w.text, at: w.doneAt }))).sort((a, b) => b.at.localeCompare(a.at));
        return { from, to, counts: { tasks: tDone.length, tasksCancelled: tCanc.length, promises: pDone.length, promisesDropped: pDrop.length, issues: iRes.length, issuesDropped: iDrop.length, stages: stages.length, ops: oDone.length, ideas: id.length, adopted: id.filter(i => i.status === 'adopted').length, decisions: dc.length, wish: wDone.length, mins, dailyPlanned: dPlan, dailyDone: dDone, routinesPlanned: rPlan, routinesDone: rDone },
            byPortfolio: byP, highlights: hl.slice(0, 15) };
    }
    function progressSummary(mk) {
        if (!MONTH_RE.test(mk || '')) mk = monthOf(localDate());
        const cur = progressRange(mk + '-01', mk + '-' + pad(daysInMonth(mk))), pm = addMonths(mk, -1), prev = progressRange(pm + '-01', pm + '-' + pad(daysInMonth(pm))), delta = {};
        Object.keys(cur.counts).forEach(k => { delta[k] = cur.counts[k] - prev.counts[k]; });
        const act = promises.all().filter(p => p.month === mk && p.status !== 'dropped');
        return { mk, partial: mk === monthOf(localDate()), cur, prev, delta, active: { promises: act.length, avgProgress: act.length ? Math.round(act.reduce((a, p) => a + p.progress, 0) / act.length) : null, ops: opsCol.all().filter(o => o.status === 'active').length, openIssues: issuesCol.all().filter(i => ['open', 'handling'].includes(i.status) && i.kind === 'issue').length } };
    }

    // ---------- גיבוי ושחזור (הנעילה לעולם לא נכללת) ----------
    function exportAll() {
        const out = {};
        try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX) && !SECRET_KEYS.includes(k)) out[k] = localStorage.getItem(k); } } catch (e) {}
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
                Object.entries(data).forEach(([k, v]) => { if (k.startsWith(PREFIX) && !SECRET_KEYS.includes(k) && typeof v === 'string') { JSON.parse(v); localStorage.setItem(k, v); n++; } });
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

    try { ministers.ensure(); } catch (e) {}


    /* מד אחוזים גרפי (טבעת SVG מונפשת). pct 0-100; opts: size (px), color, label (טקסט קטן מתחת למספר), w (עובי) */
    function gauge(pct, o) {
        o = o || {}; const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0))), size = o.size || 64, w = o.w || Math.max(5, Math.round(size / 8)), r = (size - w) / 2, C = 2 * Math.PI * r, off = C * (1 - p / 100);
        const col = o.color || (p >= 80 ? '#34d399' : p >= 50 ? '#fbbf24' : p >= 25 ? '#fb923c' : '#f87171'), id = 'gg' + Math.random().toString(36).slice(2, 8), fs = Math.round(size * (o.label ? 0.26 : 0.3));
        if (typeof document !== 'undefined' && !document.getElementById('gov-gauge-css')) { const st = document.createElement('style'); st.id = 'gov-gauge-css'; st.textContent = '@keyframes govg{from{stroke-dashoffset:var(--c)}}.govg-arc{animation:govg .9s cubic-bezier(.2,.8,.2,1)}@media (prefers-reduced-motion:reduce){.govg-arc{animation:none}}'; document.head.appendChild(st); }
        return `<svg role="img" aria-label="${p}%" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none;display:inline-block"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".65"/><stop offset="1" stop-color="${col}"/></linearGradient></defs>`
            + `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#334155" stroke-width="${w}" opacity=".6"/>`
            + (p > 0 ? `<circle class="govg-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c:${C.toFixed(2)}"/>` : '')
            + `<text x="50%" y="${o.label ? '47%' : '50%'}" text-anchor="middle" dominant-baseline="central" fill="#f8fafc" font-weight="800" font-size="${fs}" font-family="Rubik,sans-serif">${p}<tspan font-size="${Math.round(fs * 0.6)}">%</tspan></text>`
            + (o.label ? `<text x="50%" y="70%" text-anchor="middle" dominant-baseline="central" fill="#94a3b8" font-size="${Math.round(size * 0.13)}" font-family="Rubik,sans-serif">${esc(o.label)}</text>` : '') + `</svg>`;
    }
    window.GOV = { VERSION: '0.10.0', esc, uid, pad, localDate, monthOf, addDays, addMonths, monthLabel, daysInMonth, HEB_MONTHS, DATE_RE, MONTH_RE, STATUS, PRIORITY, gradeFor, portfolios: Object.assign({}, portfolios, { save(p) { const r = portfolios.save(p); ministers.ensure(); return r; }, remove(id) { const r = portfolios.remove(id); ministers.ensure(); return r; } }), promises, ideas, daily, term, review, profile, score, lock, exportAll, importAll, rd, wr, TREATY_STATUS, PARTY_KIND, LEVEL, DECISION_STATUS, treaties, decisions, impactItem, optionImpact, nl, gauge, critStatus, wish, DROP_SCALE, dropStats, HORIZON, historyItems, pmProfile, tasks, routines, dayItems, issues: issues, ISSUE_STATUS, events, timelog, ministers, difficulty, history, METHODS, DOW, dowOf, cleanDays, people, relEvents, REL, closeness, contactStatus, relationAlerts, treatyTimeline, SECRET_KEYS, ops, caps, careers, DROP_CATS, DROP_MIN, progressRange, progressSummary };
})();
