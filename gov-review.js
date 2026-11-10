/* ממשל אישי - הערכת ביטול (סוגיות והבטחות שבוטלו).
   ביטול בנימוק הוא החלטה לגיטימית, לא בהכרח כישלון. אחרי הביטול אפשר להעריך בדיעבד האם ההחלטה הייתה נכונה ומועילה:
   הערכת ראש הממשלה (המשתמש, בסולם 1-5 + נימוק) והערכת AI (אנונימית, באישור מפורש). אפשר להוסיף הערכות עם הזמן: כולן נשמרות כציר זמן. */
(function () {
    'use strict';
    const G = window.GOV, h = G.esc, col = k => k === 'issue' ? G.issues : k === 'op' ? G.ops : G.promises;
    const item = (k, id) => col(k).get(id), $ = id => document.getElementById(id), KIND = { issue: 'הסוגיה', promise: 'ההבטחה', op: 'המבצע' };
    const rerender = () => { try { if (typeof window.render === 'function') window.render(); } catch (e) {} };
    const meter = (r, c) => `<span class="inline-flex gap-0.5 align-middle" aria-label="${r} מתוך 5">${[1, 2, 3, 4, 5].map(n => `<i style="display:inline-block;width:14px;height:8px;border-radius:3px;background:${n <= r ? c : '#334155'}"></i>`).join('')}</span>`;
    const last = (x, by) => (x.reviews || []).filter(v => v.by === by).pop() || null;

    // טופס ביטול מוקשח: סיבה מובנית + נימוק של 40 תווים לפחות + תצוגה מקדימה של מה יבוטל איתו
    function dropForm(kind, id) {
        const c = col(kind), fx = c.dropEffects ? c.dropEffects(id) : {}, k = id, hs = KIND[kind];
        const eff = kind === 'issue' ? (fx.promises.length || fx.tasks.length ? `<div class="text-[11px] rounded-lg border border-amber-500/40 bg-amber-500/5 p-2">⚠️ ביטול הסוגיה יבטל אוטומטית גם <b>${fx.promises.length}</b> הבטחות פתוחות ו-<b>${fx.tasks.length}</b> משימות (הן נשמרות בהיסטוריה ואפשר לשחזר הכול). ${fx.promises.slice(0, 4).map(p => '<div class="text-slate-300">📜 ' + h(p.text.slice(0, 70)) + '</div>').join('')}</div>` : '<div class="text-[11px] text-slate-400">לא יבוטלו הבטחות או משימות נוספות.</div>')
            : kind === 'promise' ? (fx.tasks.length ? `<div class="text-[11px] rounded-lg border border-amber-500/40 bg-amber-500/5 p-2">⚠️ יבוטלו גם <b>${fx.tasks.length}</b> משימות שלא שייכות לשום דבר פעיל אחר (נשמרות כמבוטלות, ואפשר לשחזר).</div>` : '<div class="text-[11px] text-slate-400">לא יבוטלו משימות.</div>')
            : (fx.issues.length ? `<div class="text-[11px] rounded-lg border border-slate-600 bg-slate-900/50 p-2">ℹ️ ל${hs === 'המבצע' ? 'מבצע' : ''} מקושרות ${fx.issues.length} סוגיות פעילות. הן <b>לא</b> יבוטלו: להן חיים משלהן.</div>` : '');
        return `<div class="rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 space-y-2"><h3 class="font-bold text-violet-300 text-sm">🚫 ביטול ${hs} בנימוק</h3>
            <label class="g-lab">סיבת הביטול<select id="dpC_${h(k)}" class="g-inp"><option value="">בחר…</option>${Object.entries(G.DROP_CATS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
            <label class="g-lab">נימוק מפורט (לפחות ${G.DROP_MIN} תווים): מה קרה ולמה מוותרים?<textarea id="dpN_${h(k)}" rows="3" maxlength="400" class="g-inp" oninput="this.nextElementSibling.textContent=this.value.trim().length+'/${G.DROP_MIN}'"></textarea><span class="text-[10px] text-slate-500">0/${G.DROP_MIN}</span></label>
            ${eff}<button class="g-btn" onclick="GOV_REV.drop('${kind}','${h(k)}')">בטל ${kind === 'op' ? 'מבצע' : kind === 'issue' ? 'סוגיה' : 'הבטחה'}</button>
            <p class="text-[10px] text-slate-500">ביטול אינו מחיקה: הפריט נשמר בהיסטוריה, ואפשר להעריך אותו (ראש הממשלה ו-AI) ואף לשחזר אותו. מחיקה מיועדת רק לפריט שנפתח בטעות.</p></div>`;
    }
    function drop(kind, id) {
        const cat = $('dpC_' + id).value, reason = $('dpN_' + id).value.trim(); if (!cat) { alert('בחר סיבת ביטול.'); return; } if (reason.length < G.DROP_MIN) { alert('הנימוק קצר מדי: ' + reason.length + ' מתוך ' + G.DROP_MIN + ' תווים.'); return; }
        const c = col(kind), fx = c.dropEffects ? c.dropEffects(id) : {}, n = (fx.promises || []).length, t = (fx.tasks || []).length;
        if (!confirm('לבטל ' + KIND[kind] + (n || t ? ' ולבטל איתו אוטומטית ' + (n ? n + ' הבטחות' : '') + (n && t ? ' ו-' : '') + (t ? t + ' משימות' : '') : '') + '?\nאפשר לשחזר אחר כך.')) return;
        const r = c.drop(id, reason, cat); if (!r.ok) { alert(r.error); return; } rerender();
    }
    function restoreForm(kind, id, x) {
        if (kind === 'promise' && x.dropIssueId) return `<a href="issues.html#i=${h(x.dropIssueId)}" class="block text-xs text-violet-300 underline">↩️ ההבטחה בוטלה יחד עם סוגיה. כדי לשחזר, שחזר את הסוגיה בדף הסוגיה ←</a>`;
        return `<div class="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2"><h3 class="font-bold text-emerald-300 text-sm">↩️ שחזור: ביטול הביטול</h3>
            <label class="g-lab">מה השתנה ולמה ${KIND[kind]} חוזר? (לפחות 20 תווים)<textarea id="rsN_${h(id)}" rows="2" maxlength="600" class="g-inp"></textarea></label>
            <button class="g-btn ok" onclick="GOV_REV.restore('${kind}','${h(id)}')">שחזר</button><p class="text-[10px] text-slate-500">הנימוק המקורי וההערכות נשמרים ביומן. ${kind === 'issue' ? 'גם ההבטחות והמשימות שבוטלו איתה יחזרו.' : kind === 'promise' ? 'המשימות שבוטלו איתה יחזרו.' : ''}</p></div>`;
    }
    function restore(kind, id) { const r = col(kind).restore(id, $('rsN_' + id).value); if (!r.ok) { alert(r.error); return; } if (r.promises || r.tasks) alert('שוחזר. חזרו גם ' + (r.promises || 0) + ' הבטחות ו-' + (r.tasks || 0) + ' משימות.'); rerender(); }

    const restoresLog = x => (x.restores || []).length ? `<div class="rounded-xl border border-slate-600 bg-slate-900/50 p-2 text-[11px] space-y-1"><div class="font-bold text-slate-300">↩️ היסטוריית שחזורים</div>${x.restores.slice().reverse().map(q => '<div><span class="text-slate-500">' + h(q.at) + '</span> ' + G.nl(q.note) + '</div>').join('')}</div>` : '';

    function html(kind, id) {
        const x = item(kind, id); if (!x || x.status !== 'dropped') return '';
        const S = G.DROP_SCALE, pm = last(x, 'pm'), ai = last(x, 'ai'), id2 = h(id);
        const card = (t, v) => `<div class="flex-1 min-w-[10rem] bg-slate-900/70 border border-slate-700 rounded-xl p-2 text-center"><div class="text-[10px] text-slate-400">${t}</div>${v ? `<div class="mt-1">${meter(v.rating, S[v.rating].c)}</div><div class="text-xs font-bold" style="color:${S[v.rating].c}">${v.rating}/5 ${S[v.rating].l}</div>` : '<div class="text-xs text-slate-500 mt-2">עוד לא הוערך</div>'}</div>`;
        const log = (x.reviews || []).slice().reverse().map(v => `<div class="text-[11px] border-r-2 pr-2 mb-1.5" style="border-color:${S[v.rating].c}"><div class="flex justify-between text-slate-400"><span>${v.by === 'ai' ? '🤖 AI' + (v.model ? ' (' + h(v.model) + ')' : '') : '👑 ראש הממשלה'}</span><span>${h(v.at)}</span></div><div>${meter(v.rating, S[v.rating].c)} <b style="color:${S[v.rating].c}">${S[v.rating].l}</b></div><div class="text-slate-300">${G.nl(v.note)}</div></div>`).join('');
        const rl = (x.restores || []).length ? `<div class="rounded-xl border border-slate-600 bg-slate-900/50 p-2 text-[11px] space-y-1"><div class="font-bold text-slate-300">↩️ היסטוריית שחזורים</div>${x.restores.slice().reverse().map(q => '<div><span class="text-slate-500">' + h(q.at) + '</span> ' + G.nl(q.note) + '</div>').join('')}</div>` : '';
        return rl + `<div class="rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 space-y-3"><h3 class="font-bold text-violet-300 text-sm">⚖️ הערכת הביטול: האם זו הייתה החלטה נכונה?</h3>
            <p class="text-[10px] text-slate-500">ביטול אינו בהכרח שלילי: לפעמים ויתור הוא החלטה חכמה. ההערכה היא בדיעבד, לאור מה שקרה מאז. אפשר להעריך שוב בהמשך (כל ההערכות נשמרות). ההערכה לא משנה את ציון הממשלה.</p>
            <div class="flex flex-wrap gap-2">${card('👑 ראש הממשלה', pm)}${card('🤖 AI', ai)}</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2"><label class="g-lab">דירוג ההחלטה<select id="rvR_${id2}" class="g-inp">${[5, 4, 3, 2, 1].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${n} - ${S[n].l}</option>`).join('')}</select></label>
                <label class="g-lab md:col-span-2">נימוק (לפחות 10 תווים): מה קרה מאז, ולמה ההחלטה נכונה או שגויה?<textarea id="rvN_${id2}" rows="2" maxlength="1500" class="g-inp"></textarea></label></div>
            <div class="flex flex-wrap gap-2"><button class="g-btn pri" onclick="GOV_REV.pm('${kind}','${id2}')">👑 שמור הערכת ראש הממשלה</button><button class="g-btn" onclick="GOV_REV.ai('${kind}','${id2}')">🤖 בקש הערכת AI (אנונימית, באישור)</button></div><div id="rvMsg_${id2}" class="text-[11px] text-slate-400"></div>
            ${log ? `<div>${log}</div>` : ''}</div>` + restoreForm(kind, id, x);
    }
    function pm(kind, id) {
        const r = col(kind).review(id, { by: 'pm', rating: document.getElementById('rvR_' + id).value, note: document.getElementById('rvN_' + id).value });
        if (!r.ok) { alert(r.error); return; } rerender();
    }
    function parse(t) { try { return JSON.parse(String(t).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { const m = String(t).match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } }
    // תמונה כוללת של המערכת עבור הערכת ה-AI: מצב החודש והציון, הבטחות לפי תיק, סוגיות פעילות, ניצול זמן, ביטולים קודמים והערכותיהם, אמנות. קצר ומדויק (הטקסט המלא מוצג לך באישור לפני שליחה).
    function systemContext(excl) {
        const td = G.localDate(), mk = G.monthOf(td), L = ['--- תמונה כללית של המערכת ---'], T = (f, d) => { try { return f(); } catch (e) { return d; } };
        T(() => { const sc = G.score(mk), N = { promises: 'הבטחות', daily: 'עקביות יומית', self: 'הערכה עצמית', issues: 'סוגיות ומבצעים' }; L.push(`ציון החודש (${mk}) עד כה: ${sc.total == null ? 'אין עדיין' : sc.total} | רכיבים: ` + sc.parts.map(p => N[p.id] + ' ' + (p.v == null ? '—' : p.v) + ' (משקל ' + p.w + '%)').join(', ')); });
        T(() => { const h = G.history().filter(x => x.closed && x.score != null).slice(-4).map(x => x.mk + ': ' + x.score); if (h.length) L.push('ציונים בחודשים שנסגרו: ' + h.join(', ')); });
        T(() => { const ps = G.promises.all().filter(p => p.month === mk), by = {}; ps.forEach(p => { const n = (G.portfolios.get(p.pid) || { name: 'ללא תיק' }).name, r = by[n] = by[n] || { a: 0, d: 0, x: 0 }; if (p.status === 'dropped') r.x++; else { r.a++; if (p.status === 'done') r.d++; } });
            L.push('הבטחות החודש לפי תיק (פעילות/בוצעו/בוטלו): ' + Object.entries(by).map(([n, r]) => n + ' ' + r.a + '/' + r.d + '/' + r.x).join('; ')); });
        T(() => { const is = G.issues.all().filter(i => ['open', 'handling'].includes(i.status) && i.id !== excl).sort((a, b) => b.severity - a.severity).slice(0, 8); if (is.length) L.push('סוגיות פעילות: ' + is.map(i => i.title.slice(0, 50) + ' (חומרה ' + i.severity + ', ' + G.HORIZON[i.horizon] + ', משימות ' + G.issues.progress(i.id).done + '/' + G.issues.progress(i.id).n + ')').join('; ')); });
        T(() => { const os = G.ops.all().filter(o => o.status === 'active' && o.id !== excl); if (os.length) L.push('מבצעים ורפורמות פעילים: ' + os.map(o => { const q = G.ops.progress(o.id); return o.title.slice(0, 50) + ' (חשיבות ' + o.importance + ', שלבים ' + q.done + '/' + q.n + ')'; }).join('; ')); });
        T(() => { const from = G.addDays(td, -13), by = G.timelog.byPortfolio(from, td), tot = Object.values(by).reduce((a, v) => a + v, 0), ds = Object.values(G.timelog.distractions(from, td)).reduce((a, v) => a + v.mins, 0);
            if (tot) L.push('ניצול זמן ב-14 ימים אחרונים (' + Math.round(tot / 60) + ' שעות מתועדות): ' + Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ((G.portfolios.get(k) || {}).name || 'ללא תיק') + ' ' + Math.round(v / 60) + 'ש\'').join(', ') + (ds ? ' | הסחות דעת: ' + Math.round(ds / 60 * 10) / 10 + ' שעות' : '')); });
        T(() => { const dr = [].concat(G.issues.all().filter(i => i.status === 'dropped' && i.id !== excl).map(i => ({ k: 'סוגיה', t: i.title, r: i.dropReason, a: i.reviews })), G.promises.all().filter(p => p.status === 'dropped' && !p.dropIssueId && p.id !== excl).map(p => ({ k: 'הבטחה', t: p.text, r: p.dropReason, a: p.reviews })), G.ops.all().filter(o => o.status === 'dropped' && o.id !== excl).map(o => ({ k: 'מבצע', t: o.title, r: o.dropReason, a: o.reviews }))).slice(-6);
            if (dr.length) L.push('ביטולים קודמים והערכתם: ' + dr.map(x => { const r = (x.a || []).filter(v => v.by === 'pm').pop(); return x.k + ' "' + x.t.slice(0, 40) + '" (נימוק: ' + (x.r || '').slice(0, 70) + '; הערכת ר"מ: ' + (r ? r.rating + '/5' : 'טרם') + ')'; }).join(' | ')); });
        T(() => { const tr = G.treaties.all(), c = k => tr.filter(t => t.status === k).length; if (tr.length) L.push('אמנות: ' + c('active') + ' בתוקף, ' + c('fulfilled') + ' קוימו, ' + c('breached') + ' הופרו'); });
        return L.join('\n');
    }
    async function ai(kind, id) {
        const x = item(kind, id), msg = document.getElementById('rvMsg_' + id); if (!x) return;
        const pf = G.portfolios.get(x.pid), tasks = kind === 'issue' ? G.issues.allTasks(id) : kind === 'op' ? [] : G.tasks.forPromise(id), td = tasks.filter(t => t.done).length;
        const lines = kind === 'op' ? ['סוג: מבצע / רפורמה (יחידה גדולה עם שלבים)', `המבצע: ${x.title}`, `למה: ${x.why || '(לא נכתב)'}`, `חשיבות (1-3): ${x.importance}`, `שלבים: ${G.ops.progress(id).done} מתוך ${x.stages.length} בוצעו`, `נפתח: ${x.created}${x.target ? ', יעד ' + x.target : ''}`]
            : kind === 'issue'
            ? [`סוג: סוגיה${x.kind === 'distraction' ? ' (הסחת דעת / פעולה פסולה)' : ''}`, `הסוגיה: ${x.title}`, `פירוט: ${x.detail || '(לא נכתב)'}`, `חומרה (1-3): ${x.severity}`, `טווח: ${G.HORIZON[x.horizon]}${x.target ? ' עד ' + x.target : ''}`, `נפתחה: ${x.created}`]
            : ['סוג: הבטחה', `ההבטחה: ${x.text}`, `למה חשובה: ${x.why || '(לא נכתב)'}`, `קריטריון: ${x.measure || '(לא נכתב)'}`, `עדיפות (1-3): ${x.priority}`, `חודש: ${x.month}`, `התקדמות בעת ההסרה: ${x.progress}%`];
        const cx = kind === 'issue' ? G.promises.all().filter(p => p.dropIssueId === id) : [], ct = G.tasks.cancelled().filter(t => t.cancelledAt === x.droppedAt && (t.issueId === id || t.promiseIds.some(q => cx.some(p => p.id === q) || q === id)));
        if (cx.length || ct.length) lines.push(`בוטלו יחד איתה אוטומטית: ${cx.length} הבטחות (${cx.map(p => p.text.slice(0, 40)).join('; ')}) ו-${ct.length} משימות`);
        lines.push(`תיק: ${pf ? pf.name + ' (משימה: ' + (pf.mission || 'לא הוגדרה') + ')' : 'ללא'}`, `בוטלה ב: ${x.droppedAt || 'לא ידוע'}`, `נימוק הביטול: ${x.dropReason}`, `משימות קשורות: ${td} בוצעו מתוך ${tasks.length}`);
        (x.reviews || []).filter(v => v.by === 'pm').forEach(v => lines.push(`הערכת ראש הממשלה (${v.at}, ${v.rating}/5): ${v.note}`));
        const names = G.people.all().map(p => p.name).concat(G.treaties.all().map(t => t.party), [G.profile.get().name || '']).filter(Boolean);
        msg.textContent = 'ממתין לאישור…';
        const r = await window.GOVAI.ask({ title: 'הערכת ביטול', names, json: true, data: lines.join('\n') + '\n\n' + systemContext(id),
            task: 'אתה יועץ ביקורתי ולא חנפן. הפריט למעלה בוטל על ידי המשתמש. הערך האם ההחלטה לבטל הייתה נכונה ומועילה לאור כל הנתונים, ובעיקר לאור התמונה הכללית של המערכת (ציונים ומגמות, עומס, תיקים, ניצול זמן והסחות, סוגיות והבטחות אחרות, ביטולים קודמים והערכתם). אם רואים בתמונה דפוס (למשל ביטולים חוזרים בתיק מסוים, עומס יתר, הימנעות או לעומת זאת התמקדות נכונה), ציין אותו במפורש בנימוק. זכור: ביטול אינו בהכרח שלילי, ולפעמים ויתור הוא החלטה חכמה; אבל נימוק חלש או הימנעות מקושי הם סימן אזהרה. אל תחנף ואל תמציא עובדות שאין בנתונים; אם חסר מידע, אמור זאת. החזר JSON בלבד במבנה {"rating":מספר 1-5 (1 שגויה ומזיקה, 3 ניטרלית או לא ברור, 5 נכונה ומועילה מאוד),"verdict":"משפט אחד","reasoning":"2-4 משפטים: למה","counter":"הטיעון החזק ביותר נגד הביטול","missing":"איזה מידע היה משנה את ההערכה"}.' });
        if (!r.ok) { msg.textContent = r.cancelled ? 'בוטל.' : '⚠️ ' + r.error; return; }
        const j = parse(r.text); if (!j || !(Number(j.rating) >= 1 && Number(j.rating) <= 5)) { msg.textContent = '⚠️ ה-AI לא החזיר הערכה תקינה. נסה שוב.'; return; }
        const note = [j.verdict, j.reasoning, j.counter ? 'הטיעון החזק נגד הביטול: ' + j.counter : '', j.missing ? 'מה חסר: ' + j.missing : ''].filter(Boolean).join('\n');
        const s = col(kind).review(id, { by: 'ai', rating: j.rating, note, model: r.model }); if (!s.ok) { msg.textContent = '⚠️ ' + s.error; return; } rerender();
    }
    window.GOV_REV = { html, pm, ai, meter, dropForm, drop, restore, restoresLog };
})();
