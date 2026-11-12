/* ממשל אישי - ניווט משותף, עיצוב משותף ושער נעילה אופציונלי. דף חדש מוסיפים כאן פעם אחת. */
(function () {
    'use strict';
    const G = window.GOV;
    const PAGES = [
        { file: 'index.html', icon: '🏠', title: 'לוח בקרה', desc: 'היום, החודש והסוגיות שעל הפרק במקום אחד.' },
        { file: 'schedule.html', icon: '🗓️', title: 'לוח זמן', desc: 'יומן זמן ממשלתי, ניצול זמן ופגישות.', sections: [['sch-today', 'היום'], ['sch-pie', 'חלוקת זמן'], ['sch-events', 'פגישות']] },
        { file: 'tasks.html', icon: '☑️', title: 'משימות', desc: 'כל המשימות, משימות עצמאיות והיסטוריית מה שהושלם.', sections: [['tk-add', 'משימה חדשה'], ['tk-list', 'הרשימה']] },
        { file: 'wish.html', icon: '🎞️', title: 'רשימה צדדית', desc: 'רצונות לזמן הפנוי (סרטים, טיולים, מקומות...), מחוץ לסדר העדיפויות ולציון.', sections: [['w-add', 'הוספה'], ['w-list', 'הרשימות']] },
        { file: 'promises.html', icon: '📜', title: 'הבטחות', desc: 'הבטחות הממשלה לחודש, עדיפויות והתקדמות.', sections: [['promises-add', 'הבטחה חדשה'], ['promises-list', 'רשימת ההבטחות']] },
        { file: 'portfolios.html', icon: '🗂️', title: 'תיקי ממשלה', desc: 'תחומי החיים, השרים, הסוגיות והרעיונות.', sections: [['portfolios-grid', 'התיקים'], ['portfolio-detail', 'פירוט תיק']] },
        { file: 'issues.html', icon: '🔥', title: 'סוגיות', desc: 'סוגיות על הפרק, חומרה וקישור להבטחות ולמשימות.', sections: [['iss-list', 'הסוגיות'], ['iss-detail', 'פירוט']] },
        { file: 'operations.html', icon: '🚀', title: 'מבצעים ורפורמות', desc: 'יחידות גדולות עם שלבים, שמאגדות סוגיות והבטחות. משקל כפול בציון.', sections: [['op-add', 'מבצע חדש'], ['op-list', 'המבצעים'], ['op-detail', 'פירוט']] },
        { file: 'player.html', icon: '🪪', title: 'כרטיס אישי וקו"ח', desc: 'דירוג יכולות לכל תחום, אישיות וקורות חיים מתפתחים בציר זמן.', sections: [['pl-hero', 'הכרטיס'], ['pl-domains', 'תחומים'], ['pl-traits', 'אישיות'], ['pl-cv', 'קורות חיים']] },
        { file: 'career.html', icon: '🧭', title: 'סימולטור קריירה', desc: 'מטרה, דרישות, פער מול הכרטיס האישי, מסלול ותאריך משוער.', sections: [['list', 'מטרות'], ['detail', 'סימולציה']] },
        { file: 'lang.html', icon: '🗣️', title: 'לימוד שפות', desc: 'רמת CEFR לכל מיומנות, יעד, יומן לימוד, רצף, קצב שבועי ותחזית סיום.', sections: [['list', 'שפות'], ['detail', 'פירוט']] },
        { file: 'quiz.html', icon: '📝', title: 'שאלונים', desc: 'שאלון אישיות קצר, ושאלוני רפלקציה שה-AI מייצר ומנתח.', sections: [['list', 'שאלונים'], ['detail', 'פירוט']] },
        { file: 'elements.html', icon: '🔥', title: 'ארבעת היסודות', desc: 'שאלון של 200 היגדים: אחוזי אש, מים, אדמה ואוויר, והיסוד המרכזי.', sections: [['app', 'השאלון והתוצאה']] },
        { file: 'cabinet.html', icon: '🏛️', title: 'קבינט', desc: 'החלטות מרכזיות, אפשרויות, השפעה על הבטחות ואמנות, ובדיקת תוצאה בדיעבד.', sections: [['cabinet-new', 'נושא חדש'], ['cabinet-list', 'כל ההחלטות'], ['cabinet-detail', 'דיון'], ['cabinet-insight', 'איכות החלטות']] },
        { file: 'treaties.html', icon: '🤝', title: 'יחסי חוץ', desc: 'אמנות והסכמים עם אנשים, קבוצות וגופים, ומחיר הפרה.', sections: [['treaties-overview', 'תמונת מצב'], ['treaties-form', 'אמנה חדשה'], ['treaties-list', 'לפי צד']] },
        { file: 'people.html', icon: '👥', title: 'יחסים', desc: 'אנשים, יומן יחסים, אינדקס קרבה ואמנות לכל אדם.', sections: [['people-overview', 'תמונת מצב'], ['people-list', 'אנשים'], ['people-detail', 'פירוט']] },
        { file: 'ministers.html', icon: '🎖️', title: 'שרים והיסטוריה', desc: 'שרים, דירוג, דפי שר והיסטוריית ממשלות.', sections: [['min-list', 'השרים'], ['min-history', 'היסטוריית ממשלות'], ['min-diff', 'קושי משרדים']] },
        { file: 'review.html', icon: '📊', title: 'ציון חודשי', desc: 'ציון הממשלה, הערכה עצמית והיסטוריית ממשלות.', sections: [['review-current', 'החודש'], ['review-progress', 'במה התקדמתי'], ['review-history', 'היסטוריית ממשלות']] }
    ];
    window.GOV_SITE = { PAGES };
    const cur = location.pathname.split('/').pop() || 'index.html';
    const page = PAGES.find(p => p.file === cur);

    // תפריט מקובץ: כפתורים שנפתחים (קבוצה = כפתור). דף חדש מוסיפים ל-PAGES ולקבוצה המתאימה כאן.
    const GROUPS = [
        { id: 'home', files: ['index.html'] },
        { id: 'today', icon: '🗓️', title: 'היום והזמן', files: ['schedule.html', 'tasks.html', 'wish.html'] },
        { id: 'goals', icon: '🎯', title: 'יעדים', files: ['promises.html', 'issues.html', 'operations.html', 'portfolios.html'] },
        { id: 'gov', icon: '🏛️', title: 'ממשל', files: ['cabinet.html', 'treaties.html', 'people.html', 'ministers.html'] },
        { id: 'me', icon: '🪪', title: 'אני', files: ['player.html', 'career.html', 'lang.html', 'quiz.html', 'elements.html'] },
        { id: 'score', files: ['review.html'] }
    ];
    const pg = f => PAGES.find(x => x.file === f);
    const itemHtml = p => `<a href="${p.file}" class="gn-item${p.file === cur ? ' on' : ''}"><span class="gn-ic">${p.icon}</span><span><b>${p.title}</b><small>${p.desc}</small></span></a>`;
    const links = GROUPS.map(g => {
        const ps = g.files.map(pg).filter(Boolean); if (!ps.length) return '';
        if (ps.length === 1) { const p = ps[0]; return `<a href="${p.file}" class="gn-btn${p.file === cur ? ' on' : ''}">${p.icon} ${g.id === 'score' ? 'ציון וסיכום' : p.title}</a>`; }
        const here = ps.some(p => p.file === cur);
        return `<div class="gn-grp"><button type="button" class="gn-btn${here ? ' on' : ''}" aria-haspopup="true" aria-expanded="false" data-gn="${g.id}">${g.icon} ${g.title} <span class="gn-car">▾</span></button><div class="gn-panel" role="menu" id="gn-${g.id}" hidden>${ps.map(itemHtml).join('')}</div></div>`;
    }).join('');
    const lockBtn = G.lock.isSet() ? `<button type="button" onclick="GOV.lock.lockNow()" class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-300 transition" title="נעל עכשיו">🔒</button>` : '';
    let html = `<nav class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-xl">
        <div class="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
            <a href="index.html" class="flex items-center gap-3"><span class="text-3xl">🏛️</span><span><span class="font-black text-xl tracking-wider text-amber-400 block leading-none">ממשל אישי</span>
            <span class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">${page ? page.icon + ' ' + page.title : ''}</span></span></a>
            <div class="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold">${links}${lockBtn}</div>
        </div></nav>`;
    if (page && page.sections) html += `<div class="no-print max-w-6xl mx-auto px-4 pt-4 flex flex-wrap gap-2 text-xs font-semibold">${page.sections.map(s => `<a href="#${s[0]}" class="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-amber-600 text-slate-200 border border-slate-700 transition">${s[1]}</a>`).join('')}</div>`;

    const st = document.createElement('style');
    st.textContent = `section[id]{scroll-margin-top:5rem}
.g-card{background:#1e293b80;border:1px solid #334155;border-radius:18px;padding:16px}
.g-lab{display:block;color:#94a3b8;font-size:12px}
.g-inp{width:100%;margin-top:3px;background:#020617;border:1px solid #475569;border-radius:9px;padding:7px 9px;color:#fff;font-size:13px;font-family:inherit}
.g-inp:focus{outline:none;border-color:#fbbf24}
.g-btn{background:#1e293b;border:1px solid #475569;border-radius:9px;padding:6px 12px;color:#e2e8f0;cursor:pointer;font-size:12px;font-weight:700}
.g-btn:hover{border-color:#fbbf24}.g-btn:disabled{opacity:.5;cursor:not-allowed}
.g-btn.pri{background:#b45309;border-color:#fbbf24;color:#fff}.g-btn.ok{background:#047857;border-color:#34d399;color:#fff}.g-btn.red{background:#7f1d1d;border-color:#f87171;color:#fff}
.g-bar{height:8px;border-radius:999px;background:#0f172a;overflow:hidden}.g-bar>i{display:block;height:100%;border-radius:999px}
.g-chip{display:inline-block;font-size:10px;font-weight:800;padding:1px 9px;border-radius:999px;border:1px solid}
.gn-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:10px;background:#1e293b;color:#e2e8f0;border:1px solid transparent;font-weight:700;cursor:pointer;font-family:inherit;font-size:inherit;transition:.15s}
.gn-btn:hover,.gn-btn[aria-expanded=true]{background:#334155;border-color:#fbbf24}.gn-btn.on{background:#b45309;color:#fff}.gn-car{font-size:10px;opacity:.8;transition:transform .15s}.gn-btn[aria-expanded=true] .gn-car{transform:rotate(180deg)}
.gn-grp{position:relative}.gn-panel{position:absolute;top:calc(100% + 8px);right:0;z-index:60;width:300px;background:#0f172a;border:1px solid #475569;border-radius:14px;padding:6px;box-shadow:0 18px 40px #000a}
.gn-panel[hidden]{display:none}.gn-item{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;color:#e2e8f0;text-decoration:none}.gn-item:hover{background:#1e293b}.gn-item.on{background:#b4530933}
.gn-item b{display:block;font-size:13px}.gn-item small{display:block;color:#94a3b8;font-size:11px;font-weight:400;line-height:1.35;margin-top:1px}.gn-ic{font-size:18px;line-height:1.2}
@media (max-width:640px){.gn-grp{position:static}.gn-panel{position:fixed;right:12px;left:12px;top:64px;width:auto;max-height:70vh;overflow:auto}}
@media print{nav,.no-print,button{display:none!important}body{background:#fff!important;color:#000!important}}`;
    document.head.appendChild(st);
    document.currentScript.insertAdjacentHTML('beforebegin', html);
    (function navMenus() {   // פתיחה/סגירה: לחיצה על כפתור, לחיצה בחוץ, Esc. כפתור אחד פתוח בכל רגע
        const closeAll = (except) => document.querySelectorAll('.gn-btn[data-gn]').forEach(b => { if (b !== except) { b.setAttribute('aria-expanded', 'false'); const p = document.getElementById('gn-' + b.dataset.gn); if (p) p.hidden = true; } });
        document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('.gn-btn[data-gn]'); if (b) { const open = b.getAttribute('aria-expanded') !== 'true'; closeAll(b); b.setAttribute('aria-expanded', String(open)); document.getElementById('gn-' + b.dataset.gn).hidden = !open; return; } if (!(ev.target.closest && ev.target.closest('.gn-panel'))) closeAll(); });
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeAll(); });
    })();

    // אם נטען gov-core.js ישן (מטמון, או קובץ שלא הועלה): מציגים הודעה ברורה במקום דף ריק
    if (!window.GOV || window.GOV.VERSION !== '0.14.2') { window.addEventListener('DOMContentLoaded', () => { document.body.insertAdjacentHTML('afterbegin', '<div style="position:sticky;top:0;z-index:2000;background:#7f1d1d;color:#fff;padding:10px 14px;font:14px Rubik,sans-serif;direction:rtl;text-align:right">⚠️ גרסאות הקבצים לא תואמות (נטען gov-core.js ' + ((window.GOV && window.GOV.VERSION) || 'ישן') + ', נדרש 0.14.2). פתרון: ודא שהעלית את כל הקבצים מה-zip (בעיקר gov-core.js) ל-GitHub, המתן דקה-שתיים, ורענן בלי מטמון (באנדרואיד: הגדרות הדפדפן ← נקה נתוני אתר מטמון בלבד, לא "נתוני אתר" כי זה ימחק את הנתונים!).</div>'); }); }
    document.write('<script src="gov-vault.js?v=0.14.2"><\/script>');   // כספת המפתחות (נטענת לפני הסנכרון וה-AI)
    document.write('<script src="gov-sync.js?v=0.14.2"><\/script>');
    document.write('<script src="gov-ai.js?v=0.14.2"><\/script>');
    document.write('<script src="gov-review.js?v=0.14.2"><\/script>');    // הערכת ביטול (סוגיות והבטחות)    // שכבת AI משותפת (מפתח Gemini של המשתמש)    // סנכרון לענן: נטען סינכרונית בכל דף, כדי שכל שמירה תופעל אוטומטית


    // מכשיר חדש: קישור חיבור (#setup=...) או gov-config.enc.json. מזינים סיסמה: מפענחים, קובעים אותה כסיסמת כניסה, שומרים את הכתובת והמפתח בכספת ומושכים נתונים.
    (async function newDeviceSetup() {
        try {
            if (document.readyState === 'loading') await new Promise(r => window.addEventListener('DOMContentLoaded', r));
            const V = window.GOV_VAULT, S = window.GOV_SYNC;
            if (!V || !S || !V.supported() || G.lock.isSet() || V.exists()) return;
            let obj = S.parseLink(location.hash);
            if (!obj) { try { const r = await fetch('gov-config.enc.json', { cache: 'no-store' }); if (r.ok) obj = await r.json(); } catch (e) {} }
            if (!obj || !obj.ct) return;
            document.body.insertAdjacentHTML('afterbegin', `<div id="govSetup" style="position:fixed;inset:0;z-index:1001;background:#020617;display:flex;align-items:center;justify-content:center;padding:16px"><form id="govSetupForm" style="width:100%;max-width:340px;text-align:center"><div style="font-size:48px">🏛️</div><div style="font-weight:900;font-size:20px;color:#fbbf24;margin-bottom:6px">חיבור מכשיר חדש</div><div style="font-size:12px;color:#94a3b8;margin-bottom:12px">הזן את סיסמת הממשלה. המערכת תתחבר לענן, תמשוך את הנתונים ותשמור את המפתחות מוצפנים במכשיר הזה.</div><input id="govSetupPw" type="password" autocomplete="current-password" placeholder="סיסמה" class="g-inp" style="text-align:center;font-size:16px"><button class="g-btn pri" style="width:100%;margin-top:10px;padding:9px">התחבר</button><button type="button" id="govSetupSkip" class="g-btn" style="width:100%;margin-top:6px">דלג (התחל בלי ענן)</button><div id="govSetupMsg" style="color:#f87171;font-size:12px;margin-top:8px;min-height:1rem"></div></form></div>`);
            const msg = t => { document.getElementById('govSetupMsg').textContent = t; };
            document.getElementById('govSetupSkip').onclick = () => { document.getElementById('govSetup').remove(); history.replaceState(null, '', location.pathname); };
            document.getElementById('govSetupForm').addEventListener('submit', async ev => {
                ev.preventDefault(); const pw = document.getElementById('govSetupPw').value; msg('מתחבר…');
                const d = await S.importConfig(pw, obj); if (!d.ok) { msg(d.error); return; }
                if (!(await G.lock.set(pw)) || !(await V.unlock(pw))) { msg('לא ניתן היה להגדיר סיסמה בדפדפן הזה.'); return; }
                const sv = await S.setConfig({ url: d.url, token: d.token, auto: true }); if (!sv.ok) { msg(sv.error); return; }
                const pl = await S.pull(); if (pl.state === 'error') msg('החיבור נשמר, אך המשיכה נכשלה: ' + (pl.msg || ''));
                history.replaceState(null, '', location.pathname); location.reload();
            });
        } catch (e) {}
    })();

    // סשן "פתוח" בלי כספת פתוחה (למשל אחרי נעילה אוטומטית): חוזרים למסך הסיסמה
    window.addEventListener('gov:vault', () => { const V = window.GOV_VAULT; if (V && V.supported() && G.lock.isSet() && G.lock.unlocked() && !V.isOpen() && !document.getElementById('govSetup')) { try { sessionStorage.removeItem('gov_unlocked'); } catch (e) {} location.reload(); } });

    if (!G.lock.unlocked()) {
        document.body.insertAdjacentHTML('afterbegin', `<div id="govGate" style="position:fixed;inset:0;z-index:1000;background:#020617;display:flex;align-items:center;justify-content:center;padding:16px">
            <form id="govGateForm" style="width:100%;max-width:320px;text-align:center"><div style="font-size:48px">🏛️</div><div style="font-weight:900;font-size:22px;color:#fbbf24;margin-bottom:14px">ממשל אישי</div>
            <input id="govPin" type="password" autocomplete="current-password" placeholder="סיסמה" class="g-inp" style="text-align:center;font-size:16px">
            <button class="g-btn pri" style="width:100%;margin-top:10px;padding:9px">כניסה</button><div id="govGateMsg" style="color:#f87171;font-size:12px;margin-top:8px;min-height:1rem"></div></form></div>`);
        const f = document.getElementById('govGateForm'); document.getElementById('govPin').focus();
        f.addEventListener('submit', async ev => {
            ev.preventDefault();
            const pw = document.getElementById('govPin').value;
            if (await G.lock.check(pw)) { if (window.GOV_VAULT) { await GOV_VAULT.unlock(pw); await GOV_VAULT.migrate(); } document.getElementById('govGate').remove(); }
            else { document.getElementById('govGateMsg').textContent = 'סיסמה שגויה.'; document.getElementById('govPin').value = ''; }
        });
    }
})();

/* GOV_REC: טופס תדירות משותף (ימים בשבוע / כל N ימים-שבועות / כל N חודשים) לאמנות. form(px, {rec,days}, optional) ו-read(px) -> {error} | {rec, days} */
window.GOV_REC = (function () {
    const G = window.GOV, h = G.esc, $ = id => document.getElementById(id);
    const kinds = opt => (opt ? '<option value="none">ללא</option>' : '') + Object.entries(G.routines.REC_KINDS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
    function form(px, v, opt) {
        const rec = v.rec || { kind: 'weekdays', n: 2, unit: 'week', dom: 1, anchor: G.localDate() }, days = v.days || [], k = rec.kind === 'weekdays' && opt && !days.length ? 'none' : rec.kind, anc = rec.anchor || G.localDate();
        return `<div class="space-y-1.5"><label class="text-[10px] text-slate-400">תדירות${opt ? ' (אופציונלי)' : ''}<select id="${px}Kind" class="g-inp" style="margin:0" onchange="GOV_REC.kind('${px}')">${kinds(opt).replace(`value="${k}"`, `value="${k}" selected`)}</select></label>
            <div id="${px}W" style="display:${k === 'weekdays' ? '' : 'none'}" class="flex flex-wrap gap-1">${G.DOW.map((d, i) => `<label class="text-xs px-2 py-1 rounded-lg border border-slate-600 cursor-pointer"><input type="checkbox" class="${px}Day accent-amber-400" value="${i}" ${days.includes(i) ? 'checked' : ''}> ${d}׳</label>`).join('')}</div>
            <div id="${px}I" style="display:${k === 'interval' ? '' : 'none'}" class="grid grid-cols-3 gap-2 items-end"><label class="text-[10px] text-slate-400">כל<input id="${px}N" type="number" min="1" max="90" class="g-inp" style="margin:0" value="${rec.kind === 'interval' ? rec.n : 2}"></label>
                <label class="text-[10px] text-slate-400">יחידה<select id="${px}U" class="g-inp" style="margin:0"><option value="day"${rec.kind === 'interval' && rec.unit === 'day' ? ' selected' : ''}>ימים</option><option value="week"${rec.kind !== 'interval' || rec.unit === 'week' ? ' selected' : ''}>שבועות</option></select></label>
                <label class="text-[10px] text-slate-400">החל מתאריך<input id="${px}A" type="date" class="g-inp" style="margin:0" value="${h(anc)}"></label></div>
            <div id="${px}M" style="display:${k === 'monthly' ? '' : 'none'}" class="grid grid-cols-3 gap-2 items-end"><label class="text-[10px] text-slate-400">כל (חודשים)<input id="${px}Mn" type="number" min="1" max="12" class="g-inp" style="margin:0" value="${rec.kind === 'monthly' ? rec.n : 1}"></label>
                <label class="text-[10px] text-slate-400">ביום בחודש<input id="${px}D" type="number" min="1" max="31" class="g-inp" style="margin:0" value="${rec.dom || 1}"></label>
                <label class="text-[10px] text-slate-400">החל מחודש<input id="${px}Ma" type="month" class="g-inp" style="margin:0" value="${h(anc.slice(0, 7))}"></label></div></div>`;
    }
    function kind(px) { const k = $(px + 'Kind').value; $(px + 'W').style.display = k === 'weekdays' ? '' : 'none'; $(px + 'I').style.display = k === 'interval' ? '' : 'none'; $(px + 'M').style.display = k === 'monthly' ? '' : 'none'; }
    function read(px) {
        const k = $(px + 'Kind').value; if (k === 'none') return { rec: { kind: 'weekdays' }, days: [] };
        if (k === 'weekdays') return { rec: { kind: 'weekdays' }, days: [...document.querySelectorAll('.' + px + 'Day:checked')].map(c => Number(c.value)) };
        if (k === 'interval') { const n = Number($(px + 'N').value); if (!(n >= 1 && n <= 90) || !$(px + 'A').value) return { error: 'הזן מספר בין 1 ל-90 ותאריך התחלה.' }; return { rec: { kind: k, n, unit: $(px + 'U').value, anchor: $(px + 'A').value }, days: [] }; }
        const n = Number($(px + 'Mn').value), d = Number($(px + 'D').value); if (!(n >= 1 && n <= 12) || !(d >= 1 && d <= 31) || !$(px + 'Ma').value) return { error: 'הזן כל כמה חודשים, יום בחודש (1-31) וחודש התחלה.' };
        return { rec: { kind: k, n, dom: d, anchor: $(px + 'Ma').value + '-01' }, days: [] };
    }
    return { form, kind, read };
})();
