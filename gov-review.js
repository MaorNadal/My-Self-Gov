/* ממשל אישי - הערכת ביטול (סוגיות והבטחות שבוטלו).
   ביטול בנימוק הוא החלטה לגיטימית, לא בהכרח כישלון. אחרי הביטול אפשר להעריך בדיעבד האם ההחלטה הייתה נכונה ומועילה:
   הערכת ראש הממשלה (המשתמש, בסולם 1-5 + נימוק) והערכת AI (אנונימית, באישור מפורש). אפשר להוסיף הערכות עם הזמן: כולן נשמרות כציר זמן. */
(function () {
    'use strict';
    const G = window.GOV, h = G.esc, col = k => k === 'issue' ? G.issues : G.promises;
    const item = (k, id) => k === 'issue' ? G.issues.get(id) : G.promises.get(id);
    const rerender = () => { try { if (typeof window.render === 'function') window.render(); } catch (e) {} };
    const meter = (r, c) => `<span class="inline-flex gap-0.5 align-middle" aria-label="${r} מתוך 5">${[1, 2, 3, 4, 5].map(n => `<i style="display:inline-block;width:14px;height:8px;border-radius:3px;background:${n <= r ? c : '#334155'}"></i>`).join('')}</span>`;
    const last = (x, by) => (x.reviews || []).filter(v => v.by === by).pop() || null;

    function html(kind, id) {
        const x = item(kind, id); if (!x || x.status !== 'dropped') return '';
        const S = G.DROP_SCALE, pm = last(x, 'pm'), ai = last(x, 'ai'), id2 = h(id);
        const card = (t, v) => `<div class="flex-1 min-w-[10rem] bg-slate-900/70 border border-slate-700 rounded-xl p-2 text-center"><div class="text-[10px] text-slate-400">${t}</div>${v ? `<div class="mt-1">${meter(v.rating, S[v.rating].c)}</div><div class="text-xs font-bold" style="color:${S[v.rating].c}">${v.rating}/5 ${S[v.rating].l}</div>` : '<div class="text-xs text-slate-500 mt-2">עוד לא הוערך</div>'}</div>`;
        const log = (x.reviews || []).slice().reverse().map(v => `<div class="text-[11px] border-r-2 pr-2 mb-1.5" style="border-color:${S[v.rating].c}"><div class="flex justify-between text-slate-400"><span>${v.by === 'ai' ? '🤖 AI' + (v.model ? ' (' + h(v.model) + ')' : '') : '👑 ראש הממשלה'}</span><span>${h(v.at)}</span></div><div>${meter(v.rating, S[v.rating].c)} <b style="color:${S[v.rating].c}">${S[v.rating].l}</b></div><div class="text-slate-300">${G.nl(v.note)}</div></div>`).join('');
        return `<div class="rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 space-y-3"><h3 class="font-bold text-violet-300 text-sm">⚖️ הערכת הביטול: האם זו הייתה החלטה נכונה?</h3>
            <p class="text-[10px] text-slate-500">ביטול אינו בהכרח שלילי: לפעמים ויתור הוא החלטה חכמה. ההערכה היא בדיעבד, לאור מה שקרה מאז. אפשר להעריך שוב בהמשך (כל ההערכות נשמרות). ההערכה לא משנה את ציון הממשלה.</p>
            <div class="flex flex-wrap gap-2">${card('👑 ראש הממשלה', pm)}${card('🤖 AI', ai)}</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2"><label class="g-lab">דירוג ההחלטה<select id="rvR_${id2}" class="g-inp">${[5, 4, 3, 2, 1].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${n} - ${S[n].l}</option>`).join('')}</select></label>
                <label class="g-lab md:col-span-2">נימוק (לפחות 10 תווים): מה קרה מאז, ולמה ההחלטה נכונה או שגויה?<textarea id="rvN_${id2}" rows="2" maxlength="1500" class="g-inp"></textarea></label></div>
            <div class="flex flex-wrap gap-2"><button class="g-btn pri" onclick="GOV_REV.pm('${kind}','${id2}')">👑 שמור הערכת ראש הממשלה</button><button class="g-btn" onclick="GOV_REV.ai('${kind}','${id2}')">🤖 בקש הערכת AI (אנונימית, באישור)</button></div><div id="rvMsg_${id2}" class="text-[11px] text-slate-400"></div>
            ${log ? `<div>${log}</div>` : ''}</div>`;
    }
    function pm(kind, id) {
        const r = col(kind).review(id, { by: 'pm', rating: document.getElementById('rvR_' + id).value, note: document.getElementById('rvN_' + id).value });
        if (!r.ok) { alert(r.error); return; } rerender();
    }
    function parse(t) { try { return JSON.parse(String(t).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { const m = String(t).match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } }
    async function ai(kind, id) {
        const x = item(kind, id), msg = document.getElementById('rvMsg_' + id); if (!x) return;
        const pf = G.portfolios.get(x.pid), tasks = kind === 'issue' ? G.issues.allTasks(id) : G.tasks.forPromise(id), td = tasks.filter(t => t.done).length;
        const lines = kind === 'issue'
            ? [`סוג: סוגיה${x.kind === 'distraction' ? ' (הסחת דעת / פעולה פסולה)' : ''}`, `הסוגיה: ${x.title}`, `פירוט: ${x.detail || '(לא נכתב)'}`, `חומרה (1-3): ${x.severity}`, `טווח: ${G.HORIZON[x.horizon]}${x.target ? ' עד ' + x.target : ''}`, `נפתחה: ${x.created}`]
            : ['סוג: הבטחה', `ההבטחה: ${x.text}`, `למה חשובה: ${x.why || '(לא נכתב)'}`, `קריטריון: ${x.measure || '(לא נכתב)'}`, `עדיפות (1-3): ${x.priority}`, `חודש: ${x.month}`, `התקדמות בעת ההסרה: ${x.progress}%`];
        lines.push(`תיק: ${pf ? pf.name + ' (משימה: ' + (pf.mission || 'לא הוגדרה') + ')' : 'ללא'}`, `בוטלה ב: ${x.droppedAt || 'לא ידוע'}`, `נימוק הביטול: ${x.dropReason}`, `משימות קשורות: ${td} בוצעו מתוך ${tasks.length}`);
        (x.reviews || []).filter(v => v.by === 'pm').forEach(v => lines.push(`הערכת ראש הממשלה (${v.at}, ${v.rating}/5): ${v.note}`));
        const names = G.people.all().map(p => p.name).concat(G.treaties.all().map(t => t.party), [G.profile.get().name || '']).filter(Boolean);
        msg.textContent = 'ממתין לאישור…';
        const r = await window.GOVAI.ask({ title: 'הערכת ביטול', names, json: true, data: lines.join('\n'),
            task: 'אתה יועץ ביקורתי ולא חנפן. הפריט למעלה בוטל על ידי המשתמש. הערך האם ההחלטה לבטל הייתה נכונה ומועילה לאור כל הנתונים. זכור: ביטול אינו בהכרח שלילי, ולפעמים ויתור הוא החלטה חכמה; אבל נימוק חלש או הימנעות מקושי הם סימן אזהרה. אל תחנף ואל תמציא עובדות שאין בנתונים; אם חסר מידע, אמור זאת. החזר JSON בלבד במבנה {"rating":מספר 1-5 (1 שגויה ומזיקה, 3 ניטרלית או לא ברור, 5 נכונה ומועילה מאוד),"verdict":"משפט אחד","reasoning":"2-4 משפטים: למה","counter":"הטיעון החזק ביותר נגד הביטול","missing":"איזה מידע היה משנה את ההערכה"}.' });
        if (!r.ok) { msg.textContent = r.cancelled ? 'בוטל.' : '⚠️ ' + r.error; return; }
        const j = parse(r.text); if (!j || !(Number(j.rating) >= 1 && Number(j.rating) <= 5)) { msg.textContent = '⚠️ ה-AI לא החזיר הערכה תקינה. נסה שוב.'; return; }
        const note = [j.verdict, j.reasoning, j.counter ? 'הטיעון החזק נגד הביטול: ' + j.counter : '', j.missing ? 'מה חסר: ' + j.missing : ''].filter(Boolean).join('\n');
        const s = col(kind).review(id, { by: 'ai', rating: j.rating, note, model: r.model }); if (!s.ok) { msg.textContent = '⚠️ ' + s.error; return; } rerender();
    }
    window.GOV_REV = { html, pm, ai, meter };
})();
